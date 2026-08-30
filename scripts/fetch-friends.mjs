// 友链朋友圈：抓取友链站点的 RSS/Atom，聚合最新文章到 assets/friends-posts.json
// 友链清单与 _data/friends.yml 保持一致（feeds 留空则自动尝试常见路径）。
// 由 .github/workflows/friends.yml 每天定时运行；无 RSS 的站点自动跳过。
import { writeFileSync, mkdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

const FRIENDS = [
  {
    name: 'KeysQiu',
    site: 'https://keysqiu.github.io/',
    feeds: ['feed.xml', 'atom.xml', 'rss.xml', 'index.xml', 'feed'],
  },
  // 新朋友加这里，或直接给出 feeds: ['https://xxx/atom.xml']
];

const UA = 'Mozilla/5.0 (compatible; friends-circle-bot)';
const TIMEOUT = 15000;

async function tryFetch(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) return null;
    const text = await r.text();
    return /<(entry|item)[\s>]/.test(text) ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
}

function pickLink(block) {
  const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (m) return m[1];
  return pick(block, 'link');
}

function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml);
  const re = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi;
  const out = [];
  let m;
  while ((m = re.exec(xml)) && out.length < 5) {
    const block = m[0];
    const title = pick(block, 'title');
    const link = pickLink(block);
    const dateRaw = pick(block, isAtom ? 'updated' : 'pubDate') || pick(block, 'published');
    if (!title || !link) continue;
    let date = null;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d)) date = d.toISOString();
    }
    out.push({ title, link, date });
  }
  return out;
}

const result = [];
for (const f of FRIENDS) {
  const candidates = f.feeds.map((p) => (/^https?:/.test(p) ? p : new URL(p, f.site).href));
  let xml = null;
  for (const u of candidates) {
    xml = await tryFetch(u);
    if (xml) break;
  }
  if (!xml) {
    console.log(`- ${f.name}: no feed found`);
    continue;
  }
  const posts = parseFeed(xml).map((p) => ({ ...p, friend: f.name, friendSite: f.site }));
  console.log(`- ${f.name}: ${posts.length} posts`);
  result.push(...posts);
}

result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
await mkdir('assets', { recursive: true });
writeFileSync('assets/friends-posts.json', JSON.stringify(result.slice(0, 30), null, 2));
console.log(`total: ${result.length} -> assets/friends-posts.json`);
