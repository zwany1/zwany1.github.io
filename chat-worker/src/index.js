/**
 * 在线聊天室 · 服务端入口（Cloudflare Workers + Durable Objects）
 * ---------------------------------------------------------------------------
 * 两个 DO：
 *   ChatRoom  一个房间一个实例，负责广播、历史、在线名单、限流
 *   Accounts  单实例，负责把第三方登录身份映射到稳定的 uid
 *
 * 路由：
 *   GET  /ws?room=<房间>        WebSocket 主通道
 *   GET  /status                服务端能力自检（防护是否真的开着）
 *   GET  /auth/github/start     发起 GitHub 登录
 *   GET  /auth/github/callback  GitHub 回调 → 签发身份 → 跳回站点
 *   GET  /health                健康检查
 */

import { ChatRoom } from './room.js';
import { Accounts } from './accounts.js';
import { signToken, verifyToken, issueGithub } from './identity.js';
import { turnstileEnabled } from './turnstile.js';

export { ChatRoom, Accounts };

const ACCOUNTS_NAME = 'accounts-v1';
// 管理员（「凹凸曼」）：按 GitHub 登录名判定，登录签发的凭证里带 role:'admin'。
// 权限校验在房间 DO 验签之后进行，伪造不了。
const ADMIN_LOGINS = ['zwany1'];
const GH_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GH_TOKEN = 'https://github.com/login/oauth/access_token';
const GH_USER = 'https://api.github.com/user';

/** 允许登录后跳回的站点 —— 白名单，否则就是开放重定向漏洞 */
const ALLOWED_RETURN = [
    'https://zwany1.github.io',
    'https://myzwy.qzz.io',
    'https://zhuwany1.qzz.io',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];

function safeReturn(raw, fallback) {
    if (!raw) { return fallback; }
    try {
        const u = new URL(raw);
        const origin = u.origin;
        if (ALLOWED_RETURN.indexOf(origin) < 0) { return fallback; }
        // 只保留 origin + pathname，丢掉别人塞进来的 query/hash
        return origin + u.pathname;
    } catch (e) {
        return fallback;
    }
}

