/* butterfly-theme replica: behaviors (nav/rightside/darkmode/aside/sidebar/lazyload/typed/date) */
(function () {
  var btf = window.btf = window.btf || {};
  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* nav show on scroll */
  var nav = $('#nav');
  var header = $('#page-header');
  var scrollOffset = header ? header.offsetHeight - 64 : 200;
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (nav) { if (y > 64) nav.classList.add('show'); else nav.classList.remove('show'); }
    var rs = $('#rightside');
    if (rs) {
      var showAt = header ? (header.classList.contains('full_page') ? header.offsetHeight - 100 : 200) : 200;
      if (y > showAt) { rs.style.right = '16px'; rs.style.opacity = '1'; }
      else { rs.style.right = '-38px'; rs.style.opacity = '0'; }
    }
    /* go-up scroll percent */
    var goUp = $('#go-up');
    if (goUp) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docH > 0 ? Math.min(100, Math.round(y / docH * 100)) : 0;
      var sp = goUp.querySelector('.scroll-percent');
      if (sp) sp.textContent = pct + '%';
      if (pct > 5) goUp.classList.add('show-percent'); else goUp.classList.remove('show-percent');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);

  /* dark mode toggle + persistence */
  var darkBtn = $('#darkmode');
  function getStore(k) { try { var s = localStorage.getItem(k); if (!s) return; s = JSON.parse(s); if (s.expiry && Date.now() > s.expiry) { localStorage.removeItem(k); return; } return s.value; } catch (e) { return; } }
  function setStore(k, v) { try { localStorage.setItem(k, JSON.stringify({ value: v })); } catch (e) {} }
  function isDark() { return document.documentElement.dataset.theme === 'dark'; }
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#0d0d0d' : '#ffffff');
    setStore('theme', dark ? 'dark' : 'light');
  }
  if (darkBtn) darkBtn.addEventListener('click', function () { applyTheme(!isDark()); });

  /* hide aside toggle + persistence */
  var hideBtn = $('#hide-aside-btn');
  function applyAside(hide) {
    document.documentElement.classList.toggle('hide-aside', hide);
    setStore('aside-status', hide ? 'hide' : 'show');
  }
  if (hideBtn) hideBtn.addEventListener('click', function () { applyAside(!document.documentElement.classList.contains('hide-aside')); });

  /* rightside config show/hide toggle */
  var cfgBtn = $('#rightside-config');
  if (cfgBtn) {
    cfgBtn.addEventListener('click', function () {
      var rs = $('#rightside');
      if (rs) rs.classList.toggle('read-mode');
    });
  }

  /* go-up */
  var goUp = $('#go-up');
  if (goUp) goUp.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* mobile sidebar toggle */
  var toggleMenu = $('#toggle-menu');
  var sidebar = $('#sidebar');
  var menuMask = $('#menu-mask');
  function openSidebar() { if (sidebar) sidebar.classList.add('open'); if (menuMask) menuMask.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeSidebar() { if (sidebar) sidebar.classList.remove('open'); if (menuMask) menuMask.classList.remove('open'); document.body.style.overflow = ''; }
  if (toggleMenu) toggleMenu.addEventListener('click', openSidebar);
  if (menuMask) menuMask.addEventListener('click', closeSidebar);
  /* close mobile menu on nav link click */
  $all('#sidebar-menus .site-page').forEach(function (a) { a.addEventListener('click', closeSidebar); });

  /* scroll-down arrow -> scroll to content */
  var scrollDown = $('#scroll-down');
  if (scrollDown) scrollDown.addEventListener('click', function () {
    var c = $('#content-inner');
    if (c) window.scrollTo({ top: c.offsetTop - 64, behavior: 'smooth' });
  });

  /* last-push-date formatting */
  var lpd = $('#last-push-date');
  if (lpd) {
    var raw = lpd.getAttribute('data-lastPushDate');
    if (raw) {
      var d = new Date(raw);
      if (!isNaN(d)) lpd.textContent = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }
  }

  /* fancybox bind for article images */
  if (window.Fancybox) {
    $all('#article-container p > img, #page-content img').forEach(function (img) {
      if (!img.closest('a')) {
        var a = document.createElement('a');
        a.href = img.src; a.setAttribute('data-fancybox', 'default');
        img.parentNode.insertBefore(a, img); a.appendChild(img);
      }
    });
    try { Fancybox.bind('[data-fancybox]'); } catch (e) {}
  }
})();
