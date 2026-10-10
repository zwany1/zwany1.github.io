/**
 * Accounts —— 账号存储用的 Durable Object（单实例）
 * ---------------------------------------------------------------------------
 * 为什么账号不放在"房间"的 DO 里：房间是按房间名分片的，同一个人进不同房间
 * 会落在不同实例上，身份就对不上了。账号必须住在一个**全局唯一**的实例里，
 * 所以单独开一个 DO，用固定的名字（见 index.js 里的 ACCOUNTS_NAME）。
 *
 * 这里只做一件事：把「第三方登录身份」映射到一个稳定的 uid 上，
 * 保证同一个人换设备/换房间都拿到同一个 uid。
 */

export class Accounts {
    constructor(ctx, env) {
        this.ctx = ctx;
        this.env = env;
        this.sql = ctx.storage.sql;

        ctx.blockConcurrencyWhile(async () => {
            this.sql.exec(`CREATE TABLE IF NOT EXISTS users (
                uid          TEXT PRIMARY KEY,
                provider     TEXT NOT NULL,
                provider_uid TEXT NOT NULL,
                name         TEXT NOT NULL,
                avatar       TEXT NOT NULL DEFAULT '',
                created_at   INTEGER NOT NULL,
                last_login   INTEGER NOT NULL
            )`);
            this.sql.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider
                           ON users (provider, provider_uid)`);
            // 轻量迁移：补 login 列（GitHub 登录名，管理员判定用）。每条独立 try。
            const MIGRATIONS = [
                `ALTER TABLE users ADD COLUMN login TEXT NOT NULL DEFAULT ''`
            ];
            for (const stmt of MIGRATIONS) {
                try { this.sql.exec(stmt); } catch (e) { /* 已有该列 */ }
            }
            // 封禁名单：全局生效（跨房间、跨连接），until 为 0/过去时间即未封禁
            this.sql.exec(`CREATE TABLE IF NOT EXISTS bans (
                uid        TEXT PRIMARY KEY,
                name       TEXT NOT NULL DEFAULT '',
                reason     TEXT NOT NULL DEFAULT '',
                until      INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )`);
            // 老的 bans 表没有 name 列（解封按名字反查用），独立补
            try { this.sql.exec(`ALTER TABLE bans ADD COLUMN name TEXT NOT NULL DEFAULT ''`); } catch (e) { /* 已有该列 */ }
        });
    }

    async fetch(request) {
        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/upsert') {
            let body;
            try { body = await request.json(); } catch (e) { return this._json({ error: 'bad json' }, 400); }

            const provider = String(body.provider || '').slice(0, 24);
            const providerUid = String(body.providerUid || '').slice(0, 64);
            const name = String(body.name || '').slice(0, 16) || '用户';
            const avatar = String(body.avatar || '').slice(0, 300);
            const login = String(body.login || '').slice(0, 64);
            if (!provider || !providerUid) { return this._json({ error: 'missing provider' }, 400); }

            const now = Date.now();
            const found = [...this.sql.exec(
                'SELECT uid, name, avatar, login FROM users WHERE provider = ? AND provider_uid = ?',
                provider, providerUid
            )];

            if (found.length) {
                // 老用户：刷新昵称/头像与最后登录时间，uid 保持不变；login 缺失时补上
                const newLogin = login || found[0].login || '';
                this.sql.exec(
                    'UPDATE users SET name = ?, avatar = ?, login = ?, last_login = ? WHERE uid = ?',
                    name, avatar, newLogin, now, found[0].uid
                );
                return this._json({ uid: found[0].uid, login: newLogin, created: false });
            }

            const uid = 'g_' + now.toString(36) + Math.random().toString(36).slice(2, 10);
            this.sql.exec(
                'INSERT INTO users (uid, provider, provider_uid, login, name, avatar, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                uid, provider, providerUid, login, name, avatar, now, now
            );
            return this._json({ uid: uid, login: login, created: true });
        }

        // 封禁：设置/更新（until 传 0 表示解封）
        if (request.method === 'POST' && url.pathname === '/ban') {
            let body;
            try { body = await request.json(); } catch (e) { return this._json({ error: 'bad json' }, 400); }
            const uid = String(body.uid || '').slice(0, 64);
            const bname = String(body.name || '').slice(0, 16);
            const reason = String(body.reason || '').slice(0, 100);
            const until = Number(body.until) || 0;
            if (!uid) { return this._json({ error: 'missing uid' }, 400); }
            if (until > Date.now()) {
                this.sql.exec(
                    'INSERT OR REPLACE INTO bans (uid, name, reason, until, created_at) VALUES (?, ?, ?, ?, ?)',
                    uid, bname, reason, until, Date.now()
                );
            } else {
                this.sql.exec('DELETE FROM bans WHERE uid = ?', uid);
            }
            return this._json({ ok: true, uid: uid, until: until });
        }

        // 解封
        if (request.method === 'POST' && url.pathname === '/unban') {
            let body;
            try { body = await request.json(); } catch (e) { return this._json({ error: 'bad json' }, 400); }
            const uid = String(body.uid || '').slice(0, 64);
            if (!uid) { return this._json({ error: 'missing uid' }, 400); }
            this.sql.exec('DELETE FROM bans WHERE uid = ?', uid);
            const after = [...this.sql.exec('SELECT uid FROM bans')];
            return this._json({ ok: true });
        }

        // 按昵称查 uid（解封用：被封者已离线，只能按名字反查；重名时全部返回）
        if (request.method === 'GET' && url.pathname === '/uidbyname') {
            const name = url.searchParams.get('name') || '';
            const rows = [...this.sql.exec('SELECT uid, name, login FROM users WHERE name = ?', name)];
            return this._json({ uids: rows.map(function (r) { return r.uid; }) });
        }

        // 全部生效中的封禁名单（管理员 join 时下发，用于成员列表操作菜单的状态判断）
        if (request.method === 'GET' && url.pathname === '/banlist') {
            const rows = [...this.sql.exec('SELECT uid FROM bans WHERE until > ?', Date.now())];
            return this._json({ uids: rows.map(function (r) { return r.uid; }) });
        }

        // 按封禁时记录的名字查 uid（解封用：被封者已离线）
        if (request.method === 'GET' && url.pathname === '/uidbybanname') {
            const bname = url.searchParams.get('name') || '';
            const rows = [...this.sql.exec('SELECT uid FROM bans WHERE name = ?', bname)];
            return this._json({ uids: rows.map(function (r) { return r.uid; }) });
        }

        // 封禁状态查询（房间 DO 在用户 join 时调用）
        if (request.method === 'GET' && url.pathname === '/checkban') {
            const uid = url.searchParams.get('uid') || '';
            const rows = [...this.sql.exec('SELECT reason, until FROM bans WHERE uid = ?', uid)];
            if (rows.length && rows[0].until > Date.now()) {
                return this._json({ banned: true, until: rows[0].until, reason: rows[0].reason });
            }
            return this._json({ banned: false });
        }

        // 按 uid 查账号（续签身份时补 login 用）
        if (request.method === 'GET' && url.pathname === '/get') {
            const uid = url.searchParams.get('uid') || '';
            const rows = [...this.sql.exec(
                'SELECT uid, provider, provider_uid, login, name, avatar FROM users WHERE uid = ?', uid
            )];
            if (!rows.length) { return this._json({ error: 'not found' }, 404); }
            return this._json(rows[0]);
        }

        // 回写 login（老记录补齐，来源：GitHub 公共 API 反查）
        if (request.method === 'POST' && url.pathname === '/setlogin') {
            let body;
            try { body = await request.json(); } catch (e) { return this._json({ error: 'bad json' }, 400); }
            const uid = String(body.uid || '').slice(0, 64);
            const login = String(body.login || '').slice(0, 64);
            if (!uid || !login) { return this._json({ error: 'missing fields' }, 400); }
            this.sql.exec('UPDATE users SET login = ? WHERE uid = ?', login, uid);
            return this._json({ ok: true });
        }

        if (request.method === 'GET' && url.pathname === '/count') {
            const rows = [...this.sql.exec('SELECT COUNT(*) AS n FROM users')];
            return this._json({ users: rows.length ? rows[0].n : 0 });
        }

        return this._json({ error: 'not found' }, 404);
    }

    _json(obj, status) {
        return new Response(JSON.stringify(obj), {
            status: status || 200,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }
}
