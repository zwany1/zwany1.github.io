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
})();
