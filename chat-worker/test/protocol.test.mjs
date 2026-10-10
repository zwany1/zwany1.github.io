/**
 * 聊天室协议测试（node:test + miniflare）
 * ---------------------------------------------------------------------------
 * 覆盖核心协议：join 鉴权 / 限流持久化 / 撤回分级 / 引用快照 / @解析 / 封禁。
 * 运行：node --test test/protocol.test.mjs
 * 说明：每个测试文件共用一个 Miniflare 实例（内存态），用不同房间名隔离用例。
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { unstable_dev } from 'wrangler';
import { issueGithub } from '../src/identity.js';

const SECRET = 'test-secret';
let worker;
let base;

before(async () => {
    worker = await unstable_dev('src/index.js', {
        experimental: { disableExperimentalWarning: true },
        vars: {
            REQUIRE_LOGIN: 'true',
            IDENTITY_SECRET: SECRET,
            TURNSTILE_SITEKEY: '1x00000000000000000000AA',
            TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
            GITHUB_CLIENT_ID: '',
            GITHUB_CLIENT_SECRET: ''
        },
        ip: '127.0.0.1',
        port: 18787
    });
    base = 'ws://127.0.0.1:' + worker.port + '/ws';
});

after(async () => { await worker?.stop(); });

/* ---------- WS 辅助 ---------- */

/** 建立连接并等待 history/banned/need-login 三种初始消息之一 */
async function connect(token, room) {
    const ws = new WebSocket(base + '?room=' + encodeURIComponent(room));
    ws.__queue = [];
    ws.__waiters = [];
    ws.addEventListener('message', (ev) => {
        const p = JSON.parse(ev.data);
        const idx = ws.__waiters.findIndex((w) => w.pred(p));
        if (idx >= 0) {
            const w = ws.__waiters.splice(idx, 1)[0];
            w.resolve(p);
            return;
        }
        ws.__queue.push(p);
    });
    const opened = new Promise((r) => ws.addEventListener('open', r, { once: true }));
    ws.addEventListener('error', () => {
        const w = ws.__waiters;
        w.forEach((x) => x.reject(new Error('WS 连接失败')));
        w.length = 0;
    });
    await opened;
    send(ws, { t: 'join', token: token });   // 无 token 也会发 join，服务端打回 need-login
    const history = await nextOf(ws, (p) => ['history', 'banned', 'need-login'].indexOf(p.t) >= 0);
    return { ws, history };
}

/** 等待下一条满足条件的消息（先查积压队列，再挂等待器） */
function nextOf(ws, pred, timeout = 5000) {
    const idx = ws.__queue.findIndex(pred);
    if (idx >= 0) { return Promise.resolve(ws.__queue.splice(idx, 1)[0]); }
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('等待消息超时')), timeout);
        ws.__waiters.push({ pred, resolve: (p) => { clearTimeout(timer); resolve(p); } });
    });
}

function send(ws, obj) { ws.send(JSON.stringify(obj)); }

/** 等待对端把消息处理掉（服务端广播通常立刻回） */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 测试 ---------- */

test('无 token 的 join 被打回登录', async () => {
    const { ws, history } = await connect(null, '房A');
    assert.equal(history.t, 'need-login', '应返回 need-login');
    ws.close();
});

test('有效 token 进入房间并拿到身份与徽章角色', async () => {
    const { token } = await issueGithub(SECRET, 'uid-admin', '少帅', '', 'admin', 'zwany1');
    const { ws, history } = await connect(token, '房B');
    assert.equal(history.t, 'history');
    assert.equal(history.me.role, 'admin');
    assert.equal(typeof history.now, 'number', 'history 应带服务端时间');
    ws.close();
});

test('普通成员撤回自己的新消息：成功', async () => {
    const tA = (await issueGithub(SECRET, 'uid-a', '用户A', '', '', 'a')).token;
    const tB = (await issueGithub(SECRET, 'uid-b', '用户B', '', '', 'b')).token;
    const { ws: wsA } = await connect(tA, '房撤回1');
    const { ws: wsB } = await connect(tB, '房撤回1');

    send(wsA, { t: 'msg', id: 'm_self1', text: '我自己说的话' });
    await nextOf(wsA, (p) => p.t === 'msg' && p.id === 'm_self1');
    await wait(50);

    send(wsA, { t: 'del', id: 'm_self1' });
    const del = await nextOf(wsA, (p) => p.t === 'msgdel' && p.id === 'm_self1');
    assert.equal(del.id, 'm_self1');
    wsA.close(); wsB.close();
});

