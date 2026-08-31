/* 文章页增强：听全文（本地 TTS）/ 分享海报 / 点赞 / 字号调节
 * 全部纯前端：TTS 用浏览器 Web Speech API；海报用 canvas 本地生成；
 * 点赞用 Abacus 免费计数（与 Post Views 同一命名空间约定）。
 */
(function () {
    var $ = function (id) { return document.getElementById(id); };
    var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var NS = isLocal ? 'zwany1-github-io-dev' : 'zwany1-github-io';
    var pathKey = location.pathname.replace(/[^a-zA-Z0-9_-]/g, '-');

    /* ---------- 听全文（Web Speech API） ---------- */
    (function () {
        var btn = $('pe-tts'), art = document.getElementById('article-container');
        if (!btn || !art || !('speechSynthesis' in window)) { if (btn) btn.style.display = 'none'; return; }
        var speaking = false;
        function setUI(on) {
            speaking = on;
            btn.innerHTML = on ? '<i class="fas fa-stop"></i> 停止朗读' : '<i class="fas fa-volume-high"></i> 听全文';
        }
        function stop() {
            speechSynthesis.cancel();
            setUI(false);
        }
        btn.addEventListener('click', function () {
            if (speaking) { stop(); return; }
            var text = (art.innerText || '').replace(/\s+/g, ' ').trim();
            if (!text) return;
            // 按句切块排队，避免超长文本被引擎截断
            var chunks = text.match(/[^。！？.!?\n]{1,120}[。！？.!?]?/g) || [text];
            var voice = null;
            speechSynthesis.getVoices().forEach(function (v) {
                if (!voice && /^zh(\b|_|-)/i.test(v.lang)) voice = v;
            });
            chunks.forEach(function (c) {
                var u = new SpeechSynthesisUtterance(c);
                u.lang = 'zh-CN';
                if (voice) u.voice = voice;
                u.rate = 1;
                speechSynthesis.speak(u);
            });
            speechSynthesis.onend = function () { setUI(false); };
            setUI(true);
        });
        window.addEventListener('beforeunload', function () { if (speaking) speechSynthesis.cancel(); });
    })();

    /* ---------- 点赞（Abacus） ---------- */
    (function () {
        var btn = $('pe-like'), count = $('pe-like-count');
        if (!btn || !count) return;
        var likedKey = 'pe_liked' + location.pathname;
        var liked = false;
        try { liked = localStorage.getItem(likedKey) === '1'; } catch (e) {}
        function paint(n) { count.textContent = (n == null ? '—' : n) + (liked ? ' 已赞' : ''); }
        btn.classList.toggle('liked', liked);
        fetch('https://abacus.jasoncameron.dev/get/' + NS + '/like' + pathKey)
            .then(function (r) { return r.ok ? r.json() : Promise.reject(0); })
            .then(function (d) { if (d && typeof d.value === 'number') paint(d.value); })
            .catch(function () { paint(null); });
        btn.addEventListener('click', function () {
            if (liked) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); return; }
            fetch('https://abacus.jasoncameron.dev/hit/' + NS + '/like' + pathKey)
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    liked = true;
                    try { localStorage.setItem(likedKey, '1'); } catch (e) {}
                    btn.classList.add('liked');
                    if (d && typeof d.value === 'number') paint(d.value); else paint('已赞');
                    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
                })
                .catch(function () { count.textContent = '网络不佳'; });
        });
    })();

    /* ---------- 字号调节 ---------- */
    (function () {
        var minus = $('pe-font-minus'), plus = $('pe-font-plus');
        var art = document.getElementById('article-container');
        if (!minus || !art) return;
        var STEPS = [0.85, 0.92, 1, 1.08, 1.16, 1.25];
        var KEY = 'post_font_step_v1';
        var idx = 2;
        try { idx = Math.min(STEPS.length - 1, Math.max(0, Number(localStorage.getItem(KEY)) || 0)); } catch (e) {}
        function apply() {
            art.style.fontSize = (STEPS[idx] * 100) + '%';
            try { localStorage.setItem(KEY, idx); } catch (e) {}
        }
        apply();
        minus.addEventListener('click', function () { if (idx > 0) { idx--; apply(); } });
        plus.addEventListener('click', function () { if (idx < STEPS.length - 1) { idx++; apply(); } });
    })();

    /* ---------- 分享海报（canvas 本地生成） ---------- */
    (function () {
        var btn = $('pe-poster');
        if (!btn) return;
        var title = (document.querySelector('.post-title') || {}).textContent
            || document.title || '';
        var ogMeta = document.querySelector('meta[property="og:image"]');
        var defaultCover = location.origin + '/assets/images/avatar.jpg';
        var meta = document.querySelector('.post-meta-date time');
        var dateStr = meta ? (meta.getAttribute('datetime') || '').slice(0, 10) : '';
        var url = location.origin + location.pathname;

        /* 保底取图：文章首图真实URL(排除懒加载占位图) → og:image(cover/默认头像) → 默认头像 */
        function resolveCover(cb) {
            var art = document.getElementById('article-container');
            var candidates = [];
            var artImgs = art ? art.querySelectorAll('img') : [];
            for (var i = 0; i < artImgs.length; i++) {
                var im = artImgs[i];
                var real = im.getAttribute('data-src') || im.getAttribute('data-lazy-src') || im.src;
                if (real && !/^data:/.test(real) && !/\.gif(\?|$)/i.test(real)) candidates.push(real);
            }
            if (ogMeta && ogMeta.content) candidates.push(ogMeta.content);
            var last = candidates[candidates.length - 1];
            if (last !== defaultCover) candidates.push(defaultCover);
            var idx = 0;
            function next() {
                if (idx >= candidates.length) { cb(null); return; }
                var src = candidates[idx++];
                var probe = new Image();
                probe.crossOrigin = 'anonymous';
                probe.onload = function () { cb(probe); };
                probe.onerror = next;
                probe.src = src;
            }
            next();
        }

        function wrapText(ctx, text, maxWidth) {
            var lines = [];
            var line = '';
            for (var i = 0; i < text.length; i++) {
                var test = line + text[i];
                if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = text[i]; }
                else line = test;
            }
            if (line) lines.push(line);
            return lines;
        }
        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }
        function draw(cover, qrImg) {
            var W = 900, H = 1200;
            var c = document.createElement('canvas');
            c.width = W; c.height = H;
            var ctx = c.getContext('2d');
            var g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, '#e8f4fd'); g.addColorStop(0.5, '#dcedf9'); g.addColorStop(1, '#fbe4ec');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            // 卡片
            ctx.fillStyle = 'rgba(255,255,255,.92)';
            roundRect(ctx, 40, 40, W - 80, H - 80, 28);
            ctx.fill();
            // 封面（resolveCover 已保证有图，兜底再画纯色块）
            var drawY = 40;
            if (cover && cover.naturalWidth) {
                try {
                    var cw = W - 80, ch = 420;
                    var ratio = Math.max(cw / cover.naturalWidth, ch / cover.naturalHeight);
                    var sw = cw / ratio, sh = ch / ratio;
                    var sx = (cover.naturalWidth - sw) / 2, sy = (cover.naturalHeight - sh) / 2;
                    ctx.save();
                    roundRect(ctx, 40, 40, cw, ch, 24);
                    ctx.clip();
                    ctx.drawImage(cover, sx, sy, sw, sh, 40, 40, cw, ch);
                    ctx.restore();
                    drawY = 40 + ch + 36;
                } catch (e) { /* 忽略绘制失败 */ }
            } else {
                ctx.save();
                var grad = ctx.createLinearGradient(0, 40, 0, 40 + 420);
                grad.addColorStop(0, '#4c8bf5'); grad.addColorStop(1, '#9a6cf5');
                ctx.fillStyle = grad;
                roundRect(ctx, 40, 40, W - 80, 420, 24);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 42px "PingFang SC", "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('朱的小屋', W / 2, 40 + 420 / 2 + 14);
                ctx.restore();
                drawY = 40 + 420 + 36;
            }
            // 标题
            ctx.fillStyle = '#1f2d3d';
            ctx.font = 'bold 46px "PingFang SC", "Microsoft YaHei", sans-serif';
            var lines = wrapText(ctx, title.trim(), W - 160).slice(0, 3);
            lines.forEach(function (ln, i) { ctx.fillText(ln, 80, drawY + 10 + i * 62); });
            drawY += 10 + lines.length * 62 + 16;
            // 摘要
            var excerpt = '';
            var art = document.getElementById('article-container');
            if (art) {
                var p = art.querySelector('p');
                if (p) excerpt = p.textContent.trim();
            }
            if (excerpt) {
                ctx.fillStyle = '#5c6b7a';
                ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
                wrapText(ctx, excerpt, W - 160).slice(0, 3).forEach(function (ln, i) {
                    ctx.fillText(ln, 80, drawY + i * 42);
                });
                drawY += 3 * 42 + 10;
            }
            // 底部信息
            ctx.fillStyle = '#8b98a5';
            ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.fillText((dateStr ? dateStr + ' · ' : '') + '朱的小屋', 80, H - 128);
            if (qrImg) {
                ctx.drawImage(qrImg, W - 260, H - 260, 180, 180);
                ctx.fillStyle = '#5c6b7a';
                ctx.font = '22px sans-serif';
                ctx.fillText('扫码阅读', W - 215, H - 60);
            } else {
                ctx.fillStyle = '#49b1f5';
                ctx.font = '24px sans-serif';
                ctx.fillText(url.replace(/^https?:\/\//, ''), 80, H - 88);
            }
            var dataUrl = c.toDataURL('image/png');
            openModal(dataUrl);
        }
        function openModal(dataUrl) {
            var mask = document.createElement('div');
            mask.className = 'pe-poster-mask';
            mask.innerHTML = '<div class="pe-poster">'
                + '<button class="pe-poster__close" title="关闭"><i class="fas fa-xmark"></i></button>'
                + '<img alt="分享海报">'
                + '<div class="pe-poster__foot"><a class="pe-poster__save" download="share.png">保存图片</a><span>或长按/右键图片保存</span></div>'
                + '</div>';
            document.body.appendChild(mask);
            mask.querySelector('img').src = dataUrl;
            mask.querySelector('.pe-poster__save').href = dataUrl;
            function close() { mask.remove(); }
            mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
            mask.querySelector('.pe-poster__close').addEventListener('click', close);
        }
        btn.addEventListener('click', function () {
            btn.disabled = true;
            var state = { cover: null, qr: null, coverDone: false, qrDone: false };
            function finish() {
                if (state.coverDone && state.qrDone) {
                    clearTimeout(timer);
                    draw(state.cover, state.qr);
                }
            }
            var timer = setTimeout(function () {
                if (!state.qrDone) { state.qrDone = true; state.qr = null; finish(); }
            }, 4000);
            resolveCover(function (c) {
                state.cover = c;
                state.coverDone = true;
                finish();
            });
            var qr = new Image();
            qr.crossOrigin = 'anonymous';
            qr.onload = function () { if (!state.qrDone) { state.qrDone = true; state.qr = qr; finish(); } };
            qr.onerror = function () { if (!state.qrDone) { state.qrDone = true; state.qr = null; finish(); } };
            qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(url);
        });
    })();
})();
