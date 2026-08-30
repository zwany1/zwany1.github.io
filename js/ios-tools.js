/* 首页 iOS 桌面「工具箱」
 * 计算器 / 便签 / 二维码 / 时间戳 / 文本统计 / JSON 工具
 * 除二维码图片用 qrserver 免费 API 生成外全部纯本地运行；便签存 localStorage。
 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var pop = $('tools-pop'), mask = $('tools-pop-mask'), closeBtn = $('tools-pop-close');
  var title = $('tools-pop-title'), grid = $('tools-grid'), stage = $('tools-stage');
  var back = $('tools-back');
  var widget = $('tools-widget');
  var dock = $('dock-tool'), dockIcon = $('dock-tool-icon'), dockIconWrap = $('dock-tool-iconwrap');
  var dockName = $('dock-tool-name');
  if (!pop || !widget) return;

  var current = null;

  function openPop() { pop.hidden = false; }
  function closePop() { pop.hidden = true; }
  function showGrid() {
    title.textContent = '工具箱';
    grid.hidden = false;
    stage.hidden = true;
    dock.hidden = true;
    current = null;
  }
  function openTool(el) {
    current = el.getAttribute('data-tool');
    var name = el.getAttribute('data-name') || '工具';
    title.textContent = name;
    grid.hidden = true;
    stage.hidden = false;
    Array.prototype.forEach.call(document.querySelectorAll('.tool-pane'), function (p) {
      p.hidden = p.id !== 'tool-' + current;
    });
    dock.hidden = false;
    dockIcon.className = el.getAttribute('data-icon') || 'fas fa-toolbox';
    dockIconWrap.style.background = el.getAttribute('data-bg') || '#49b1f5';
    dockName.textContent = name.length > 4 ? name.slice(0, 4) : name;
  }
  widget.addEventListener('click', openPop);
  grid.addEventListener('click', function (e) {
    var a = e.target.closest('.tools-pop__app');
    if (a) openTool(a);
  });
  mask.addEventListener('click', closePop);
  closeBtn.addEventListener('click', closePop);
  back.addEventListener('click', showGrid);
  dock.addEventListener('click', function (e) {
    e.preventDefault();
    if (pop.hidden) {
      openPop();
      if (current) {
        var el = grid.querySelector('[data-tool="' + current + '"]');
        if (el) openTool(el);
      }
    } else if (!current) openPop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pop.hidden) closePop();
  });

  /* ---- 计算器（iOS 式链式运算，不用 eval） ---- */
  (function () {
    var disp = $('calc-display'), cgrid = $('calc-grid');
    if (!disp || !cgrid) return;
    var st = { cur: '0', prev: null, op: null, fresh: true };
    function fmt(n) {
      if (!isFinite(n) || isNaN(n)) return '错误';
      var v = Math.round(n * 1e10) / 1e10;
      var s = String(v);
      if (s.replace('-', '').replace('.', '').length > 12) s = v.toExponential(6);
      return s;
    }
    function show() { disp.textContent = st.cur; }
    function clearOpActive() {
      Array.prototype.forEach.call(cgrid.querySelectorAll('.calc-btn--op'), function (b) {
        if (b.getAttribute('data-k') !== 'eq') b.classList.remove('is-active');
      });
    }
    function compute() {
      var a = st.prev, b = parseFloat(st.cur);
      switch (st.op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? NaN : a / b;
      }
      return b;
    }
    cgrid.addEventListener('click', function (e) {
      var btn = e.target.closest('.calc-btn');
      if (!btn) return;
      var k = btn.getAttribute('data-k');
      if (k.indexOf('d:') === 0) {
        var d = k.slice(2);
        if (st.fresh) { st.cur = d === '.' ? '0.' : d; st.fresh = false; }
        else if (!(d === '.' && st.cur.indexOf('.') >= 0)) {
          st.cur = st.cur === '0' && d !== '.' ? d : st.cur + d;
        }
        clearOpActive();
      } else if (k.indexOf('op:') === 0) {
        if (st.op && !st.fresh) st.cur = fmt(compute());
        st.prev = parseFloat(st.cur);
        st.op = k.slice(3);
        st.fresh = true;
        clearOpActive();
        btn.classList.add('is-active');
      } else if (k === 'eq') {
        if (st.op == null) return;
        st.cur = fmt(compute());
        st.prev = null;
        st.op = null;
        st.fresh = true;
        clearOpActive();
      } else if (k === 'c') {
        st = { cur: '0', prev: null, op: null, fresh: true };
        clearOpActive();
      } else if (k === 'neg') {
        if (st.cur !== '0' && st.cur !== '错误') st.cur = st.cur.charAt(0) === '-' ? st.cur.slice(1) : '-' + st.cur;
      } else if (k === 'pct') {
        st.cur = fmt(parseFloat(st.cur) / 100);
      }
      show();
    });
  })();

  /* ---- 便签（localStorage 自动保存） ---- */
  (function () {
    var ta = $('tool-note-text'), status = $('tool-note-status');
    if (!ta || !status) return;
    var KEY = 'ios_tool_note_v1', timer = null;
    var pad = function (n) { return n < 10 ? '0' + n : n; };
    try { ta.value = localStorage.getItem(KEY) || ''; } catch (e) { /* ignore */ }
    status.textContent = ta.value ? '已加载本地便签' : '开始输入，自动保存';
    ta.addEventListener('input', function () {
      clearTimeout(timer);
      status.textContent = '输入中…';
      timer = setTimeout(function () {
        try {
          localStorage.setItem(KEY, ta.value);
          var d = new Date();
          status.textContent = '已保存 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        } catch (e) { status.textContent = '保存失败（浏览器隐私模式）'; }
      }, 400);
    });
  })();

  /* ---- 二维码（qrserver 免费生图） ---- */
  (function () {
    var input = $('tool-qr-text'), btn = $('tool-qr-btn'), wrap = $('tool-qr-imgwrap');
    if (!input || !btn || !wrap) return;
    function gen() {
      var v = input.value.trim();
      if (!v) { wrap.innerHTML = '<span class="tool-hint">先输入文字或链接</span>'; return; }
      var img = new Image();
      img.className = 'tool-qr-img';
      img.alt = '二维码';
      img.onload = function () { wrap.textContent = ''; wrap.appendChild(img); };
      img.onerror = function () { wrap.innerHTML = '<span class="tool-hint">二维码服务暂时不可用，稍后再试</span>'; };
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(v);
    }
    btn.addEventListener('click', gen);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') gen(); });
  })();

  /* ---- 时间戳双向转换 ---- */
  (function () {
    var tin = $('tool-ts-in'), tout = $('tool-ts-out');
    var din = $('tool-ts-date'), dout = $('tool-ts-out2');
    var nowBtn = $('tool-ts-now');
    if (!tin || !din) return;
    var pad = function (n) { return n < 10 ? '0' + n : n; };
    function fmtDate(d) {
      var week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
        ' 星期' + week;
    }
    nowBtn.addEventListener('click', function () {
      var d = new Date();
      tin.value = Math.floor(d.getTime() / 1000);
      tout.textContent = fmtDate(d);
      var pad2 = function (n) { return n < 10 ? '0' + n : n; };
      din.value = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
        'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      dout.textContent = tin.value + ' 秒';
    });
    tin.addEventListener('input', function () {
      var v = Number(String(tin.value).trim());
      if (!v || !isFinite(v)) { tout.textContent = '—'; return; }
      var ms = Math.abs(v) < 1e12 ? v * 1000 : v;
      var d = new Date(ms);
      tout.textContent = isNaN(d.getTime()) ? '无法识别' : fmtDate(d) + (Math.abs(v) < 1e12 ? '（按秒）' : '（按毫秒）');
    });
    din.addEventListener('input', function () {
      if (!din.value) { dout.textContent = '—'; return; }
      var d = new Date(din.value);
      if (isNaN(d.getTime())) { dout.textContent = '无法识别'; return; }
      dout.textContent = Math.floor(d.getTime() / 1000) + ' 秒';
    });
  })();

  /* ---- 文本统计 ---- */
  (function () {
    var ta = $('tool-stats-text');
    if (!ta) return;
    var el = {
      chars: $('st-chars'), nospace: $('st-nospace'), words: $('st-words'),
      cjk: $('st-cjk'), lines: $('st-lines'), bytes: $('st-bytes')
    };
    function upd() {
      var t = ta.value;
      el.chars.textContent = t.length;
      el.nospace.textContent = t.replace(/\s/g, '').length;
      el.words.textContent = (t.match(/[a-zA-Z]+(?:'[a-z]+)?/g) || []).length;
      el.cjk.textContent = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
      el.lines.textContent = t ? t.split('\n').length : 1;
      try { el.bytes.textContent = new Blob([t]).size; } catch (e) { el.bytes.textContent = encodeURI(t).replace(/%../g, 'x').length; }
    }
    ta.addEventListener('input', upd);
    upd();
  })();

  /* ---- JSON 格式化 / 压缩 / 复制 ---- */
  (function () {
    var ta = $('tool-json-text'), out = $('tool-json-out');
    if (!ta || !out) return;
    function run(minify) {
      var v = ta.value.trim();
      if (!v) { out.textContent = '先粘贴一段 JSON'; out.classList.add('is-err'); return; }
      try {
        var obj = JSON.parse(v);
        out.textContent = JSON.stringify(obj, null, minify ? 0 : 2);
        out.classList.remove('is-err');
      } catch (e) {
        out.textContent = '解析失败：' + e.message;
        out.classList.add('is-err');
      }
    }
    $('tool-json-fmt').addEventListener('click', function () { run(false); });
    $('tool-json-min').addEventListener('click', function () { run(true); });
    $('tool-json-copy').addEventListener('click', function () {
      var t = out.textContent;
      if (!t || t === '结果会显示在这里') return;
      function ok() {
        var old = out.textContent;
        out.textContent = '已复制到剪贴板 ✓';
        setTimeout(function () { out.textContent = old; }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(ok, function () { fallback(); });
      } else fallback();
      function fallback() {
        var taw = document.createElement('textarea');
        taw.value = t;
        document.body.appendChild(taw);
        taw.select();
        try { document.execCommand('copy'); ok(); } catch (e) { /* ignore */ }
        document.body.removeChild(taw);
      }
    });
  })();

  /* ---- 单位换算（长度/重量/温度/数据） ---- */
  (function () {
    var cat = $('unit-cat'), fin = $('unit-in'), fout = $('unit-out');
    var from = $('unit-from'), to = $('unit-to');
    if (!cat || !fin) return;
    var DATA = {
      len: { name: '长度', u: { '毫米': 0.001, '厘米': 0.01, '米': 1, '千米': 1000, '英寸': 0.0254, '英尺': 0.3048, '英里': 1609.344 } },
      weight: { name: '重量', u: { '毫克': 0.000001, '克': 0.001, '千克': 1, '吨': 1000, '盎司': 0.0283495, '磅': 0.453592 } },
      temp: { name: '温度', special: ['摄氏度', '华氏度', '开尔文'] },
      data: { name: '数据大小', u: { 'B': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824, 'TB': 1099511627776 } }
    };
    function toC(v, u) { return u === '摄氏度' ? v : u === '华氏度' ? (v - 32) * 5 / 9 : v - 273.15; }
    function fromC(c, u) { return u === '摄氏度' ? c : u === '华氏度' ? c * 9 / 5 + 32 : c + 273.15; }
    function fillUnits() {
      var d = DATA[cat.value], names = d.special || Object.keys(d.u);
      from.textContent = '';
      to.textContent = '';
      names.forEach(function (n, i) {
        [from, to].forEach(function (sel, j) {
          var o = document.createElement('option');
          o.value = n;
          o.textContent = n;
          if (i === Math.min(j, names.length - 1)) sel.appendChild(o);
        });
      });
      run();
    }
    function fmtNum(v) {
      if (!isFinite(v)) return '—';
      if (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(6);
      return String(Math.round(v * 1e8) / 1e8);
    }
    function run() {
      var v = parseFloat(fin.value);
      var d = DATA[cat.value];
      if (isNaN(v)) { fout.value = ''; return; }
      var res;
      if (d.special) res = fromC(toC(v, from.value), to.value);
      else res = v * d.u[from.value] / d.u[to.value];
      fout.value = fmtNum(res);
    }
    Object.keys(DATA).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k;
      o.textContent = DATA[k].name;
      cat.appendChild(o);
    });
    fillUnits();
    cat.addEventListener('change', fillUnits);
    [fin, from, to].forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); });
  })();

  /* ---- 进制转换 ---- */
  (function () {
    var from = $('base-from'), input = $('base-in');
    if (!from || !input) return;
    var RE = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-fA-F]+$/ };
    function run() {
      var s = input.value.trim(), neg = false;
      if (s.charAt(0) === '-') { neg = true; s = s.slice(1); }
      var outs = [$('base-2'), $('base-8'), $('base-10'), $('base-16')];
      var b = Number(from.value);
      if (!s || !RE[b].test(s)) {
        outs.forEach(function (el) { el.textContent = '—'; });
        return;
      }
      var n = parseInt(s, b);
      if (isNaN(n)) { outs.forEach(function (el) { el.textContent = '—'; }); return; }
      var sign = neg ? '-' : '';
      outs[0].textContent = sign + n.toString(2);
      outs[1].textContent = sign + n.toString(8);
      outs[2].textContent = sign + n.toString(10);
      outs[3].textContent = sign + n.toString(16).toUpperCase();
    }
    run();
    input.addEventListener('input', run);
    from.addEventListener('change', run);
  })();

  /* ---- 颜色转换（HEX ⇄ RGB ⇄ HSL） ---- */
  (function () {
    var input = $('color-in'), swatch = $('color-swatch');
    if (!input || !swatch) return;
    var oHex = $('color-hex'), oRgb = $('color-rgb'), oHsl = $('color-hsl');
    function parse(s) {
      s = s.trim().toLowerCase();
      var m;
      if ((m = s.match(/^#?([0-9a-f])$/))) m = null; // 单字符不处理
      if ((m = s.match(/^#?([0-9a-f]{3})$/))) {
        return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
      }
      if ((m = s.match(/^#?([0-9a-f]{6})$/))) {
        return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
      }
      if ((m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/))) {
        var r = [Math.min(255, +m[1]), Math.min(255, +m[2]), Math.min(255, +m[3])];
        return r;
      }
      return null;
    }
    function rgb2hsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h, s, l = (mx + mn) / 2;
      if (mx === mn) { h = s = 0; }
      else {
        var d = mx - mn;
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
      }
      return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
    }
    function run() {
      var rgb = parse(input.value);
      if (!rgb) {
        oHex.textContent = oRgb.textContent = oHsl.textContent = '—';
        swatch.style.background = 'transparent';
        return;
      }
      var hex = '#' + rgb.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
      var hsl = rgb2hsl(rgb[0], rgb[1], rgb[2]);
      oHex.textContent = hex;
      oRgb.textContent = 'rgb(' + rgb.join(', ') + ')';
      oHsl.textContent = 'hsl(' + hsl.join(', ') + ')';
      swatch.style.background = hex;
    }
    run();
    input.addEventListener('input', run);
    [oHex, oRgb, oHsl].forEach(function (el) {
      el.style.cursor = 'pointer';
      el.title = '点击复制';
      el.addEventListener('click', function () {
        var v = el.textContent;
        if (v && v !== '—' && navigator.clipboard) navigator.clipboard.writeText(v).catch(function () {});
      });
    });
  })();

  /* ---- 正则测试 ---- */
  (function () {
    var pat = $('re-pat'), flags = $('re-flags'), text = $('re-text');
    var count = $('re-count'), out = $('re-hl');
    if (!pat || !text) return;
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function run() {
      var src = pat.value, fl = flags.value || 'g';
      if (!src) { count.textContent = '—'; out.textContent = '输入正则和测试文本'; return; }
      var re;
      try { re = new RegExp(src, fl); }
      catch (e) { count.textContent = '正则有误：' + e.message; out.classList.add('is-err'); out.textContent = e.message; return; }
      out.classList.remove('is-err');
      var s = text.value;
      if (!s) { count.textContent = '等待测试文本'; out.textContent = '结果会显示在这里'; return; }
      var html = '', last = 0, n = 0, m, shown = [], guard = 0;
      re.lastIndex = 0;
      while ((m = re.exec(s)) && guard++ < 5000) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        n++;
        if (shown.length < 20) shown.push(m[0]);
        html += esc(s.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
        last = m.index + m[0].length;
        if (!re.global) break;
      }
      html += esc(s.slice(last));
      out.innerHTML = html || '（无匹配）';
      count.textContent = '匹配到 ' + n + ' 处' + (shown.length ? '：' + shown.slice(0, 8).map(function (x) { return JSON.stringify(x); }).join('、') + (n > 8 ? ' …' : '') : '');
    }
    [pat, flags, text].forEach(function (el) { el.addEventListener('input', run); });
    run();
  })();

  /* ---- Base64 编解码（Unicode 安全） ---- */
  (function () {
    var input = $('b64-in'), output = $('b64-out');
    if (!input || !output) return;
    function enc(s) {
      var b = new TextEncoder().encode(s), bin = '';
      for (var i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
      return btoa(bin);
    }
    function dec(s) {
      var bin = atob(s.trim()), b = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(b);
    }
    function ok(v) { output.value = v; output.classList.remove('is-err'); }
    function fail(msg) { output.value = msg; }
    $('b64-enc').addEventListener('click', function () {
      try { ok(enc(input.value)); } catch (e) { fail('编码失败：' + e.message); }
    });
    $('b64-dec').addEventListener('click', function () {
      try { ok(dec(input.value)); }
      catch (e) { fail('解码失败：不是合法的 Base64'); }
    });
    $('b64-copy').addEventListener('click', function () {
      if (output.value && navigator.clipboard) navigator.clipboard.writeText(output.value).catch(function () {});
    });
  })();

  /* ---- 倒计时 / 番茄钟 ---- */
  (function () {
    var tEl = $('pomo-time'), mode = $('pomo-mode'), doneEl = $('pomo-done');
    var startBtn = $('pomo-start'), resetBtn = $('pomo-reset');
    if (!tEl || !startBtn) return;
    var total = 25 * 60, left = total, endAt = 0, running = false, timer = null;
    var done = 0;
    try { done = Number(localStorage.getItem('pomo_done_v1')) || 0; } catch (e) {}
    doneEl.textContent = '今天已完成 ' + done + ' 个番茄 🍅';
    function fmt(s) { return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
    function paint() { tEl.textContent = fmt(left); }
    function beep() {
      try {
        var ac = new (window.AudioContext || window.webkitAudioContext)();
        [0, 260, 520].forEach(function (delay) {
          var o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.frequency.value = 880; g.gain.value = 0.18;
          o.start(ac.currentTime + delay / 1000);
          o.stop(ac.currentTime + delay / 1000 + 0.16);
        });
      } catch (e) { /* 自动播放策略限制时静默 */ }
    }
    function stop() { running = false; clearInterval(timer); startBtn.textContent = '开始'; }
    function tick() {
      left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      paint();
      if (left <= 0) {
        stop();
        if (total === 25 * 60) {
          done++;
          try { localStorage.setItem('pomo_done_v1', done); } catch (e) {}
          doneEl.textContent = '今天已完成 ' + done + ' 个番茄 🍅';
          mode.textContent = '太棒了，休息一下 🎉';
        } else mode.textContent = '时间到 ⏰';
        beep();
      }
    }
    startBtn.addEventListener('click', function () {
      if (running) { left = Math.max(0, Math.round((endAt - Date.now()) / 1000)); stop(); mode.textContent = '已暂停'; return; }
      endAt = Date.now() + left * 1000;
      running = true;
      startBtn.textContent = '暂停';
      timer = setInterval(tick, 250);
    });
    resetBtn.addEventListener('click', function () { stop(); left = total; paint(); mode.textContent = '专注 ' + (total / 60) + ' 分钟，开始后别分心'; });
    Array.prototype.forEach.call(document.querySelectorAll('#tool-pomo [data-min]'), function (b) {
      b.addEventListener('click', function () {
        stop();
        total = Number(b.getAttribute('data-min')) * 60;
        left = total;
        paint();
        mode.textContent = (total === 25 * 60 ? '专注 ' : total === 5 * 60 ? '休息 ' : '') + (total / 60) + ' 分钟，开始后别分心';
      });
    });
    paint();
  })();
})();