test('普通成员撤回别人的消息：被拒绝', async () => {
    const tA = (await issueGithub(SECRET, 'uid-a', '用户A', '', '', 'a')).token;
    const tB = (await issueGithub(SECRET, 'uid-b', '用户B', '', '', 'b')).token;
    const { ws: wsA } = await connect(tA, '房撤回2');
    const { ws: wsB } = await connect(tB, '房撤回2');
    send(wsB, { t: 'msg', id: 'm_b1', text: 'B 的话' });
    await nextOf(wsB, (p) => p.t === 'msg' && p.id === 'm_b1');
    await wait(50);

    send(wsA, { t: 'del', id: 'm_b1' });
    const err = await nextOf(wsA, (p) => p.t === 'error');
    assert.match(err.msg, /只能撤回自己的消息/);
    wsA.close(); wsB.close();
});

test('管理员撤回别人的消息：成功且不受时间限制', async () => {
    const tAdmin = (await issueGithub(SECRET, 'uid-admin', '少帅', '', 'admin', 'zwany1')).token;
    const tB = (await issueGithub(SECRET, 'uid-b', '用户B', '', '', 'b')).token;
    const { ws: wsB } = await connect(tB, '房撤回3');
    send(wsB, { t: 'msg', id: 'm_b2', text: 'B 的旧话' });
    await nextOf(wsB, (p) => p.t === 'msg' && p.id === 'm_b2');
    await wait(50);

    const { ws: wsAdmin } = await connect(tAdmin, '房撤回3');
    send(wsAdmin, { t: 'del', id: 'm_b2' });
    const del = await nextOf(wsB, (p) => p.t === 'msgdel' && p.id === 'm_b2');
    assert.equal(del.by, '少帅');
    wsAdmin.close(); wsB.close();
});

test('引用快照以服务端库内内容为准（防伪造）', async () => {
    const tA = (await issueGithub(SECRET, 'uid-a', '用户A', '', '', 'a')).token;
    const { ws: wsA } = await connect(tA, '房引用');
    send(wsA, { t: 'msg', id: 'm_r1', text: '原始内容ABC' });
    await nextOf(wsA, (p) => p.t === 'msg' && p.id === 'm_r1');
    await wait(50);

    send(wsA, { t: 'msg', id: 'm_r2', text: '引用回复', ref: { id: 'm_r1', name: '伪造名', text: '伪造内容' } });
    const msg = await nextOf(wsA, (p) => p.t === 'msg' && p.id === 'm_r2');
    assert.equal(msg.ref.id, 'm_r1');
    assert.equal(msg.ref.name, '用户A');
    assert.equal(msg.ref.text, '原始内容ABC');
    wsA.close();
});

test('@在线成员：mentions 正确解析（含自己）', async () => {
    const tA = (await issueGithub(SECRET, 'uid-a', '用户A', '', '', 'a')).token;
    const { ws: wsA } = await connect(tA, '房提及');
    send(wsA, { t: 'msg', id: 'm_at1', text: '@用户A 看这里' });
    const msg = await nextOf(wsA, (p) => p.t === 'msg' && p.id === 'm_at1');
    assert.deepEqual(msg.mentions, ['uid-a']);
    wsA.close();
});

test('管理员 @所有人：mentions 覆盖全部其他在线成员', async () => {
    const tAdmin = (await issueGithub(SECRET, 'uid-admin', '少帅', '', 'admin', 'zwany1')).token;
    const tB = (await issueGithub(SECRET, 'uid-b', '用户B', '', '', 'b')).token;
    const { ws: wsB } = await connect(tB, '房全员');
    const { ws: wsAdmin } = await connect(tAdmin, '房全员');
    send(wsAdmin, { t: 'msg', id: 'm_all1', text: '@所有人 开会啦' });
    const msg = await nextOf(wsB, (p) => p.t === 'msg' && p.id === 'm_all1');
    assert.deepEqual(msg.mentions, ['uid-b']);
    wsAdmin.close(); wsB.close();
});

test('限流按 uid 持久化：断线重连后计数不清零', async () => {
    const tA = (await issueGithub(SECRET, 'uid-a', '用户A', '', '', 'a')).token;
    // 发满 RATE_MAX（20）条
    const { ws: ws1 } = await connect(tA, '房限流');
    for (let i = 0; i < 20; i++) {
        send(ws1, { t: 'msg', id: 'm_rl' + i, text: '刷屏' + i });
        await nextOf(ws1, (p) => p.t === 'msg' && p.id === 'm_rl' + i);
    }
    // 第 21 条被拒
    send(ws1, { t: 'msg', id: 'm_rl20', text: '刷屏20' });
    const err = await nextOf(ws1, (p) => p.t === 'error');
    assert.match(err.msg, /发送太快/);
    ws1.close();

    // 重连后第一条就被拒——证明计数是 uid 级持久化的
    const { ws: ws2 } = await connect(tA, '房限流');
    send(ws2, { t: 'msg', id: 'm_rl21', text: '重连后再发' });
    const err2 = await nextOf(ws2, (p) => p.t === 'error');
    assert.match(err2.msg, /发送太快/);
    ws2.close();
});

