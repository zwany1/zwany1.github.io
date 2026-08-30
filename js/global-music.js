/* 全站音乐播放器
 * 由首页音乐 App 整体搬移而来，所有页面加载：
 * - 首页：音乐组件 / 音乐 App 窗口照常工作（DOM 缺失时自动降级）
 * - 其他页面：右下角 mini 播放条；播放状态存 localStorage，翻页自动续播
 * 歌单数据来自免费 Meting API（网易云），播放失败自动切下一首
 */
(function () {
    var $ = function (id) { return document.getElementById(id) };
    var CHARTS = [
        { id: '3778678', name: '热歌榜', desc: '每天更新' },
        { id: '3779629', name: '新歌榜', desc: '抢先听' },
        { id: '19723756', name: '飙升榜', desc: '热度飙升' },
        { id: '2884035', name: '原创榜', desc: '华语原创' }
    ];
    var API = 'https://api.injahow.cn/meting/?server=netease&type=playlist&id=';
    var IS_HOME = document.body.classList.contains('home');

    var widget = {
        name: $('music-name'), artist: $('music-artist'), cover: $('music-cover'),
        bar: $('music-bar'), toggle: $('music-toggle'), next: $('music-next'),
        card: document.querySelector('.ios-widget--music')
    };
    var app = {
        root: $('music-app'), mask: $('music-app-mask'), close: $('music-app-close'),
        nav: $('music-nav'),
        views: { discover: $('mview-discover'), chart: $('mview-chart'), recent: $('mview-recent'), favs: $('mview-favs') },
        grid: $('music-chart-grid'), banner: $('music-banner'), bannerPlay: $('music-banner-play'),
        back: $('music-back'), songs: $('music-songs'), listTitle: $('music-list-title'),
        recentSongs: $('music-recent-songs'), favSongs: $('music-fav-songs'),
        cover: $('mp-cover'), name: $('mp-name'), artist: $('mp-artist'),
        bar: $('mp-bar'), progress: $('mp-progress'), time: $('mp-time'), fav: $('mp-fav'),
        play: $('mp-play'), prev: $('mp-prev'), next: $('mp-next')
    };
    var dockMusic = document.querySelector('.ios-app[data-action="music"]');

    var charts = {};
    var queue = [], cur = 0, playing = false;
    var activeChartId = '3778678';

    var audio = new Audio();
    audio.preload = 'none';

    // ---------- 滚动歌词（仅首页音乐窗口内） ----------
    var lyrBtn = $('mp-lyric'), lyrPanel = $('music-lyrics'),
        lyrList = $('lyric-list'), lyrSong = $('lyric-song'), lyrClose = $('lyric-close');
    var lrcCache = {}, lrcLines = [], lrcIdx = -1, lrcKey = '';
    function parseLrc(text) {
        var out = [];
        String(text || '').split(/\r?\n/).forEach(function (line) {
            var stamps = line.match(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g);
            if (!stamps) return;
            var txt = line.replace(/\[[^\]]*\]/g, '').trim();
            if (!txt) return;
            stamps.forEach(function (s) {
                var m = s.match(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/);
                var t = (+m[1]) * 60 + (+m[2]) + (m[3] ? +('0.' + m[3]) : 0);
                out.push({ t: t, x: txt });
            });
        });
        return out.sort(function (a, b) { return a.t - b.t });
    }
    function renderLrc(lines) {
        if (!lyrList) return;
        lrcLines = lines; lrcIdx = -1;
        lyrList.textContent = '';
        if (!lines.length) { lyrList.innerHTML = '<div class="music-loading">暂无歌词，纯音乐请欣赏</div>'; return; }
        var frag = document.createDocumentFragment();
        lines.forEach(function (L) {
            var d = document.createElement('div');
            d.className = 'lrc-line';
            d.textContent = L.x;
            d.setAttribute('data-t', L.t);
            frag.appendChild(d);
        });
        lyrList.appendChild(frag);
        lrcSync();
    }
    function loadLyrics(t) {
        if (!lyrPanel || !lyrList || !lyrSong) return;
        var key = trackId(t);
        lyrSong.textContent = t.name + ' · ' + t.artist;
        if (lrcKey === key && lrcLines.length) { lrcSync(); return; }
        lrcKey = key; lrcLines = []; lrcIdx = -1;
        if (!t.lrc) { lyrList.innerHTML = '<div class="music-loading">暂无歌词</div>'; return; }
        lyrList.innerHTML = '<div class="music-loading">歌词加载中…</div>';
        if (lrcCache[key]) { renderLrc(lrcCache[key]); return; }
        fetch(t.lrc).then(function (r) { return r.ok ? r.text() : ''; }).then(function (txt) {
            var lines = parseLrc(txt);
            lrcCache[key] = lines;
            if (lrcKey === key) renderLrc(lines);
        }).catch(function () {
            if (lrcKey === key) lyrList.innerHTML = '<div class="music-loading">歌词加载失败</div>';
        });
    }
    function lrcSync() {
        if (!lyrList) return;
        var t = audio.currentTime || 0, i = 0;
        while (i < lrcLines.length && lrcLines[i].t <= t) i++;
        i = i - 1;
        if (i === lrcIdx) return;
        lrcIdx = i;
        var rows = lyrList.children;
        for (var k = 0; k < rows.length; k++) rows[k].classList.toggle('active', k === i);
        if (i >= 0 && rows[i]) {
            var target = rows[i].offsetTop - lyrList.clientHeight / 2 + rows[i].clientHeight / 2;
            lyrList.scrollTop = Math.max(0, target);
        }
    }
    if (lyrBtn) lyrBtn.addEventListener('click', function () {
        lyrPanel.hidden = !lyrPanel.hidden;
        if (!lyrPanel.hidden && queue[cur]) loadLyrics(queue[cur]);
    });
    if (lyrClose) lyrClose.addEventListener('click', function () { lyrPanel.hidden = true; });
    if (lyrList) lyrList.addEventListener('click', function (e) {
        var line = e.target.closest('.lrc-line');
        if (!line || !audio.duration) return;
        var t = parseFloat(line.getAttribute('data-t'));
        if (isFinite(t)) { audio.currentTime = t; if (!playing) togglePlay(); }
    });

    function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;') }
    function trackId(t) { var m = (t.url || '').match(/id=(\d+)/); return m ? m[1] : t.name }
    function readLS(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d } catch (e) { return d } }
    function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }
    function pad2(s) { s = Math.floor(s || 0); return (s < 10 ? '0' : '') + s + '' }

    // ---------- mini 播放条（非首页页面） ----------
    var mini = { root: null };
    function ensureMini() {
        if (IS_HOME) return null;
        if (mini.root) return mini;
        var el = document.createElement('div');
        el.id = 'global-mini-player';
        el.hidden = true;
        el.innerHTML = '<img id="gmp-cover" alt="">'
            + '<div class="gmp-info"><b id="gmp-name"></b><span id="gmp-artist"></span></div>'
            + '<button id="gmp-toggle" title="播放/暂停"><i class="fas fa-play"></i></button>'
            + '<button id="gmp-next" title="下一首"><i class="fas fa-forward-step"></i></button>'
            + '<button id="gmp-close" title="停止并关闭"><i class="fas fa-xmark"></i></button>'
            + '<span class="gmp-bar"><span id="gmp-bar-fill"></span></span>';
        document.body.appendChild(el);
        mini.root = el;
        mini.cover = el.querySelector('#gmp-cover');
        mini.name = el.querySelector('#gmp-name');
        mini.artist = el.querySelector('#gmp-artist');
        mini.toggle = el.querySelector('#gmp-toggle');
        mini.next = el.querySelector('#gmp-next');
        mini.close = el.querySelector('#gmp-close');
        mini.bar = el.querySelector('#gmp-bar-fill');
        mini.toggle.addEventListener('click', function () { togglePlay() });
        mini.next.addEventListener('click', function () { next() });
        mini.close.addEventListener('click', function () {
            audio.pause();
            playing = false;
            queue = []; cur = 0;
            try { localStorage.removeItem('global_music_v1'); } catch (e) {}
            mini.root.hidden = true;
        });
        return mini;
    }
    function updateMini(t) {
        var m = ensureMini();
        if (!m) return;
        m.root.hidden = false;
        m.name.textContent = t.name;
        m.artist.textContent = t.artist;
        if (t.pic) m.cover.src = t.pic;
    }

    // ---------- 播放核心 ----------
    function setIcons() {
        var i = playing ? 'fas fa-pause' : 'fas fa-play';
        if (widget.toggle) widget.toggle.innerHTML = '<i class="' + i + '"></i>';
        if (app.play) app.play.innerHTML = '<i class="' + i + '"></i>';
        if (mini.toggle) mini.toggle.innerHTML = '<i class="' + i + '"></i>';
    }
    function highlight() {
        if (!app.songs) return;
        var tid = queue[cur] ? trackId(queue[cur]) : null;
        [app.songs, app.recentSongs, app.favSongs].forEach(function (ul) {
            if (!ul) return;
            ul.querySelectorAll('.song-row').forEach(function (row) {
                row.classList.toggle('playing', row.getAttribute('data-tid') === tid);
            });
        });
    }
    function updateTrackUI(t) {
        if (widget.name) widget.name.textContent = t.name;
        if (widget.artist) widget.artist.textContent = t.artist;
        if (app.name) app.name.textContent = t.name;
        if (app.artist) app.artist.textContent = t.artist;
        if (t.pic) {
            if (widget.cover) widget.cover.src = t.pic;
            if (app.cover) app.cover.src = t.pic;
        }
        if (widget.bar) widget.bar.style.width = '0%';
        if (app.bar) app.bar.style.width = '0%';
        if (app.time) app.time.textContent = '00:00 / 00:00';
        updateFavIcon(t);
        if (lyrPanel && !lyrPanel.hidden) loadLyrics(t);
        highlight();
        updateMini(t);
    }
    function saveRecent(t) {
        var rec = getRecent().filter(function (x) { return trackId(x) !== trackId(t) });
        rec.unshift(t);
        writeLS('music_recent', rec.slice(0, 30));
    }
    function playFrom(tracks, i, opts) {
        if (!tracks || !tracks.length) return;
        opts = opts || {};
        queue = tracks;
        cur = (i + queue.length) % queue.length;
        var t = queue[cur];
        audio.src = t.url;
        updateTrackUI(t);
        saveRecent(t);
        playing = true;
        setIcons();
        audio.play().catch(function () {
            if (opts.resume) { playing = false; setIcons(); }
            else next();
        });
    }
    function togglePlay() {
        if (!queue.length) return;
        if (playing) { audio.pause(); playing = false; } else { playing = true; audio.play().catch(function () {}); }
        setIcons();
    }
    function next() { playFrom(queue, cur + 1) }
    function prev() { playFrom(queue, cur - 1) }

    // ---------- 跨页续播状态 ----------
    var lastSave = 0;
    function saveState(force) {
        if (!queue.length || !queue[cur]) return;
        var now = Date.now();
        if (!force && now - lastSave < 3000) return;
        lastSave = now;
        writeLS('global_music_v1', {
            tid: trackId(queue[cur]), chartId: activeChartId,
            time: audio.currentTime || 0, playing: playing
        });
    }
    window.addEventListener('pagehide', function () { saveState(true) });
    (function restore() {
        var s = readLS('global_music_v1', null);
        if (!s || !s.tid || !s.chartId) return;
        loadChart(s.chartId, function (tracks) {
            if (!tracks.length) return;
            var idx = -1;
            tracks.forEach(function (t, i) { if (idx < 0 && trackId(t) === s.tid) idx = i });
            if (idx < 0) return;
            queue = tracks; cur = idx;
            activeChartId = s.chartId;
            var t = queue[cur];
            audio.src = t.url;
            updateTrackUI(t);
            audio.addEventListener('loadedmetadata', function () {
                try { if (s.time > 1 && isFinite(audio.duration)) audio.currentTime = Math.min(s.time, Math.max(1, audio.duration - 2)); } catch (e) {}
            }, { once: true });
            if (s.playing) {
                playing = true;
                audio.play().catch(function () { playing = false; });
            } else playing = false;
            setIcons();
            saveState(true);
        });
    })();

    // ---------- 数据 ----------
    function loadChart(id, done) {
        if (charts[id]) { done(charts[id]); return; }
        fetch(API + id).then(function (r) { return r.json(); }).then(function (list) {
            charts[id] = (list || []).filter(function (t) { return t.url; });
            done(charts[id]);
        }).catch(function () { done([]); });
    }
    function getRecent() { return readLS('music_recent', []) }
    function getFavMap() { return readLS('music_favs', {}) }
    function favList() { var m = getFavMap(); return Object.keys(m).map(function (k) { return m[k] }) }

    // ---------- 视图（仅首页音乐窗口） ----------
    function showView(name) {
        if (!app.views.discover) return;
        Object.keys(app.views).forEach(function (k) { if (app.views[k]) app.views[k].hidden = (k !== name) });
        if (app.nav) app.nav.querySelectorAll('li').forEach(function (li) {
            li.classList.toggle('active', li.getAttribute('data-view') === name ||
                (name === 'chart' && li.getAttribute('data-view') === 'discover'));
        });
    }
    function renderDiscover() {
        if (!app.grid) return;
        if (app.grid.children.length) { showView('discover'); return; }
        CHARTS.forEach(function (c) {
            loadChart(c.id, function (tracks) {
                if (!tracks.length) return;
                var card = document.createElement('a');
                card.className = 'playlist-card';
                card.innerHTML = '<span class="playlist-card__cover" style="background-image:url(&quot;' + tracks[0].pic + '&quot;)">'
                    + '<i class="fas fa-play playlist-card__play"></i><span class="playlist-card__count"><i class="far fa-clock fa-fw"></i> ' + c.desc + '</span></span>'
                    + '<b class="playlist-card__name">' + c.name + '</b>'
                    + '<span class="playlist-card__desc">' + tracks.length + '首 · ' + c.desc + '</span>';
                card.addEventListener('click', function () { openChart(c.id, c.name) });
                app.grid.appendChild(card);
            });
        });
        loadChart('3778678', function (tracks) {
            if (tracks.length && app.banner) app.banner.style.backgroundImage = 'url(&quot;' + tracks[0].pic + '&quot;)'.replace(/&quot;/g, '"');
        });
    }
    function songRow(t, i) {
        var tid = trackId(t);
        var isCur = queue[cur] && tid === trackId(queue[cur]);
        return '<li class="song-row' + (isCur ? ' playing' : '') + '" data-i="' + i + '" data-tid="' + tid + '">'
            + '<span class="song-row__idx">' + (i + 1) + '</span>'
            + '<span class="song-row__name">' + esc(t.name) + '</span>'
            + '<span class="song-row__artist">' + esc(t.artist) + '</span></li>';
    }
    function openChart(id, name) {
        activeChartId = id;
        showView('chart');
        app.listTitle.textContent = name;
        app.songs.innerHTML = '<li class="music-loading">加载中…</li>';
        loadChart(id, function (tracks) {
            var html = '';
            tracks.forEach(function (t, i) { html += songRow(t, i) });
            app.songs.innerHTML = html || '<li class="music-loading">暂无歌曲</li>';
            highlight();
        });
    }
    function renderRecent() {
        if (!app.recentSongs) return;
        var rec = getRecent();
        if (!rec.length) { app.recentSongs.innerHTML = '<li class="music-loading">还没有播放记录，去发现页听听吧</li>'; return; }
        var html = '';
        rec.forEach(function (t, i) { html += songRow(t, i) });
        app.recentSongs.innerHTML = html;
        highlight();
    }
    function renderFavs() {
        if (!app.favSongs) return;
        var fl = favList();
        if (!fl.length) { app.favSongs.innerHTML = '<li class="music-loading">点播放条上的 ♥ 收藏喜欢的歌</li>'; return; }
        var html = '';
        fl.forEach(function (t, i) { html += songRow(t, i) });
        app.favSongs.innerHTML = html;
        highlight();
    }

    // 列表点击
    if (app.songs) app.songs.addEventListener('click', function (e) {
        var row = e.target.closest('.song-row');
        if (!row) return;
        var i = Number(row.getAttribute('data-i'));
        loadChart(activeChartId, function (tracks) {
            if (queue[cur] && trackId(queue[cur]) === trackId(tracks[i])) togglePlay();
            else playFrom(tracks, i);
        });
    });
    if (app.recentSongs) app.recentSongs.addEventListener('click', function (e) {
        var row = e.target.closest('.song-row');
        if (!row) return;
        playFrom(getRecent(), Number(row.getAttribute('data-i')));
    });
    if (app.favSongs) app.favSongs.addEventListener('click', function (e) {
        var row = e.target.closest('.song-row');
        if (!row) return;
        playFrom(favList(), Number(row.getAttribute('data-i')));
    });

    // ---------- 收藏 ----------
    function updateFavIcon(t) {
        if (!app.fav) return;
        var liked = !!getFavMap()[trackId(t)];
        app.fav.innerHTML = liked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        app.fav.classList.toggle('liked', liked);
    }
    if (app.fav) app.fav.addEventListener('click', function () {
        var t = queue[cur];
        if (!t) return;
        var m = getFavMap();
        if (m[trackId(t)]) delete m[trackId(t)]; else m[trackId(t)] = t;
        writeLS('music_favs', m);
        updateFavIcon(t);
    });

    // ---------- 弹窗与导航（仅首页） ----------
    function exitMusic() {
        audio.pause();
        playing = false;
        setIcons();
        if (dockMusic) dockMusic.classList.remove('is-running');
        if (app.root) app.root.hidden = true;
        if (window.iosOpenApps) delete window.iosOpenApps.music;
        try { localStorage.removeItem('global_music_v1'); } catch (e) {}
    }
    function openApp() {
        if (!app.root) return;
        app.root.hidden = false;
        if (dockMusic) dockMusic.classList.add('is-running');
        window.iosOpenApps = window.iosOpenApps || {};
        window.iosOpenApps.music = {
            name: '音乐', icon: 'fas fa-music', color: 'linear-gradient(135deg,#fc5c7d,#e6194b)',
            focus: openApp, close: exitMusic
        };
        renderDiscover();
        showView('discover');
    }
    if (app.mask) app.mask.addEventListener('click', function () { app.root.hidden = true });
    if (app.close) app.close.addEventListener('click', function () { app.root.hidden = true });
    if (app.back) app.back.addEventListener('click', function () { showView('discover') });
    if (app.nav) app.nav.addEventListener('click', function (e) {
        var li = e.target.closest('li[data-view]');
        if (!li) return;
        var v = li.getAttribute('data-view');
        if (v === 'discover') { renderDiscover(); showView('discover') }
        if (v === 'recent') { renderRecent(); showView('recent') }
        if (v === 'favs') { renderFavs(); showView('favs') }
    });

    if (widget.card) widget.card.addEventListener('click', function (e) {
        if (e.target.closest('.music-btn')) return;
        openApp();
    });
    if (widget.toggle) widget.toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!queue.length) { openApp(); return; }
        togglePlay();
    });
    if (widget.next) widget.next.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!queue.length) { openApp(); return; }
        next();
    });
    if (dockMusic) dockMusic.addEventListener('click', function (e) { e.preventDefault(); openApp() });
    if (dockMusic) dockMusic.addEventListener('contextmenu', function (e) {
        window.dockMenu.show(e, '音乐', [{ label: '关闭音乐', danger: true, fn: exitMusic }]);
    });

    if (app.bannerPlay) app.bannerPlay.addEventListener('click', function () {
        loadChart('3778678', function (tracks) {
            playFrom(tracks, Math.floor(Math.random() * tracks.length));
        });
    });
    if (app.play) app.play.addEventListener('click', togglePlay);
    if (app.next) app.next.addEventListener('click', next);
    if (app.prev) app.prev.addEventListener('click', prev);

    // 进度：更新 + 点击跳转
    audio.addEventListener('timeupdate', function () {
        if (!audio.duration) return;
        var p = (audio.currentTime / audio.duration) * 100 + '%';
        if (widget.bar) widget.bar.style.width = p;
        if (app.bar) app.bar.style.width = p;
        if (app.time) app.time.textContent = pad2(audio.currentTime / 60) + ':' + pad2(audio.currentTime % 60) + ' / ' + pad2(audio.duration / 60) + ':' + pad2(audio.duration % 60);
        if (mini.bar) mini.bar.style.width = p;
        if (!lyrPanel || lyrPanel.hidden) { /* 省流 */ } else lrcSync();
        saveState();
    });
    if (app.progress) app.progress.addEventListener('click', function (e) {
        if (!audio.duration) return;
        var rect = app.progress.getBoundingClientRect();
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
    audio.addEventListener('ended', function () { next() });
    audio.addEventListener('error', function () { if (queue.length && audio.src) next() });
    setIcons();
})();
