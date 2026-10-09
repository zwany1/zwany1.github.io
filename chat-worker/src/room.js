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
const RATE_WINDOW = 10000;
const RATE_MAX = 20;

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
        if (p.t === 'msg') { this._message(ws, p); return; }
        if (p.t === 'typing') { this._typing(ws); return; }
        if (p.t === 'react') { this._react(ws, p); }
    }

    async webSocketClose(ws) { this._presence(); }
    async webSocketError(ws) { this._presence(); }

    /* ------------------------------------------------------------ 身份处理 */

    async _join(ws, p) {
        // 1) 先看有没有合法凭证 —— 有就直接放行，不必过人机校验
        const verified = await verifyToken(p.token, this.env.IDENTITY_SECRET);
        if (verified) {
            this._accept(ws, verified, p.name);
            return;
        }

        // 2) 没有身份 ⇒ 首次进入，必须过人机校验才发新身份
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

        // 3) 签发匿名身份并回传（客户端存起来，之后就不再需要人机校验）
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

    _accept(ws, payload, wantedName) {
        const meta = {
            ip: this._meta(ws).ip || '',
            uid: payload.uid,                          // ← 只认凭证里的 uid
            kind: payload.kind || 'anon',
            name: String(wantedName || payload.name || '访客').slice(0, MAX_NAME),
            avatar: payload.avatar || '',
            sent: []
        };
        try { ws.serializeAttachment(meta); } catch (e) { /* 忽略 */ }

        const rows = [...this.sql.exec(
            'SELECT id, uid, name, kind, text, ts FROM messages ORDER BY ts DESC LIMIT ?', MAX_HISTORY
        )];
        rows.reverse();

        // 一次性把最近这段消息的回应全取回来，避免逐条查
        const reacts = this._reactionsFor();
        for (const r of rows) { r.reactions = reacts[r.id] || []; }

        this._send(ws, { t: 'history', list: rows, me: { uid: meta.uid, name: meta.name, kind: meta.kind } });

        this._presence();
    }

    /** 取最近 MAX_HISTORY 条消息的回应，聚合成 [{emoji, count, users}] */
    _reactionsFor() {
        const out = {};
        const rows = [...this.sql.exec(
            `SELECT msg_id, emoji, uid FROM reactions
             WHERE msg_id IN (SELECT id FROM messages ORDER BY ts DESC LIMIT ?)`,
            MAX_HISTORY
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

    _message(ws, p) {
        const meta = this._meta(ws);
        if (!meta.uid) { return; }

        const text = String(p.text || '').slice(0, MAX_TEXT).replace(/\s+$/, '');
        if (!text) { return; }

        // 服务端限流：客户端限流可被绕过，这里不行
        const now = Date.now();
        const sent = (meta.sent || []).filter(function (t) { return now - t < RATE_WINDOW; });
        if (sent.length >= RATE_MAX) {
            this._send(ws, { t: 'error', msg: '发送太快了，请稍后再试' });
            return;
        }
        sent.push(now);
        meta.sent = sent;
        try { ws.serializeAttachment(meta); } catch (e) { /* 忽略 */ }

        const msg = {
            id: String(p.id || '').slice(0, 60) || ('s_' + now.toString(36) + Math.random().toString(36).slice(2, 6)),
            uid: meta.uid,
            name: meta.name,          // 昵称以服务端记录为准
            kind: meta.kind || 'anon',
            text: text,
            ts: now                   // 服务端时间戳
        };

        this.sql.exec(
            'INSERT OR REPLACE INTO messages (id, uid, name, kind, text, ts) VALUES (?, ?, ?, ?, ?, ?)',
            msg.id, msg.uid, msg.name, msg.kind, msg.text, msg.ts
        );
        this.sql.exec(
            'DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY ts DESC LIMIT ?)',
            MAX_HISTORY
        );
        // 消息被裁掉后，挂在它上面的回应也一并清掉，别留孤儿行
        this.sql.exec('DELETE FROM reactions WHERE msg_id NOT IN (SELECT id FROM messages)');

        this._broadcast({ t: 'msg', id: msg.id, uid: msg.uid, name: msg.name, kind: msg.kind, text: msg.text, ts: msg.ts }, null);
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

    _presence() {
        const sockets = this.ctx.getWebSockets();
        const seen = {};
        const list = [];
        for (let i = 0; i < sockets.length; i++) {
            if (sockets[i].readyState !== 1) { continue; }
            const m = this._meta(sockets[i]);
            if (!m.uid || seen[m.uid]) { continue; }
            seen[m.uid] = 1;
            list.push({ uid: m.uid, name: m.name, kind: m.kind || 'anon' });
        }
        this._broadcast({ t: 'presence', list: list }, null);
    }
}
