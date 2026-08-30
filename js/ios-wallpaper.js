/* iOS 桌面动态壁纸
 * 数据源（均为免费公开 API，图片走 <img> 预加载，不受 CORS 限制）：
 *   必应每日一图  https://peapix.com/bing/feed?country=cn   （JSON 带 CORS，含近 7 天）
 *   随机风景      https://picsum.photos/seed/{seed}/1920/1080
 *   随机二次元    https://t.alcy.cc/ycy（备用 https://www.dmoe.cc/random.php）
 *   默认壁纸      /assets/images/wallpaper.jpg（深色主题 /assets/images/wallpaper-dark.jpg）
 * 选择缓存于 localStorage；必应模式每次进首页静默刷新当天图，随机模式超 12 小时自动换新。
 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var layer = $('ios-wallpaper');
  var widget = $('wp-widget');
  var thumb = $('wp-thumb');
  var nameEl = $('wp-name');
  var pop = $('wp-pop');
  var popMask = $('wp-pop-mask');
  var popClose = $('wp-pop-close');
  var bingGrid = $('wp-bing-grid');
  if (!layer || !widget) return;

  var KEY = 'ios_wallpaper_v1';
  var RANDOM_TTL = 12 * 3600 * 1000;
  var bingItems = [];
  var bingLoaded = false;

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function writeStore(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 隐私模式忽略 */ }
  }

  /* 预加载成功才切换，避免闪半张图；失败走 onerror 回退 */
  function apply(url, meta) {
    meta = meta || {};
    var probe = new Image();
    probe.onload = function () {
      layer.style.backgroundImage = 'url("' + url + '")';
      layer.classList.add('is-ready');
      if (thumb) thumb.style.backgroundImage = 'url("' + (meta.thumb || url) + '")';
      if (nameEl) {
        var t = meta.title || '今日壁纸';
        var cut = t.indexOf('，');
        if (cut > 0) t = t.slice(0, cut);
        nameEl.textContent = t;
      }
    };
    probe.onerror = function () { if (meta.onerror) meta.onerror(); };
    probe.src = url;
  }

  function applyStatic(keepStore) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var url = dark ? '/assets/images/wallpaper-dark.jpg' : '/assets/images/wallpaper.jpg';
    layer.classList.remove('is-ready');
    apply(url, { title: '壁纸', thumb: url });
    if (!keepStore) writeStore({ mode: 'static', ts: Date.now() });
  }

  function saveMode(mode, url, meta) {
    var v = { mode: mode, url: url, ts: Date.now() };
    for (var k in (meta || {})) v[k] = meta[k];
    writeStore(v);
  }

  /* ---- 必应每日一图 ---- */
  function fetchBing(cb) {
    fetch('https://peapix.com/bing/feed?country=cn')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) { if (list && list.length) { bingItems = list; cb(list); } else cb(null); })
      .catch(function () { cb(null); });
  }
  function applyBing(item, silent) {
    var meta = { title: item.title || '今日壁纸', sub: '必应每日 · ' + item.date, thumb: item.thumbUrl };
    apply(item.fullUrl, {
      title: meta.title, thumb: meta.thumb,
      onerror: silent ? null : applyStatic
    });
    saveMode('bing', item.fullUrl, meta);
  }
  function bootBing() {
    fetchBing(function (list) {
      if (list) { applyBing(list[0], true); return; }
      var saved = readStore();
      if (saved && saved.url && saved.mode === 'bing') apply(saved.url, saved);
      else applyStatic(true);
    });
  }

  /* ---- 随机壁纸 ---- */
  function newRandom(mode, silent) {
    if (mode === 'scenic') {
      var seed = Math.random().toString(36).slice(2, 10);
      var url = 'https://picsum.photos/seed/' + seed + '/1920/1080';
      apply(url, {
        title: '随机风景', thumb: 'https://picsum.photos/seed/' + seed + '/320/180',
        onerror: silent ? applyStatic : null
      });
      saveMode('scenic', url, { title: '随机风景' });
    } else {
      var u = 'https://t.alcy.cc/ycy?t=' + Date.now();
      apply(u, {
        title: '随机二次元', thumb: u,
        onerror: function () {
          var fallback = 'https://www.dmoe.cc/random.php?t=' + Date.now();
          apply(fallback, { title: '随机二次元', onerror: silent ? applyStatic : null });
          saveMode('acg', fallback, { title: '随机二次元' });
        }
      });
      saveMode('acg', u, { title: '随机二次元' });
    }
  }

  /* ---- 启动 ---- */
  (function boot() {
    var saved = readStore();
    if (saved && saved.url && saved.mode !== 'static') apply(saved.url, saved);
    if (!saved || saved.mode === 'static' || saved.mode === 'bing') bootBing();
    else if (Date.now() - (saved.ts || 0) > RANDOM_TTL) newRandom(saved.mode, true);
  })();

  /* ---- 弹窗 ---- */
  function closePop() { pop.hidden = true; }
  widget.addEventListener('click', function () {
    pop.hidden = false;
    if (!bingLoaded) { bingLoaded = true; fetchBing(renderBingGrid); }
  });
  popMask.addEventListener('click', closePop);
  popClose.addEventListener('click', closePop);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pop && !pop.hidden) closePop();
  });

  function renderBingGrid() {
    if (!bingGrid) return;
    if (!bingItems.length) {
      bingGrid.textContent = '';
      var hint = document.createElement('div');
      hint.className = 'wp-pop__hint';
      hint.textContent = '必应壁纸加载失败，试试下面的随机壁纸～';
      bingGrid.appendChild(hint);
      return;
    }
    bingGrid.textContent = '';
    var saved = readStore();
    bingItems.slice(0, 8).forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wp-bing-item' + (saved && saved.url === it.fullUrl ? ' is-active' : '');
      b.title = it.title || '';
      var img = document.createElement('span');
      img.className = 'wp-bing-item__img';
      img.style.backgroundImage = 'url("' + it.thumbUrl + '")';
      var cap = document.createElement('span');
      cap.className = 'wp-bing-item__cap';
      cap.textContent = (it.date || '').slice(5);
      b.appendChild(img);
      b.appendChild(cap);
      b.addEventListener('click', function () {
        applyBing(it, false);
        var cur = bingGrid.querySelector('.wp-bing-item.is-active');
        if (cur) cur.classList.remove('is-active');
        b.classList.add('is-active');
      });
      bingGrid.appendChild(b);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.wp-rand-btn'), function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-mode');
      if (mode === 'static') { applyStatic(); closePop(); return; }
      newRandom(mode, false);
      closePop();
    });
  });
})();
