/* 游戏中心链接巡检：逐个请求 games.yml 的 url，检测存活与 iframe 可嵌入性
   分级：ok 正常 / warn 反爬拦截需人工复核 / dead 确定失效 */
import { readFileSync, writeFileSync } from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const TIMEOUT = 20000

const text = readFileSync(new URL('../_data/games.yml', import.meta.url), 'utf8')
const games = []
let current = null
for (const line of text.split('\n')) {
  const m = line.match(/^\s*-?\s*(name|url):\s*(.+?)\s*$/)
  if (!m) continue
  if (m[1] === 'name') {
    current = { name: m[2] }
    games.push(current)
  } else if (current) {
    current.url = m[2]
  }
}

async function probe(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    })
    const status = res.status
    if (status === 401 || status === 403 || status === 429)
      return { status, level: 'warn', reason: `HTTP ${status}，疑似反爬拦截` }
    if (status >= 400)
      return { status, level: 'dead', reason: `HTTP ${status}` }

    const xfo = (res.headers.get('x-frame-options') || '').toLowerCase()
    const csp = (res.headers.get('content-security-policy') || '').toLowerCase()
    const ancestors = csp.match(/frame-ancestors([^;]*)/)
    const blocked =
      xfo.includes('deny') || xfo.includes('sameorigin') ||
      (ancestors && !ancestors[1].includes('*'))
    if (blocked)
      return { status, level: 'dead', reason: `禁止 iframe 嵌入（${xfo ? 'X-Frame-Options: ' + xfo : 'CSP frame-ancestors'}）` }
    return { status, level: 'ok' }
  } catch (e) {
    const reason = e.name === 'TimeoutError' ? `超时 >${TIMEOUT / 1000}s` : (e.cause?.code || e.message)
    return { level: 'dead', reason: `网络错误：${reason}` }
  }
}

const results = []
for (const g of games) {
  const r = await probe(g.url)
  results.push({ ...g, ...r })
  const tag = r.level === 'ok' ? 'OK  ' : r.level === 'warn' ? 'WARN' : 'DEAD'
  console.log(`[${tag}] ${g.name} ${g.url}${r.reason ? ' —— ' + r.reason : ''}`)
}

const dead = results.filter(r => r.level === 'dead')
const warn = results.filter(r => r.level === 'warn')
const ok = results.filter(r => r.level === 'ok')
console.log(`\n共 ${results.length} 款：正常 ${ok.length}，失效 ${dead.length}，待复核 ${warn.length}`)

if (dead.length || warn.length) {
  const lines = [
    `本周自动巡检发现 ${dead.length} 款游戏链接失效、${warn.length} 款需人工复核，详见下表。`,
    '',
    ...dead.map(r => `- 失效：**${r.name}** — ${r.url} — ${r.reason}`),
    ...warn.map(r => `- 待复核：**${r.name}** — ${r.url} — ${r.reason}`),
    '',
    '修复后更新 [_data/games.yml](_data/games.yml) 即可，本 issue 可在全部恢复后关闭。',
  ]
  writeFileSync('games-check-report.md', lines.join('\n') + '\n')
}
process.exit(dead.length ? 1 : 0)