test('封禁：被 ban 的用户立即被踢且无法再进入', async () => {
    const tAdmin = (await issueGithub(SECRET, 'uid-admin', '少帅', '', 'admin', 'zwany1')).token;
    const tC = (await issueGithub(SECRET, 'uid-c', '用户C', '', '', 'c')).token;
    const { ws: wsC } = await connect(tC, '房封禁');
    const { ws: wsAdmin } = await connect(tAdmin, '房封禁');

    send(wsAdmin, { t: 'ban', uid: 'uid-c', name: '用户C', hours: 1 });
    await wait(800);
    console.log('DEBUG admin队列:', JSON.stringify(wsAdmin.__queue));
    console.log('DEBUG wsC队列:', JSON.stringify(wsC.__queue));
    const banned = await nextOf(wsC, (p) => p.t === 'banned');
    assert.match(banned.msg, /封禁/);
    wsC.close();

    const ws2 = new WebSocket(base + '?room=' + encodeURIComponent('房封禁'));
    ws2.__queue = [];
    ws2.__waiters = [];
    ws2.addEventListener('message', (ev) => {
        const p = JSON.parse(ev.data);
        const idx = ws2.__waiters.findIndex((w) => w.pred(p));
        if (idx >= 0) { ws2.__waiters.splice(idx, 1)[0].resolve(p); return; }
        ws2.__queue.push(p);
    });
    await new Promise((r) => ws2.addEventListener('open', r, { once: true }));
    send(ws2, { t: 'join', token: tC });   // 重连也要发 join，服务端才会做封禁检查
    await wait(800);
    console.log('DEBUG ws2队列:', JSON.stringify(ws2.__queue).slice(0, 200));
    console.log('DEBUG wsC队列:', JSON.stringify(wsC.__queue).slice(0, 200));
    const back = await nextOf(ws2, (p) => p.t === 'banned' || p.t === 'need-login');
    assert.equal(back.t, 'banned', '被封禁用户再连应被拒绝');
    ws2.close();
    wsAdmin.close();
});

test('管理员 /unban 命令：解封后可重新进入', async () => {
    const tAdmin = (await issueGithub(SECRET, 'uid-admin', '少帅', '', 'admin', 'zwany1')).token;
    const tD = (await issueGithub(SECRET, 'uid-d', '用户D', '', '', 'd')).token;
    // 先封禁
    const { ws: wsC0 } = await connect(tD, '房解封');
    const { ws: wsAdmin0 } = await connect(tAdmin, '房解封');
    send(wsAdmin0, { t: 'ban', uid: 'uid-d', name: '用户D', hours: 1 });
    await nextOf(wsC0, (p) => p.t === 'banned');
    wsC0.close(); wsAdmin0.close();

    // /unban 命令解封
    const { ws: wsAdmin1 } = await connect(tAdmin, '房解封');
    send(wsAdmin1, { t: 'msg', id: 'm_unban1', text: '/unban 用户D' });
    const sys = await nextOf(wsAdmin1, (p) => p.t === 'sys');
    assert.match(sys.text, /解除封禁/);
    wsAdmin1.close();

    // 解封后可正常进房
    const { ws: wsD, history } = await connect(tD, '房解封');
    assert.equal(history.t, 'history', '解封后应能正常进入');
    wsD.close();
});

test('历史分页：hist 返回更早的 100 条内且带 hasMore', async () => {
    const tA = (await issueGithub(SECRET, 'uid-a', '用户A', '', '', 'a')).token;
    const { ws: wsA } = await connect(tA, '房分页');
    // 造 5 条消息，记录 m_pg2 广播回来的 ts 作为分页起点
    let beforeTs = 0;
    for (let i = 0; i < 5; i++) {
        send(wsA, { t: 'msg', id: 'm_pg' + i, text: '分页' + i });
        const got = await nextOf(wsA, (p) => p.t === 'msg' && p.id === 'm_pg' + i);
        if (i === 2) { beforeTs = got.ts; }
    }
    assert.ok(beforeTs > 0, '应能拿到 m_pg2 的时间戳');
    send(wsA, { t: 'hist', before: beforeTs });
    const more = await nextOf(wsA, (p) => p.t === 'histmore');
    assert.equal(more.list.length, 2, 'before 之前应有 2 条（m_pg0/m_pg1）');
    assert.equal(more.hasMore, false, '不足一页 hasMore 应为 false');
    wsA.close();
});
