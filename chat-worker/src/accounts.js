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
            if (!provider || !providerUid) { return this._json({ error: 'missing provider' }, 400); }

            const now = Date.now();
            const found = [...this.sql.exec(
                'SELECT uid, name, avatar FROM users WHERE provider = ? AND provider_uid = ?',
                provider, providerUid
            )];

            if (found.length) {
                // 老用户：刷新昵称/头像与最后登录时间，uid 保持不变
                this.sql.exec(
                    'UPDATE users SET name = ?, avatar = ?, last_login = ? WHERE uid = ?',
                    name, avatar, now, found[0].uid
                );
                return this._json({ uid: found[0].uid, created: false });
            }

            const uid = 'g_' + now.toString(36) + Math.random().toString(36).slice(2, 10);
            this.sql.exec(
                'INSERT INTO users (uid, provider, provider_uid, name, avatar, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?)',
                uid, provider, providerUid, name, avatar, now, now
            );
            return this._json({ uid: uid, created: true });
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