function json(obj, status) {
    return new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/ws') {
            if (request.headers.get('Upgrade') !== 'websocket') {
                return new Response('此端点仅接受 WebSocket 连接', { status: 426 });
            }
            const room = (url.searchParams.get('room') || '大厅').slice(0, 40);
            return env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(room)).fetch(request);
        }

        if (url.pathname === '/health') {
            return new Response('ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
        }

        // 自检：如实暴露防护到底开没开，不假装安全
        if (url.pathname === '/status') {
            return json({
                identity: !!env.IDENTITY_SECRET,
                turnstile: turnstileEnabled(env),
                turnstileSitekey: env.TURNSTILE_SITEKEY || '',
                github: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
            });
        }

        if (url.pathname === '/auth/github/start') {
            if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
                return new Response('GitHub 登录尚未配置（缺少 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET）',
                    { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
            }
            const back = safeReturn(url.searchParams.get('return'), 'https://zwany1.github.io/chat/');
            // 用同一个 HMAC 密钥给 state 签名 —— 防 CSRF，也顺手防了伪造的 return
            const state = await signToken({ rt: back, exp: Date.now() + 10 * 60 * 1000 }, env.IDENTITY_SECRET);
            const cb = url.origin + '/auth/github/callback';
            const auth = GH_AUTHORIZE + '?' + new URLSearchParams({
                client_id: env.GITHUB_CLIENT_ID,
                redirect_uri: cb,
                scope: 'read:user',
                state: state
            }).toString();
            return Response.redirect(auth, 302);
        }

        if (url.pathname === '/auth/github/callback') {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const back = safeReturn(
                (await verifyToken(state, env.IDENTITY_SECRET) || {}).rt,
                'https://zwany1.github.io/chat/'
            );
            const fail = (msg) => Response.redirect(back + '#chat_error=' + encodeURIComponent(msg), 302);

            if (!code) { return fail('用户取消或未授权'); }
            if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) { return fail('服务端未配置 GitHub 登录'); }

            try {
                const tokRes = await fetch(GH_TOKEN, {
                    method: 'POST',
                    headers: { accept: 'application/json', 'content-type': 'application/json' },
                    body: JSON.stringify({
                        client_id: env.GITHUB_CLIENT_ID,
                        client_secret: env.GITHUB_CLIENT_SECRET,
                        code: code,
                        redirect_uri: url.origin + '/auth/github/callback'
                    })
                });
                const tok = await tokRes.json();
                if (!tok || !tok.access_token) { return fail('GitHub 令牌交换失败'); }

                const userRes = await fetch(GH_USER, {
                    headers: {
                        authorization: 'Bearer ' + tok.access_token,
                        'user-agent': 'zwy-chat',
                        accept: 'application/vnd.github+json'
                    }
                });
                const gh = await userRes.json();
                if (!gh || !gh.id) { return fail('读取 GitHub 用户失败'); }

                const acct = env.ACCOUNTS.get(env.ACCOUNTS.idFromName(ACCOUNTS_NAME));
                const up = await acct.fetch('https://accounts/upsert', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        provider: 'github',
                        providerUid: String(gh.id),
                        login: String(gh.login || ''),
                        name: String(gh.name || gh.login || '用户').slice(0, 16),
                        avatar: gh.avatar_url || ''
                    })
                });
                const mapped = await up.json();
                if (!mapped || !mapped.uid) { return fail('账号写入失败'); }
                const login = mapped.login || String(gh.login || '');
                const isAdmin = ADMIN_LOGINS.indexOf(login) >= 0;

                const issued = await issueGithub(
                    env.IDENTITY_SECRET, mapped.uid,
                    String(gh.name || gh.login || '用户').slice(0, 16),
                    gh.avatar_url || '',
                    isAdmin ? 'admin' : '',
                    login
                );
                // 用 fragment 回传：不会进服务端日志，也不会被 Referer 带出去
                return Response.redirect(back + '#chat_token=' + encodeURIComponent(issued.token), 302);
            } catch (e) {
                return fail('登录过程出错：' + (e && e.message ? e.message : e));
            }
        }

        // 身份续签：老格式凭证（没有 login/role 字段）换发新格式，前端静默调用。
        // 拿不到 login 时用 GitHub 公共 API 按 provider_uid 反查一次并回写账号库。
        if (url.pathname === '/auth/refresh') {
            const old = url.searchParams.get('token') || '';
            const v = await verifyToken(old, env.IDENTITY_SECRET);
            if (!v || v.kind !== 'github') {
                return new Response(JSON.stringify({ error: 'bad token' }), {
                    status: 401,
                    headers: { 'content-type': 'application/json; charset=utf-8' }
                });
            }
            let login = String(v.login || '');
            const acct = env.ACCOUNTS.get(env.ACCOUNTS.idFromName(ACCOUNTS_NAME));
            if (!login) {
                const info = JSON.parse(await (await acct.fetch('/get?uid=' + encodeURIComponent(v.uid))).text());
                if (info.login) {
                    login = info.login;
                } else if (info.provider_uid) {
                    try {
                        const r = await fetch('https://api.github.com/user/' + info.provider_uid, {
                            headers: { 'user-agent': 'zwy-chat', accept: 'application/vnd.github+json' }
                        });
                        if (r.ok) {
                            const gh = await r.json();
                            login = String(gh.login || '');
                            await acct.fetch('https://accounts/setlogin', {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ uid: v.uid, login: login })
                            });
                        }
                    } catch (e) { /* 反查失败就保持无 login，下次再试 */ }
                }
            }
            const isAdmin = ADMIN_LOGINS.indexOf(login) >= 0;
            const issued = await issueGithub(
                env.IDENTITY_SECRET, v.uid, v.name, v.avatar,
                isAdmin ? 'admin' : '', login
            );
            return new Response(JSON.stringify({
                token: issued.token,
                role: isAdmin ? 'admin' : '',
                login: login
            }), {
                headers: { 'content-type': 'application/json; charset=utf-8' }
            });
        }

        return new Response('聊天室服务端。\nWebSocket: /ws?room=<房间名>\n状态: /status', {
            headers: { 'content-type': 'text/plain; charset=utf-8' }
        });
    }
};
