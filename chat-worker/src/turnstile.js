/**
 * Turnstile 人机校验（服务端侧）
 * ---------------------------------------------------------------------------
 * 客户端拿到的是一个**一次性令牌**（5 分钟有效、用一次就废），必须由服务端
 * 调用 Siteverify 校验才算数 —— 只看客户端说"我验证过了"等于没验证。
 *
 * 未配置 secret 时返回 skipped=true：此时**没有防护**，调用方需要如实
 * 把这个状态暴露出去（见 /status），而不是假装安全。
 */

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileEnabled(env) {
    return !!(env && env.TURNSTILE_SECRET);
}

export async function verifyTurnstile(token, secret, ip) {
    if (!secret) { return { ok: true, skipped: true }; }
    if (!token) { return { ok: false, reason: 'missing-token', skipped: false }; }

    const form = new FormData();
    form.append('secret', secret);
    form.append('response', String(token));
    if (ip) { form.append('remoteip', ip); }

    try {
        const res = await fetch(SITEVERIFY, { method: 'POST', body: form });
        const out = await res.json();
        if (out && out.success) { return { ok: true, skipped: false }; }
        const codes = (out && out['error-codes']) || [];
        return { ok: false, reason: codes.join(',') || 'failed', skipped: false };
    } catch (e) {
        // 网络异常时**保守拒绝**：宁可让用户重试，也不要放行未校验的流量
        return { ok: false, reason: 'verify-error', skipped: false };
    }
}
