/**
 * 身份凭证（identity token）
 * ---------------------------------------------------------------------------
 * 用 HMAC-SHA256 签发一张**服务端签名**的身份凭证，取代"客户端自己编 uid"。
 *
 *   格式： base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload))
 *   payload：{ uid, kind: 'anon' | 'github', name?, avatar?, exp? }
 *
 * 为什么这样设计：
 *   - 匿名也需要不可伪造的身份 —— 否则谁都能顶着别人的 uid 说话、也封不掉人。
 *   - 凭证是**无状态**的：任何房间的 DO 都能用同一个密钥独立校验，
 *     不需要为每次校验去查库（读多得多的场景下这点很关键）。
 *   - 登录（GitHub）只是把 kind 从 anon 升级成 github，
 *     匿名时期的历史和 uid 可以平滑延续，不必清空重来。
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlFromBytes(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) { s += String.fromCharCode(bytes[i]); }
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromB64url(str) {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) { out[i] = s.charCodeAt(i); }
    return out;
}

async function keyFrom(secret) {
    return crypto.subtle.importKey(
        'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
}

/** 签发凭证。secret 为空则抛错（宁可失败，也不要签发无法校验的假凭证）。 */
export async function signToken(payload, secret) {
    if (!secret) { throw new Error('IDENTITY_SECRET 未配置'); }
    const body = b64urlFromBytes(enc.encode(JSON.stringify(payload)));
    const sig = await crypto.subtle.sign('HMAC', await keyFrom(secret), enc.encode(body));
    return body + '.' + b64urlFromBytes(new Uint8Array(sig));
}

/** 校验凭证。任何异常一律返回 null —— 调用方只需判断"有没有拿到身份"。 */
export async function verifyToken(token, secret) {
    if (!secret || typeof token !== 'string') { return null; }
    const dot = token.indexOf('.');
    if (dot <= 0) { return null; }

    const body = token.slice(0, dot);
    const sigPart = token.slice(dot + 1);

    let expected, given;
    try {
        expected = new Uint8Array(
            await crypto.subtle.sign('HMAC', await keyFrom(secret), enc.encode(body))
        );
        given = bytesFromB64url(sigPart);
    } catch (e) {
        return null;
    }
    if (given.length !== expected.length) { return null; }

    // 常量时间比较，避免通过响应时间侧信道逐字节猜测签名
    let diff = 0;
    for (let i = 0; i < expected.length; i++) { diff |= expected[i] ^ given[i]; }
    if (diff !== 0) { return null; }

    let payload;
    try { payload = JSON.parse(dec.decode(bytesFromB64url(body))); } catch (e) { return null; }
    if (!payload || typeof payload.uid !== 'string' || !payload.uid) { return null; }
    if (payload.exp && Date.now() > payload.exp) { return null; }

    return payload;
}

export function newUid(prefix) {
    return (prefix || 'u') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** 匿名凭证：30 天有效，够长到不会天天掉身份，又能自然淘汰僵尸设备。 */
export const ANON_TTL = 30 * 24 * 3600 * 1000;

export async function issueAnon(secret, name) {
    const uid = newUid('a');
    const payload = { uid: uid, kind: 'anon', name: name || '访客', exp: Date.now() + ANON_TTL };
    return { token: await signToken(payload, secret), payload: payload };
}

export async function issueGithub(secret, uid, name, avatar, role) {
    const payload = { uid: uid, kind: 'github', name: name || 'GitHub 用户', avatar: avatar || '', exp: Date.now() + ANON_TTL };
    if (role) { payload.role = String(role).slice(0, 16); }   // 'admin' —— 签进凭证，房间 DO 验签后即可信
    return { token: await signToken(payload, secret), payload: payload };
}
