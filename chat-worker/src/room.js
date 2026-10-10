/**
 * ChatRoom —— 一个房间一个实例
 * ---------------------------------------------------------------------------
 * 与前一轮的区别：**不再采信客户端自报的 uid**。
 * join 时必须出示服务端签发的凭证；没有或校验不过，就走人机校验后**由服务端
 * 新签一张匿名凭证**发回去（welcome）。这样 uid 天然不可伪造。
 *
 * 仍保留的权威项：服务端时间戳、服务端限流、昵称以服务端记录为准。
 */

import { verifyToken, issueAnon } from './identity.js';
import { verifyTurnstile, turnstileEnabled } from './turnstile.js';

const MAX_HISTORY = 300;
const MAX_TEXT = 1000;
const MAX_NAME = 16;
const MAX_REF_TEXT = 120;   // 引用快照里保留的原文摘要长度
const RATE_WINDOW = 10000;
const RATE_MAX = 20;
const RECALL_WINDOW = 3 * 60 * 1000;   // 普通成员只能撤回自己 3 分钟内的消息
const HIST_PAGE = 100;                 // 「加载更早」每页条数
// 管理员（「凹凸曼」）名单：凭证里的 role 或 GitHub 登录名任一命中即为管理员
const ADMIN_LOGINS = ['zwany1'];

export class ChatRoom {
    constructor(ctx, env) {
        this.ctx = ctx;
        this.env = env;
        this.sql = ctx.storage.sql;

        ctx.blockConcurrencyWhile(async () => {
            this.sql.exec(`CREATE TABLE IF NOT EXISTS messages (
                id   TEXT PRIMARY KEY,
                uid  TEXT NOT NULL,
                name TEXT NOT NULL,
                kind TEXT NOT NULL DEFAULT 'anon',
                text TEXT NOT NULL,
                ts   INTEGER NOT NULL
            )`);
            this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages (ts)`);
            // 轻量迁移：早期的表没有这些列。**每条 ALTER 必须独立 try**——
            // 放在同一个 try 里时，前面任何一条"已存在"抛错，后面的就永远不会执行。
            const MIGRATIONS = [
                `ALTER TABLE messages ADD COLUMN avatar TEXT NOT NULL DEFAULT ''`,
                `ALTER TABLE messages ADD COLUMN ref TEXT NOT NULL DEFAULT ''`,
                `ALTER TABLE messages ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0`,
                `ALTER TABLE messages ADD COLUMN role TEXT NOT NULL DEFAULT ''`
            ];
            for (const stmt of MIGRATIONS) {
                try { this.sql.exec(stmt); } catch (e) { /* 已有该列 */ }
            }
            // 限流（uid 级持久化，断线重连不清零）/ 撤回与封禁审计
            this.sql.exec(`CREATE TABLE IF NOT EXISTS rate (
                uid    TEXT NOT NULL,
                bucket INTEGER NOT NULL,
                count  INTEGER NOT NULL,
                PRIMARY KEY (uid, bucket)
            )`);
            this.sql.exec(`CREATE TABLE IF NOT EXISTS audit (
                id     INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                actor  TEXT NOT NULL,
                target TEXT NOT NULL,
                ts     INTEGER NOT NULL
            )`);
            // 表情回应：谁对哪条消息点了哪个 emoji。用"存在即选中"的语义，
            // 同一个人对同一条消息同一个 emoji 只会有一行，重复点击就是取消。
            this.sql.exec(`CREATE TABLE IF NOT EXISTS reactions (
                msg_id TEXT NOT NULL,
                uid    TEXT NOT NULL,
                emoji  TEXT NOT NULL,
                ts     INTEGER NOT NULL,
                PRIMARY KEY (msg_id, uid, emoji)
            )`);
        });
    }

    async fetch(request) {
        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];

        // 关键：休眠 API。连接由 DO 托管，空闲时换出内存、不计时长费。
        this.ctx.acceptWebSocket(server);

        // 先把来源 IP 放进 attachment —— 休眠会清空实例内存，
        // 所以任何"跨消息保留"的状态都必须能序列化。
        try {
            server.serializeAttachment({ ip: request.headers.get('CF-Connecting-IP') || '' });
        } catch (e) { /* 忽略 */ }

        return new Response(null, { status: 101, webSocket: client });
    }

    /* ------------------------------------------------------------ 事件入口 */

    async webSocketMessage(ws, raw) {
        let p;
        try {
            p = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
        } catch (e) { return; }
        if (!p || typeof p.t !== 'string') { return; }

        if (p.t === 'join') { await this._join(ws, p); return; }
        if (p.t === 'msg') { await this._message(ws, p); return; }
        if (p.t === 'del') { this._delete(ws, p); return; }
        if (p.t === 'hist') { this._histBefore(ws, p); return; }
        if (p.t === 'ban') { await this._banRequest(ws, p); return; }
        if (p.t === 'unban') { await this._unbanRequest(ws, p); return; }
        if (p.t === 'typing') { this._typing(ws); return; }
        if (p.t === 'react') { this._react(ws, p); }
    }

    async webSocketClose(ws) { this._presence(); }
    async webSocketError(ws) { this._presence(); }

    /* ------------------------------------------------------------ 身份处理 */

    async _join(ws, p) {
        const verified = await verifyToken(p.token, this.env.IDENTITY_SECRET);
        // 登录制（默认）：只有 GitHub 身份能进。
        // 设 REQUIRE_LOGIN=false 可退回"匿名 + 人机校验"模式。
        const requireLogin = this.env.REQUIRE_LOGIN !== 'false';

        if (verified && (!requireLogin || verified.kind === 'github')) {
            this._accept(ws, verified, p.name);
            return;
        }

        if (requireLogin) {
            // 不签发匿名身份了：没有 GitHub 身份的直接打回登录
            this._send(ws, {
                t: 'need-login',
                msg: verified ? '身份已失效，请重新用 GitHub 登录' : '请先用 GitHub 登录后再进入'
            });
            return;
        }

        // —— 以下为匿名模式（REQUIRE_LOGIN=false）——
        const vs = await verifyTurnstile(p.cf, this.env.TURNSTILE_SECRET, this._meta(ws).ip);

        if (!vs.ok) {
            if (vs.reason === 'missing-token' && turnstileEnabled(this.env)) {
                // 顺带把 sitekey 带下去，客户端就不需要额外配置
                this._send(ws, { t: 'cf', sitekey: this.env.TURNSTILE_SITEKEY || '' });
            } else {
                this._send(ws, { t: 'error', msg: '人机校验未通过，请刷新页面重试' });
            }
            return;
        }

        let anon;
        try {
            anon = await issueAnon(this.env.IDENTITY_SECRET, p.name);
        } catch (e) {
            this._send(ws, { t: 'error', msg: '服务端身份签发失败（IDENTITY_SECRET 未配置？）' });
            return;
        }
        this._send(ws, {
            t: 'welcome', token: anon.token,
            uid: anon.payload.uid, kind: 'anon', name: anon.payload.name
        });
        this._accept(ws, anon.payload, p.name);
    }

    async _accept(ws, payload, wantedName) {
        // 封禁检查：被封禁的用户直接打回，不进入房间（结果缓存 60s，避免每次重连都跨 DO 查询）
        const ban = await this._checkBan(payload.uid);
        if (ban.banned) {
            try { ws.serializeAttachment({ ip: this._meta(ws).ip || '', uid: payload.uid, banned: ban.until }); } catch (e) { /* 忽略 */ }
            this._send(ws, { t: 'banned', msg: '你已被封禁' + (ban.reason ? '（' + ban.reason + '）' : ''), until: ban.until });
            return;
        }

        // 登录身份：昵称一律以凭证为准，客户端自报的名字不采信（否则可顶着别人的名字说话）。
        // 匿名模式（REQUIRE_LOGIN=false）才允许自取昵称。
        const isGithub = payload.kind === 'github';
        const fallback = payload.name || '访客';
        const meta = {
            ip: this._meta(ws).ip || '',
            uid: payload.uid,                          // ← 只认凭证里的 uid
            kind: payload.kind || 'anon',
            // 双重判定：凭证 role 或 GitHub 登录名（老凭证没 login 就靠 role 字段）
            role: (payload.role === 'admin' || ADMIN_LOGINS.indexOf(String(payload.login || '')) >= 0)
                ? 'admin' : '',
            name: String(isGithub ? fallback : (wantedName || fallback)).slice(0, MAX_NAME),
            avatar: payload.avatar || '',
            sent: []
        };
        try { ws.serializeAttachment(meta); } catch (e) { /* 忽略 */ }

        const rows = [...this.sql.exec(
            'SELECT id, uid, name, kind, role, avatar, ref, deleted, text, ts FROM messages ORDER BY ts DESC LIMIT ?', MAX_HISTORY
        )];
        rows.reverse();

        // 一次性把最近这段消息的回应全取回来，避免逐条查
        const reacts = this._reactionsFor();
        for (const r of rows) {
            r.reactions = reacts[r.id] || [];
            if (r.ref) { try { r.ref = JSON.parse(r.ref); } catch (e) { r.ref = null; } }
        }

        this._send(ws, { t: 'history', list: rows, now: Date.now(), me: { uid: meta.uid, name: meta.name, kind: meta.kind, role: meta.role, avatar: meta.avatar } });

        // 管理员：下发当前封禁名单（成员列表操作菜单的状态判断用）
        if (meta.role === 'admin') {
            this._sendBanList(ws);
        }

        this._presence();
    }

    /** 取最近 MAX_HISTORY 条消息的回应，聚合成 [{emoji, count, users}] */
    _reactionsFor() {
        const ids = [...this.sql.exec('SELECT id FROM messages ORDER BY ts DESC LIMIT ?', MAX_HISTORY)]
            .map(function (r) { return r.id; });
        return this._reactionsForIds(ids);
    }

    /** 按指定消息 id 集合聚合回应（分页加载更早的历史时用） */
    _reactionsForIds(ids) {
        const out = {};
        if (!ids.length) { return out; }
        const placeholders = ids.map(function () { return '?'; }).join(',');
        const rows = [...this.sql.exec(
            `SELECT msg_id, emoji, uid FROM reactions WHERE msg_id IN (${placeholders})`, ...ids
        )];
        for (const row of rows) {
            const list = out[row.msg_id] || (out[row.msg_id] = []);
            let bucket = null;
            for (const e of list) { if (e.emoji === row.emoji) { bucket = e; break; } }
            if (!bucket) { bucket = { emoji: row.emoji, count: 0, users: [] }; list.push(bucket); }
            bucket.count++;
            // users 上限：客户端只需判断"有没有我"，以及做展示，不必无限增长
            if (bucket.users.length < 50) { bucket.users.push(row.uid); }
        }
        return out;
    }

    /* ---------------------------------------------------------------- 内部 */

    _meta(ws) {
        try { return ws.deserializeAttachment() || {}; } catch (e) { return {}; }
    }

    _send(ws, obj) {
        try { ws.send(JSON.stringify(obj)); } catch (e) { /* 连接已断 */ }
    }

    async _message(ws, p) {
        const meta = this._meta(ws);
        if (!meta.uid) { return; }

        // 已被封禁的连接不应再发出任何消息（join 时与被踢时都会设置 meta.banned）
        if (meta.banned && meta.banned > Date.now()) {
            this._send(ws, { t: 'error', msg: '你已被封禁，无法发言' });
            return;
        }

        // **实时封禁校验**：封禁可能发生在其他房间（那里的连接踢不到），
        // 也可能在本连接 join 之后——所以每条消息都实时查一次全局封禁状态，
        // 命中立即拒绝并踢出，确保「被封禁 = 彻底不能发言」。
        // （每次消息一次跨 DO 查询，同位置通信 <1ms，配合限流成本可控；
        //   查询失败按未封禁处理，可用性优先。）
        let liveBan = { banned: false };
        try {
            const acct = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('accounts-v1'));
            const res = await acct.fetch('https://accounts/checkban?uid=' + encodeURIComponent(meta.uid));
            if (res.ok) {
                const d = JSON.parse(await res.text());
                liveBan = d.banned ? { banned: true, until: d.until || 0, reason: d.reason || '' } : { banned: false };
            }
        } catch (e) { /* 查询失败不阻断发言 */ }
        if (liveBan.banned) {
            try { ws.serializeAttachment({ ...meta, banned: liveBan.until }); } catch (e) { /* 忽略 */ }
            this._send(ws, { t: 'banned', msg: '你已被封禁，无法发言' + (liveBan.reason ? '（' + liveBan.reason + '）' : ''), until: liveBan.until });
            try { ws.close(1008, 'banned'); } catch (e) { /* 忽略 */ }
            return;
        }

        const text = String(p.text || '').slice(0, MAX_TEXT).replace(/\s+$/, '');
        if (!text) { return; }

        // 管理命令：/ban 昵称 [小时]（仅管理员），不作为普通消息发送
        if (meta.role === 'admin' && text.startsWith('/ban ')) {
            await this._handleBanCommand(ws, meta, text);
            return;
        }
        // 管理命令：/unban 昵称（仅管理员），解封（按名字从账号库反查 uid）
        if (meta.role === 'admin' && text.startsWith('/unban ')) {
            await this._handleUnbanCommand(ws, meta, text);
            return;
        }

        // 服务端限流：客户端限流可被绕过，这里不行。
        // 计数按 **uid 持久化**（SQLite 分桶），断线重连也不会清零。
        const now = Date.now();
        const bucket = Math.floor(now / RATE_WINDOW);
        const rateRow = [...this.sql.exec(
            'SELECT count FROM rate WHERE uid = ? AND bucket = ?', meta.uid, bucket
        )][0];
        if ((rateRow ? rateRow.count : 0) >= RATE_MAX) {
            this._send(ws, { t: 'error', msg: '发送太快了，请稍后再试' });
            return;
        }
        this.sql.exec(
            'INSERT OR REPLACE INTO rate (uid, bucket, count) VALUES (?, ?, ?)',
            meta.uid, bucket, (rateRow ? rateRow.count : 0) + 1
        );
        // 顺手清掉 2 个窗口之前的旧桶，表不会无限膨胀
        if (!rateRow) {
            this.sql.exec('DELETE FROM rate WHERE bucket < ?', bucket - 2);
        }
        try { ws.serializeAttachment(meta); } catch (e) { /* 忽略 */ }

        // 引用快照：客户端只传被引消息 id，内容一律以服务端库里的为准（防伪造）
        let refOut = null;
        const refId = String((p.ref && p.ref.id) || '').slice(0, 60);
        if (refId) {
            const src = [...this.sql.exec(
                'SELECT id, name, text, deleted FROM messages WHERE id = ?', refId
            )][0];
            if (src && !src.deleted) {
                refOut = { id: src.id, name: src.name, text: String(src.text).slice(0, MAX_REF_TEXT) };
            }
        }

        // @提及：按本房间**在线成员**的名字匹配，命中谁就把谁的 uid 放进 mentions
        const nameToUid = new Map();
        for (const s of this.ctx.getWebSockets()) {
            if (s.readyState !== 1) { continue; }
            const mm = this._meta(s);
            if (mm.uid) { nameToUid.set(mm.name, mm.uid); }
        }
        const mentions = [];
        const seenMention = {};
        // 兼容半角 @ 与全角 ＠（中文输入法）
        for (const match of text.matchAll(/[@＠]([^\s@＠]{1,16})/g)) {
            const hit = nameToUid.get(match[1]);
            if (hit && !seenMention[hit]) { seenMention[hit] = 1; mentions.push(hit); }
        }
        // @所有人（仅管理员）：提醒本房间全部在线成员（不含自己）
        if (meta.role === 'admin' && (text.indexOf('@所有人') >= 0 || text.indexOf('＠所有人') >= 0)) {
            mentions.length = 0;
            for (const s of this.ctx.getWebSockets()) {
                if (s.readyState !== 1) { continue; }
                const mm = this._meta(s);
                if (mm.uid && mm.uid !== meta.uid && !seenMention[mm.uid]) {
                    seenMention[mm.uid] = 1;
                    mentions.push(mm.uid);
                }
            }
        }

        const msg = {
            id: String(p.id || '').slice(0, 60) || ('s_' + now.toString(36) + Math.random().toString(36).slice(2, 6)),
            uid: meta.uid,
            name: meta.name,          // 昵称以服务端记录为准
            kind: meta.kind || 'anon',
            role: meta.role || '',    // 管理员标识，前端画「凹凸曼」徽章
            avatar: meta.avatar || '',// 头像随消息一起广播/入库，渲染端不必再查
            ref: refOut,
            mentions: mentions,
            text: text,
            ts: now                   // 服务端时间戳
        };

        this.sql.exec(
            'INSERT OR REPLACE INTO messages (id, uid, name, kind, role, avatar, ref, text, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            msg.id, msg.uid, msg.name, msg.kind, msg.role, msg.avatar, refOut ? JSON.stringify(refOut) : '', msg.text, msg.ts
        );
        this.sql.exec(
            'DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY ts DESC LIMIT ?)',
            MAX_HISTORY
        );
        // 消息被裁掉后，挂在它上面的回应也一并清掉，别留孤儿行
        this.sql.exec('DELETE FROM reactions WHERE msg_id NOT IN (SELECT id FROM messages)');

        this._broadcast({
            t: 'msg', id: msg.id, uid: msg.uid, name: msg.name, kind: msg.kind, role: msg.role,
            avatar: msg.avatar, ref: refOut, mentions: mentions, text: msg.text, ts: msg.ts
        }, null);
    }

    /**
     * 撤回消息（软删除）：
     * - 管理员（凹凸曼）：可撤回任何人的任意消息
     * - 普通成员：只能撤回自己 3 分钟内发的消息
     */
    _delete(ws, p) {
        const meta = this._meta(ws);
        const id = String(p.id || '').slice(0, 60);
        if (!id) { return; }

        const row = [...this.sql.exec('SELECT uid, ts, deleted FROM messages WHERE id = ?', id)][0];
        if (!row || row.deleted) { return; }

        if (meta.role !== 'admin') {
            if (row.uid !== meta.uid) {
                this._send(ws, { t: 'error', msg: '只能撤回自己的消息' });
                return;
            }
            if (Date.now() - row.ts > RECALL_WINDOW) {
                this._send(ws, { t: 'error', msg: '发送超过 3 分钟的消息不能撤回了' });
                return;
            }
        }

        this.sql.exec('UPDATE messages SET deleted = 1 WHERE id = ?', id);
        // 被撤回消息上的表情回应一并清掉
        this.sql.exec('DELETE FROM reactions WHERE msg_id = ?', id);
        // 审计：谁在什么时候撤了谁的消息
        this.sql.exec(
            'INSERT INTO audit (action, actor, target, ts) VALUES (?, ?, ?, ?)',
            'recall', meta.name, id, Date.now()
        );
        this._broadcast({ t: 'msgdel', id: id, by: meta.name }, null);
    }

    _typing(ws) {
        const meta = this._meta(ws);
        if (!meta.uid) { return; }
        this._broadcast({ t: 'typing', name: meta.name }, ws);
    }

    _react(ws, p) {
        const meta = this._meta(ws);
        if (!meta.uid) { return; }

        const id = String(p.id || '').slice(0, 60);
        const emoji = String(p.emoji || '').slice(0, 8);
        if (!id || !emoji) { return; }

        // 只允许对**真实存在**的消息回应，避免被拿来灌垃圾行
        const exists = [...this.sql.exec('SELECT 1 AS ok FROM messages WHERE id = ?', id)];
        if (!exists.length) { return; }

        // 单独的节流：回应很轻量，但同样不能让客户端无限刷
        const now = Date.now();
        const reacts = (meta.reacts || []).filter(function (t) { return now - t < RATE_WINDOW; });
        if (reacts.length >= RATE_MAX * 3) { return; }
        reacts.push(now);
        meta.reacts = reacts;
        try { ws.serializeAttachment(meta); } catch (e) { /* 忽略 */ }

        const mine = [...this.sql.exec(
            'SELECT 1 AS ok FROM reactions WHERE msg_id = ? AND uid = ? AND emoji = ?', id, meta.uid, emoji
        )];
        if (mine.length) {
            this.sql.exec('DELETE FROM reactions WHERE msg_id = ? AND uid = ? AND emoji = ?', id, meta.uid, emoji);
        } else {
            this.sql.exec('INSERT OR REPLACE INTO reactions (msg_id, uid, emoji, ts) VALUES (?, ?, ?, ?)',
                id, meta.uid, emoji, now);
        }

        const list = this._reactionsFor()[id] || [];
        this._broadcast({ t: 'reaction', id: id, list: list }, null);
    }

    _broadcast(obj, except) {
        const raw = JSON.stringify(obj);
        const sockets = this.ctx.getWebSockets();
        for (let i = 0; i < sockets.length; i++) {
            // readyState !== 1 说明已关闭 —— getWebSockets() 仍可能把它列出来
            if (sockets[i] === except || sockets[i].readyState !== 1) { continue; }
            try { sockets[i].send(raw); } catch (e) { /* 忽略坏连接 */ }
        }
    }

    /** presence 广播节流：高频进出时避免 O(N) 广播风暴（400ms 合并） */
    _presence() {
        if (this._pThrottling) { this._pPending = true; return; }
        this._pThrottling = true;
        this._pPending = false;
        this._broadcastPresenceNow();
        setTimeout(() => {
            this._pThrottling = false;
            if (this._pPending) { this._presence(); }
        }, 400);
    }

    _broadcastPresenceNow() {
        const sockets = this.ctx.getWebSockets();
        const seen = {};
        const list = [];
        for (let i = 0; i < sockets.length; i++) {
            if (sockets[i].readyState !== 1) { continue; }
            const m = this._meta(sockets[i]);
            if (!m.uid || seen[m.uid]) { continue; }
            seen[m.uid] = 1;
            list.push({ uid: m.uid, name: m.name, kind: m.kind || 'anon', avatar: m.avatar || '' });
        }
        this._broadcast({ t: 'presence', list: list }, null);
    }

    /** 封禁状态查询（结果缓存：未封禁 15s / 已封禁 10min——封禁要尽快生效，解封可以稍慢） */
    async _checkBan(uid) {
        if (!uid) { return { banned: false }; }
        const now = Date.now();
        this._banCache = this._banCache || {};
        const hit = this._banCache[uid];
        if (hit && now - hit.at < hit.ttl) {
            return hit.until && hit.until > now ? { banned: true, until: hit.until, reason: hit.reason } : { banned: false };
        }
        let result = { banned: false };
        try {
            const acct = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('accounts-v1'));
            // 注意：DO stub 的 fetch 必须是绝对 URL（相对路径会抛错被 catch 吞掉）
            const res = await acct.fetch('https://accounts/checkban?uid=' + encodeURIComponent(uid));
            if (res.ok) {
                const d = JSON.parse(await res.text());
                result = d.banned ? { banned: true, until: d.until || 0, reason: d.reason || '' } : { banned: false };
            }
        } catch (e) { /* 查询失败按未封禁处理 */ }
        this._banCache[uid] = {
            at: now,
            ttl: result.banned ? 600000 : 15000,   // 封禁缓存久些；未封禁短缓存让封禁尽快生效
            until: result.until || 0,
            reason: result.reason || ''
        };
        return result;
    }

    /** 管理命令：/unban 昵称（仅管理员）。被封者通常已离线，按名字从账号库反查 uid 解封 */
    async _handleUnbanCommand(ws, meta, text) {
        const mm = text.match(/^\/unban\s+(\S{1,16})$/);
        if (!mm) {
            this._send(ws, { t: 'error', msg: '用法：/unban 昵称，例如 /unban 张三' });
            return;
        }
        const targetName = mm[1];
        let uids = [];
        try {
            const acct = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('accounts-v1'));
            const res = await acct.fetch('https://accounts/uidbybanname?name=' + encodeURIComponent(targetName));
            if (res.ok) {
                uids = (JSON.parse(await res.text()).uids) || [];
            }
        } catch (e) {
            this._send(ws, { t: 'error', msg: '账号查询失败，请稍后再试' });
            return;
        }
        if (!uids.length) {
            this._send(ws, { t: 'error', msg: '账号库里没有叫「' + targetName + '」的用户' });
            return;
        }
        try {
            const acct = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('accounts-v1'));
            for (const uid of uids) {
                await acct.fetch('https://accounts/unban', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ uid: uid })
                });
                this._invalidateBanCache(uid);
            }
        } catch (e) {
            this._send(ws, { t: 'error', msg: '解封失败，请稍后再试' });
            return;
        }
        this.sql.exec(
            'INSERT INTO audit (action, actor, target, ts) VALUES (?, ?, ?, ?)',
            'unban', meta.name, uids.join(','), Date.now()
        );
        this._broadcast({ t: 'sys', text: '「' + targetName + '」已被管理员解除封禁' }, null);
        this._send(ws, { t: 'error', msg: '已解封 ' + uids.length + ' 个账号' });
    }

    /** 管理命令：/ban 昵称 [小时]（默认 24h，最长 720h）。成功后目标连接被踢出并全员公告 */
    async _handleBanCommand(ws, meta, text) {
        const mm = text.match(/^\/ban\s+(\S{1,16})(?:\s+(\d{1,4}))?$/);
        if (!mm) {
            this._send(ws, { t: 'error', msg: '用法：/ban 昵称 [小时数]，例如 /ban 张三 24' });
            return;
        }
        const targetName = mm[1];
        const hours = Math.min(720, Math.max(1, parseInt(mm[2] || '24', 10) || 24));
        if (targetName === meta.name) {
            this._send(ws, { t: 'error', msg: '不能封禁自己' });
            return;
        }
        // 在线成员里找目标
        let targetUid = null;
        for (const s of this.ctx.getWebSockets()) {
            if (s.readyState !== 1) { continue; }
            const om = this._meta(s);
            if (om.uid && om.name === targetName) { targetUid = om.uid; break; }
        }
        if (!targetUid) {
            this._send(ws, { t: 'error', msg: '在线成员里没有叫「' + targetName + '」的人' });
            return;
        }
        await this._banByUid(ws, meta, targetUid, targetName, hours);
    }

    /** 封禁核心：写 Accounts、审计、踢人、全员公告。admin 校验由调用方完成 */
    async _banByUid(ws, meta, targetUid, targetName, hours) {
        const until = Date.now() + hours * 3600 * 1000;
        try {
            const acct = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('accounts-v1'));
            await acct.fetch('https://accounts/ban', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ uid: targetUid, name: targetName, reason: 'by ' + meta.name, until: until })
            });
        } catch (e) {
            this._send(ws, { t: 'error', msg: '封禁写入失败，请稍后再试' });
            return;
        }
        this.sql.exec(
            'INSERT INTO audit (action, actor, target, ts) VALUES (?, ?, ?, ?)',
            'ban', meta.name, targetUid + ' ' + hours + 'h', Date.now()
        );
        this._invalidateBanCache(targetUid);
        // 踢掉目标的所有连接（本房间内的）
        for (const s of this.ctx.getWebSockets()) {
            if (s.readyState !== 1) { continue; }
            const om = this._meta(s);
            if (om.uid === targetUid) {
                this._send(s, { t: 'banned', msg: '你已被管理员封禁 ' + hours + ' 小时', until: until });
                try { s.close(1008, 'banned'); } catch (e) { /* 忽略 */ }
            }
        }
        this._broadcast({ t: 'sys', text: '「' + targetName + '」已被管理员封禁 ' + hours + ' 小时' }, null);
        this._invalidateBanCache(targetUid);
        await this._sendBanList(ws);
    }

    _invalidateBanCache(uid) {
        if (this._banCache) { delete this._banCache[uid]; }
    }

    /** WS 封禁请求（admin 消息操作条按钮）：{t:'ban', uid, hours} */
    async _banRequest(ws, p) {
        const meta = this._meta(ws);
        if (meta.role !== 'admin') {
            this._send(ws, { t: 'error', msg: '只有管理员（凹凸曼）可以封禁成员' });
            return;
        }
        const uid = String(p.uid || '').slice(0, 64);
        const hours = Math.min(720, Math.max(1, Number(p.hours) || 24));
        if (!uid || uid === meta.uid) { return; }
        // 已封禁的不可重复封禁（服务端兜底，前端菜单也不显示该入口）
        const already = await this._checkBan(uid);
        if (already.banned) {
            this._send(ws, { t: 'error', msg: '「' + (p.name || '该成员') + '」已被封禁，如需恢复请使用解封' });
            return;
        }
        let targetName = String(p.name || '').slice(0, 16) || '成员';
        for (const s of this.ctx.getWebSockets()) {
            if (s.readyState !== 1) { continue; }
            const om = this._meta(s);
            if (om.uid === uid) { targetName = om.name || targetName; break; }
        }
        await this._banByUid(ws, meta, uid, targetName, hours);
        await this._sendBanList(ws);   // 封禁后把最新名单推给管理员
    }

    /** WS 解封请求：{t:'unban', uid, name} */
    async _unbanRequest(ws, p) {
        const meta = this._meta(ws);
        if (meta.role !== 'admin') {
            this._send(ws, { t: 'error', msg: '只有管理员（凹凸曼）可以解封成员' });
            return;
        }
        const uid = String(p.uid || '').slice(0, 64);
        if (!uid) { return; }
        let targetName = String(p.name || '').slice(0, 16) || '成员';
        for (const s of this.ctx.getWebSockets()) {
            if (s.readyState !== 1) { continue; }
            const om = this._meta(s);
            if (om.uid === uid) { targetName = om.name || targetName; break; }
        }
        try {
            const acct = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('accounts-v1'));
            const r = await acct.fetch('https://accounts/unban', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ uid: uid })
            });
        } catch (e) {
            this._send(ws, { t: 'error', msg: '解封失败，请稍后再试' });
            return;
        }
        this._invalidateBanCache(uid);
        this.sql.exec(
            'INSERT INTO audit (action, actor, target, ts) VALUES (?, ?, ?, ?)',
            'unban', meta.name, uid, Date.now()
        );
        this._broadcast({ t: 'sys', text: '「' + targetName + '」已被管理员解除封禁' }, null);
        await this._sendBanList(ws);
    }

    /** 把当前生效中的封禁名单发给（管理员）连接 */
    async _sendBanList(ws) {
        try {
            const acct = this.env.ACCOUNTS.get(this.env.ACCOUNTS.idFromName('accounts-v1'));
            const res = await acct.fetch('https://accounts/banlist');
            if (res.ok) {
                const d = JSON.parse(await res.text());
                this._send(ws, { t: 'banlist', uids: d.uids || [] });
            }
        } catch (e) { /* 忽略 */ }
    }

    /** 加载更早的历史：前端传 before（最早一条消息的 ts），返回更早的 100 条 */
    _histBefore(ws, p) {
        const meta = this._meta(ws);
        if (!meta.uid) { return; }
        const before = Number(p.before) || 0;
        if (!before) { return; }
        const rows = [...this.sql.exec(
            'SELECT id, uid, name, kind, role, avatar, ref, deleted, text, ts FROM messages WHERE ts < ? ORDER BY ts DESC LIMIT ?',
            before, HIST_PAGE
        )];
        rows.reverse();
        const reacts = this._reactionsForIds(rows.map(function (r) { return r.id; }));
        for (const r of rows) {
            r.reactions = reacts[r.id] || [];
            if (r.ref) { try { r.ref = JSON.parse(r.ref); } catch (e) { r.ref = null; } }
        }
        this._send(ws, { t: 'histmore', list: rows, hasMore: rows.length >= HIST_PAGE });
    }
}
