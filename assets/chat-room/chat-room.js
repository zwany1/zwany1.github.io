/* ============================================================================
   chat-room.js — 在线聊天室组件（独立可复用，无第三方运行时依赖）
   ----------------------------------------------------------------------------
   架构：
     ChatRoom 内核  ──  统一的 Transport 接口  ──┬─ LocalTransport  (BroadcastChannel)
                                                ├─ MqttTransport   (mqtt.js + 公共 broker)
                                                └─ WsTransport     (自带 WebSocket 服务端)

   Transport 接口约定（实现任一即可，通过 ChatRoom.registerTransport 注册）：
     connect()            开始连接
     send(msg)            发送一条消息，返回 boolean 表示是否发出
     disconnect()         断开
     由内核注入的回调：
     onStatus(status,detail)   status: connecting | online | offline | error
     onMessage(msg)            收到一条消息
     onPresence(list)          在线成员变化，list: [{uid,name}]
     onTyping(name)            有人正在输入
   ========================================================================== */

(function (global) {
    'use strict';

    var VERSION = '1.0.0';
    var MAX_LEN = 1000;
    var EMOJIS = ('😀 😄 😁 😂 😊 😉 😍 🤔 😅 😭 😡 👍 👎 👏 🙏 🎉 ❤️ 🔥 ⭐ ' +
                  '🌹 🌈 ☕ 🍺 🍚 🐶 🐱 🌙 ☀️ 💪 🤝 😴 😎 🤣 🥳 😢 😱 ✅ ❓').split(' ');

    /* ---------------------------------------------------------------- utils */

    function uid(p) {
        return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function linkify(text) {
        return text.replace(/\bhttps?:\/\/[^\s<]+/g, function (url) {
            var clean = url.replace(/[)\].,，。]+$/, '');
            return '<a href="' + clean + '" target="_blank" rel="noopener nofollow">' + clean + '</a>';
        });
    }

    function hash(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
        return h;
    }

    /* 头像用扁平色块（对照设计稿）；名字与头像同一色系但更亮，便于扫读 */
    var AVATAR_COLORS = [
        '#4f6ef7', '#e2703a', '#2fa56a', '#c4553f', '#8b5cf6',
        '#0ea5b7', '#d9a441', '#5b7cfa', '#e0598b', '#4b9ad6'
    ];

    function avatarColor(seed) {
        return AVATAR_COLORS[hash(String(seed || '?')) % AVATAR_COLORS.length];
    }

    function nameColor(seed) {
        return AVATAR_COLORS[(hash(String(seed || '?')) + 3) % AVATAR_COLORS.length];
    }

    /* 整条消息就是一个图片地址时，直接内联渲染成图片 */
    var IMAGE_RE = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif)(\?\S*)?$/i;

    function initial(name) {
        var s = String(name || '?').trim();
        return s ? Array.from(s)[0].toUpperCase() : '?';
    }

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function fmtTime(ts) {
        var d = new Date(ts);
        return pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function fmtDay(ts) {
        var d = new Date(ts), n = new Date();
        var same = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
        var md = (d.getMonth() + 1) + '月' + d.getDate() + '日';
        if (same(d, n)) { return '今天 · ' + md; }
        var y = new Date(n.getTime() - 864e5);
        if (same(d, y)) { return '昨天 · ' + md; }
        return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function lsGet(key, def) {
        try {
            var raw = global.localStorage.getItem(key);
            return raw === null ? def : JSON.parse(raw);
        } catch (e) { return def; }
    }

    function lsSet(key, val) {
        try { global.localStorage.setItem(key, JSON.stringify(val)); return true; }
        catch (e) { return false; }
    }

    function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = function () { cb(null); };
        s.onerror = function () { cb(new Error('脚本加载失败：' + src)); };
        document.head.appendChild(s);
    }

    /* -------------------------------------------------------------- 身份 */

    var TOKEN_KEY = 'wb-chat:token';

    function getToken() {
        var t = lsGet(TOKEN_KEY, '');
        return typeof t === 'string' ? t : '';
    }

    function setToken(t) { lsSet(TOKEN_KEY, t || ''); }

    function b64urlDecode(s) {
        var pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
        var bin = global.atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
        return new global.TextDecoder().decode(bytes);
    }

    /** 只读地解出凭证里的展示信息（不校验签名——展示用够了，真伪由服务端把关） */
    function tokenInfo(t) {
        if (!t || t.indexOf('.') <= 0) { return null; }
        try {
            var p = JSON.parse(b64urlDecode(t.split('.')[0]));
            return (p && p.uid) ? p : null;
        } catch (e) { return null; }
    }

    /** 登录回调把凭证放在 #chat_token=...，读完立刻清掉片段，避免刷新时重复处理 */
    function absorbHash() {
        var h = global.location && global.location.hash;
        if (!h || (h.indexOf('chat_token=') < 0 && h.indexOf('chat_error=') < 0)) { return null; }

        var out = { token: '', error: '' };
        h.replace(/^#/, '').split('&').forEach(function (kv) {
            var i = kv.indexOf('=');
            if (i < 0) { return; }
            var k = decodeURIComponent(kv.slice(0, i));
            var v = decodeURIComponent(kv.slice(i + 1));
            if (k === 'chat_token') { out.token = v; }
            if (k === 'chat_error') { out.error = v; }
        });
        try {
            global.history.replaceState(null, '', global.location.pathname + global.location.search);
        } catch (e) { /* 忽略 */ }
        return out;
    }

    function wsOrigin(wsUrl) {
        if (!wsUrl) { return ''; }
        return String(wsUrl).replace(/^ws/, 'http').replace(/\/[^/]*$/, '');
    }

    var turnstileLoading = null;
    function loadTurnstile(cb) {
        if (global.turnstile) { cb(null); return; }
        if (turnstileLoading) { turnstileLoading.push(cb); return; }
        turnstileLoading = [cb];
        loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', function (err) {
            var q = turnstileLoading || [];
            turnstileLoading = null;
            for (var i = 0; i < q.length; i++) { q[i](err); }
        });
    }

    /** 取一个一次性人机令牌（隐形模式，用户基本无感） */
    function getTurnstileToken(sitekey, cb) {
        if (!sitekey) { cb(''); return; }
        loadTurnstile(function (err) {
            if (err || !global.turnstile) { cb(''); return; }
            var box = document.createElement('div');
            box.style.display = 'none';
            document.body.appendChild(box);
            try {
                var id = global.turnstile.render(box, {
                    sitekey: sitekey,
                    callback: function (t) { cb(t); },
                    'error-callback': function () { cb(''); },
                    'timeout-callback': function () { cb(''); }
                });
                global.turnstile.execute(id);
            } catch (e) { cb(''); }
        });
    }

    /* ----------------------------------------------------------- transports */

    var FACTORIES = {};

    function registerTransport(name, factory) { FACTORIES[name] = factory; }

    /* -- 本机传输：BroadcastChannel + localStorage（零配置、离线可用） ------- */
    function LocalTransport(opts) {
        this.room = opts.room;
        this.limit = opts.limit;
        this.uid = opts.uid;
        this.name = opts.name;
        this.channel = null;
        this.timer = null;
        this.peers = {};
        this.status = 'offline';
    }

    LocalTransport.prototype.connect = function () {
        var self = this;
        this.onStatus('connecting');

        if (typeof global.BroadcastChannel === 'function') {
            this.channel = new global.BroadcastChannel('wb-chat:' + this.room);
            this.channel.onmessage = function (e) { self._dispatch(e.data); };
        } else {
            // 老浏览器兜底：localStorage 的 storage 事件（不触发本页面，效果等价）
            global.addEventListener('storage', function (e) {
                if (e.key === 'wb-chat:bus:' + self.room && e.newValue) {
                    try { self._dispatch(JSON.parse(e.newValue)); } catch (err) { /* 忽略脏数据 */ }
                }
            });
        }

        // 回放本地历史
        var hist = lsGet('wb-chat:hist:' + this.room, []);
        if (Array.isArray(hist)) {
            for (var i = 0; i < hist.length; i++) { this.onMessage(hist[i], true); }
        }

        this._hello();
        this.timer = global.setInterval(function () { self._hello(); }, 10000);
        global.addEventListener('beforeunload', function () { self._bye(); });

        this.onStatus('online', '本机模式（同浏览器多标签互通）');
    };

    LocalTransport.prototype._hello = function () {
        this._post({ t: 'here', uid: this.uid, name: this.name });
        this._prunePeers();
        this.peers[this.uid] = { name: this.name, last: Date.now() };
        this.onPresence(this._list());
    };

    LocalTransport.prototype._bye = function () {
        this._post({ t: 'bye', uid: this.uid, name: this.name });
    };

    LocalTransport.prototype._post = function (payload) {
        if (this.channel) {
            try { this.channel.postMessage(payload); } catch (e) { /* 通道已关闭 */ }
        } else {
            // 兜底通道：写一个带随机后缀的 key，触发其他标签页的 storage 事件
            try {
                global.localStorage.setItem('wb-chat:bus:' + this.room,
                    JSON.stringify(Object.assign({}, payload, { _n: Math.random() })));
            } catch (e) { /* 隐私模式配额不足 */ }
        }
    };

    LocalTransport.prototype._prunePeers = function () {
        var cut = Date.now() - 35000;
        for (var k in this.peers) {
            if (this.peers[k].last < cut) { delete this.peers[k]; }
        }
    };

    LocalTransport.prototype._list = function () {
        var out = [];
        for (var k in this.peers) { out.push({ uid: k, name: this.peers[k].name }); }
        return out;
    };

    LocalTransport.prototype._dispatch = function (p) {
        if (!p || !p.t) { return; }
        if (p.uid === this.uid) { return; }   // 自己的消息已乐观渲染，不重复处理
        if (p.t === 'msg') { this.onMessage(p); return; }
        if (p.t === 'here') {
            this.peers[p.uid] = { name: p.name, last: Date.now() };
            this.onPresence(this._list());
            return;
        }
        if (p.t === 'bye') {
            delete this.peers[p.uid];
            this.onPresence(this._list());
            return;
        }
        if (p.t === 'typing') { this.onTyping(p.name); }
    };

    LocalTransport.prototype.send = function (msg) {
        this._post(Object.assign({ t: 'msg' }, msg));
        return true;
    };

    LocalTransport.prototype.typing = function () {
        this._post({ t: 'typing', uid: this.uid, name: this.name });
    };

    LocalTransport.prototype.disconnect = function () {
        if (this.timer) { global.clearInterval(this.timer); }
        this._bye();
        if (this.channel) { this.channel.close(); }
    };

    /* -- MQTT 传输：mqtt.js + 公共 broker（免注册、真·跨设备群聊） -----------
       主题设计（room 经 slug，可选 key 做不可猜的盐）：
         base/m/<消息id>   消息本体，retain=true  ⇒ 新人一订阅就收到历史
         base/p/<客户端id> 在线状态，retain=true  ⇒ 订阅即得在线名单；
                                           LWT 以空载荷清除，掉线自动下线
         base/t            正在输入，不 retain（瞬时事件，不该进历史）
       ------------------------------------------------------------------------ */
    function MqttTransport(opts) {
        this.room = opts.room;
        this.broker = opts.broker;
        this.key = opts.key || '';
        this.limit = opts.limit || 200;
        this.uid = opts.uid;
        this.name = opts.name;
        this.client = null;
        this.connected = false;
        this.watchdog = null;
        this.timer = null;
        this.pruneTimer = null;
        this.peers = {};       // uid -> { name, ts }，来自 p/# 的 retain 消息
        this.brokerMsgs = {};  // 消息id -> ts，仅统计经 broker 收到的，用于裁剪历史
        this.status = 'offline';

        var slug = String(opts.room).replace(/[^\w\u4e00-\u9fa5-]/g, '') || 'room';
        this.base = 'wbchat/v1/' + slug +
            (this.key ? '-' + hash(this.key + '\u0000' + slug).toString(36) : '');
        this.tMsg = this.base + '/m';
        this.tPresence = this.base + '/p';
        this.tTyping = this.base + '/t';
    }

    MqttTransport.prototype.connect = function () {
        var self = this;
        this.onStatus('connecting', '正在连接实时通道…');

        if (!global.mqtt) {
            loadScript('https://cdn.jsdelivr.net/npm/mqtt@5/dist/mqtt.min.js', function (err) {
                if (err) {
                    self.onStatus('error', '实时通道库加载失败，请检查网络');
                    return;
                }
                self._open();
            });
        } else {
            this._open();
        }
    };

    MqttTransport.prototype._open = function () {
        var self = this;
        if (this.client) { return; }   // 幂等：断线重连交给 mqtt.js 自己处理

        // 遗嘱：意外掉线时由 broker 代发"空载荷 + retain"，把在线状态从名单里抹掉
        var will = { topic: this.tPresence + '/' + this.uid, payload: '', qos: 1, retain: true };

        try {
            this.client = global.mqtt.connect(this.broker, {
                clientId: 'wbchat_' + Math.random().toString(16).slice(2, 10),
                clean: true,
                keepalive: 30,
                connectTimeout: 20000,
                reconnectPeriod: 4000,
                resubscribe: true,
                will: will
            });
        } catch (e) {
            this.onStatus('error', '通道地址无效：' + this.broker);
            return;
        }

        // 看门狗：长时间连不上要给出明确提示，而不是一直停在"连接中"
        this.watchdog = global.setTimeout(function () {
            if (!self.connected) {
                self.onStatus('error', '实时通道连接超时，可改用本机模式，或在参数里更换 broker');
            }
        }, 35000);

        this.client.on('connect', function () {
            self.connected = true;
            global.clearTimeout(self.watchdog);
            // 订阅 m/# 与 p/# 会立刻收到 broker 上的 retain 消息 ⇒ 历史 + 在线名单
            self.client.subscribe([self.tMsg + '/#', self.tPresence + '/#', self.tTyping],
                { qos: 1 }, function (err) {
                    if (err) { self.onStatus('error', '订阅失败：' + (err.message || err)); return; }
                    self.onStatus('online', '已连接公共频道');
                    self._hello();
                    // 心跳：retain 的在线状态也要定期刷新时间戳，
                    // 否则一个"在线但安静"的人会被别人按过期清掉
                    if (self.timer) { global.clearInterval(self.timer); }
                    self.timer = global.setInterval(function () { self._hello(); }, 30000);
                });
        });

        this.client.on('message', function (topic, buf) {
            var raw = buf.toString();

            if (topic.indexOf(self.tMsg + '/') === 0) {
                var m;
                try { m = JSON.parse(raw); } catch (e) { return; }
                if (!m || !m.id || m.uid === self.uid) { return; }
                self.brokerMsgs[m.id] = m.ts || Date.now();
                self._schedulePrune();
                self.onMessage(m);
                return;
            }

            if (topic.indexOf(self.tPresence + '/') === 0) {
                var puid = topic.slice(self.tPresence.length + 1);
                if (puid === self.uid) { return; }
                if (!raw) { delete self.peers[puid]; }          // 空载荷＝该用户已离线
                else {
                    var p;
                    try { p = JSON.parse(raw); } catch (e) { return; }
                    self.peers[puid] = { name: p.name || '匿名', ts: p.ts || Date.now() };
                }
                self._emitPresence();
                return;
            }

            if (topic === self.tTyping) {
                var t;
                try { t = JSON.parse(raw); } catch (e) { return; }
                if (t && t.uid !== self.uid) { self.onTyping(t.name); }
            }
        });

        this.client.on('reconnect', function () { self.onStatus('connecting', '连接中断，正在重连…'); });
        this.client.on('close', function () { self.connected = false; self.onStatus('offline', '连接已关闭，等待重连…'); });
        this.client.on('offline', function () { self.onStatus('offline', '已离线，等待重连…'); });
        this.client.on('error', function (err) {
            self.onStatus('error', '通道异常：' + (err && err.message ? err.message : err));
        });
    };

    /* 上报/刷新自己的在线状态（retain，所以新订阅者也能看到） */
    MqttTransport.prototype._hello = function () {
        if (!this.client || !this.client.connected) { return; }
        this.client.publish(this.tPresence + '/' + this.uid,
            JSON.stringify({ name: this.name, ts: Date.now() }), { qos: 1, retain: true });
        this._emitPresence();
    };

    MqttTransport.prototype._emitPresence = function () {
        var now = Date.now(), out = [{ uid: this.uid, name: this.name }];
        for (var k in this.peers) {
            // retain 兜底：心跳周期 30s，这里给 120s 宽限；
            // 真掉线由 broker 的 LWT（空载荷）清除，不依赖这个兜底
            if (now - this.peers[k].ts > 120000) { delete this.peers[k]; }
            else { out.push({ uid: k, name: this.peers[k].name }); }
        }
        this.onPresence(out);
    };

    /* 历史裁剪：只保留最近 limit 条 retain 消息，超出的用空载荷删除 */
    MqttTransport.prototype._schedulePrune = function () {
        var self = this;
        if (this.pruneTimer) { return; }
        this.pruneTimer = global.setTimeout(function () {
            self.pruneTimer = null;
            self._prune();
        }, 4000);
    };

    MqttTransport.prototype._prune = function () {
        if (!this.client || !this.client.connected) { return; }
        var map = this.brokerMsgs;
        var ids = Object.keys(map);
        var excess = ids.length - this.limit;
        if (excess <= 0) { return; }
        ids.sort(function (a, b) { return map[a] - map[b]; });
        for (var i = 0; i < excess; i++) {
            this.client.publish(this.tMsg + '/' + ids[i], '', { qos: 0, retain: true });
            delete map[ids[i]];
        }
    };

    MqttTransport.prototype.send = function (msg) {
        if (!this.client || !this.client.connected) { return false; }
        // retain + QoS1：新人能补到历史，且至少送达一次（靠 id 去重）
        this.client.publish(this.tMsg + '/' + msg.id, JSON.stringify(msg), { qos: 1, retain: true });
        this.brokerMsgs[msg.id] = msg.ts;
        this._schedulePrune();
        return true;
    };

    MqttTransport.prototype.typing = function () {
        if (this.client && this.client.connected) {
            this.client.publish(this.tTyping,
                JSON.stringify({ uid: this.uid, name: this.name }), { qos: 0 });
        }
    };

    MqttTransport.prototype.disconnect = function () {
        if (this.timer) { global.clearInterval(this.timer); }
        if (this.watchdog) { global.clearTimeout(this.watchdog); }
        if (this.pruneTimer) { global.clearTimeout(this.pruneTimer); }
        if (this.client) {
            try {
                // 主动离线：清掉自己的 retain 在线状态
                this.client.publish(this.tPresence + '/' + this.uid, '', { qos: 1, retain: true });
                this.client.end(true);
            } catch (e) { /* 已断开 */ }
        }
    };

    /* -- WebSocket 传输：自建服务端（配套 chat-worker/） ---------------------
       协议与 chat-worker/src/index.js 一一对应：
         发出  {t:'join',uid,name} / {t:'msg',id,text} / {t:'typing'}
         收到  {t:'history',list} / {t:'msg',…} / {t:'presence',list} /
               {t:'typing',name} / {t:'error',msg}
       时间戳、昵称、限流都以服务端为准；客户端只负责收发与渲染。
       ---------------------------------------------------------------------- */
    function WsTransport(opts) {
        this.room = opts.room;
        this.url = opts.ws;
        this.uid = opts.uid;
        this.name = opts.name;
        this.socket = null;
        this.retry = 0;
        this.closed = false;
        this.status = 'offline';
    }

    WsTransport.prototype._endpoint = function () {
        var sep = this.url.indexOf('?') >= 0 ? '&' : '?';
        return this.url + sep + 'room=' + encodeURIComponent(this.room);
    };

    WsTransport.prototype.connect = function () {
        var self = this;
        if (!this.url) { this.onStatus('error', '未配置 WebSocket 地址（ws 参数）'); return; }
        this.onStatus('connecting', '正在连接自建服务端…');

        try { this.socket = new global.WebSocket(this._endpoint()); }
        catch (e) { this.onStatus('error', 'WebSocket 地址无效：' + this.url); return; }

        this.socket.onopen = function () {
            self.retry = 0;
            self.onStatus('online', '已连接自建服务端');
            // 带上服务端签发的身份凭证；没有的话服务端会先要求过人机校验
            self._join();
        };

        this.socket.onmessage = function (e) {
            var p;
            try { p = JSON.parse(e.data); } catch (err) { return; }
            if (!p || !p.t) { return; }

            if (p.t === 'welcome') {                 // 服务端刚签发的匿名身份
                setToken(p.token);
                self.onIdentity(p);
                return;
            }
            if (p.t === 'need-login') {              // 登录制：凭证不是 GitHub 身份
                if (self.onNeedLogin) { self.onNeedLogin(p.msg); }
                return;
            }
            if (p.t === 'cf') {                      // 需要先过一次人机校验
                self.onStatus('connecting', '正在做人机校验…');
                getTurnstileToken(p.sitekey, function (t) {
                    if (!t) {
                        self.onStatus('error', '人机校验未通过，请刷新页面重试');
                        return;
                    }
                    self._join(t);
                });
                return;
            }
            if (p.t === 'history') {
                if (p.me) { self.onIdentity(p.me); }
                if (p.now) { self.tsOffset = p.now - Date.now(); }   // 服务端时间偏移，撤回窗口判定用
                var list = p.list || [];
                for (var i = 0; i < list.length; i++) { self.onMessage(list[i]); }
                return;
            }
            if (p.t === 'histmore') { if (self.onHistMore) { self.onHistMore(p); } return; }
            if (p.t === 'banlist') { if (self.onBanList) { self.onBanList(p.uids || []); } return; }
            if (p.t === 'banned') {
                self.onStatus('error', p.msg || '你已被封禁');
                self._flash(p.msg || '你已被封禁');
                return;
            }
            if (p.t === 'sys') { if (self.onSys) { self.onSys(p.text || ''); } return; }
            if (p.t === 'msg') { self.onMessage(p); return; }   // 自己发的也会回来，靠 id 幂等去重
            if (p.t === 'msgdel') { if (self.onDeleted) { self.onDeleted(p); } return; } // 管理员撤回广播
            if (p.t === 'presence') { self.onPresence(p.list || []); return; }
            if (p.t === 'typing') { self.onTyping(p.name); return; }
            if (p.t === 'reaction') { if (self.onReaction) { self.onReaction(p); } return; }
            if (p.t === 'error') { self.onStatus('error', p.msg || '服务端拒绝了这次操作'); }
        };

        this.socket.onerror = function () { self.onStatus('error', '连接出错'); };
        this.socket.onclose = function () {
            if (self.closed) { return; }
            var wait = Math.min(30000, Math.pow(2, self.retry) * 1000);
            self.onStatus('offline', '连接已断开，' + Math.round(wait / 1000) + 's 后重连');
            self.retry++;
            global.setTimeout(function () { if (!self.closed) { self.connect(); } }, wait);
        };
    };

    WsTransport.prototype._join = function (cf) {
        var msg = { t: 'join', token: getToken(), name: this.name };
        if (cf) { msg.cf = cf; }
        this._tx(msg);
    };

    WsTransport.prototype._tx = function (obj) {
        if (this.socket && this.socket.readyState === 1) {
            this.socket.send(JSON.stringify(obj));
            return true;
        }
        return false;
    };

    /* 改名 / 回前台时重新上报身份，服务端据此刷新在线名单 */
    WsTransport.prototype._hello = function () {
        this._join();
    };

    WsTransport.prototype.send = function (msg) {
        var out = { t: 'msg', id: msg.id, text: msg.text };
        if (msg.ref && msg.ref.id) { out.ref = msg.ref; }   // 引用回复：只传被引消息 id
        return this._tx(out);
    };

    WsTransport.prototype.typing = function () { this._tx({ t: 'typing' }); };

    /* 表情回应：同一个 emoji 再点一次即取消（由服务端决定增删） */
    WsTransport.prototype.react = function (id, emoji) {
        this._tx({ t: 'react', id: id, emoji: emoji });
    };

    WsTransport.supportsReactions = true;

    WsTransport.prototype.disconnect = function () {
        this.closed = true;
        if (this.socket) { try { this.socket.close(); } catch (e) { /* 忽略 */ } }
    };

    /** 暂停：断开且不自动重连（弹层关闭后的省连接模式） */
    WsTransport.prototype.pause = function () {
        this.paused = true;
        this.closed = true;
        if (this.socket) { try { this.socket.close(); } catch (e) { /* 忽略 */ } }
    };

    /** 恢复：重新连接（join 会随 onopen 自动发生） */
    WsTransport.prototype.resume = function () {
        if (!this.paused) { return; }
        this.paused = false;
        this.closed = false;
        this.retry = 0;
        this.connect();
    };

    registerTransport('local', LocalTransport);
    registerTransport('mqtt', MqttTransport);
    registerTransport('ws', WsTransport);

    /* --------------------------------------------------------------- 内核 */

    var QUICK_REACTS = ['👍', '❤️', '😂', '🎉', '🤔', '👀'];

    function parseRooms(raw, primary) {
        var out = [];
        var add = function (item) {
            var s = String(item || '').trim();
            if (!s) { return; }
            var i = s.indexOf('|');
            var name = (i < 0 ? s : s.slice(0, i)).trim().slice(0, 20);
            var topic = (i < 0 ? '' : s.slice(i + 1)).trim().slice(0, 80);
            if (!name) { return; }
            for (var k = 0; k < out.length; k++) { if (out[k].name === name) { return; } }
            out.push({ name: name, topic: topic });
        };
        String(raw || '').split(',').forEach(add);
        if (!out.length) { add(primary || '大厅'); }
        return out;
    }

    /** 消息正文渲染：转义 → @提及 → 链接 */
    function renderText(text) {
        var parts = String(text).split(/([@\uff20][^\s@\uff20]{1,16})/g);
        var out = '';
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (i % 2 === 1 && p.charAt(0) === '@') {
                out += '<span class="cr-mention">' + esc(p) + '</span>';
            } else {
                out += linkify(esc(p));
            }
        }
        return out;
    }

    function ChatRoom(root, opts) {
        this.root = root;
        this.opts = opts;
        this.limit = opts.limit;

        this.rooms = parseRooms(opts.rooms, opts.room);
        this.room = this._pickRoom(opts.room);

        this.messages = [];
        this.seen = {};
        this.reactions = {};        // msgId -> [{emoji, count, users}]
        this.nodes = {};            // msgId -> 消息行元素
        this.membersOnline = [];
        this.knownMembers = {};
        this.bannedUids = {};     // uid -> true（用来识别"新加入"）
        this.presenceReady = false;
        this.typingUntil = 0;
        this.typingTimer = null;
        this.lastTypingSent = 0;
        this.unread = 0;
        this.query = '';
        this.reactPickerFor = '';
        this.ready = false;
        this.status = 'offline';
        this.statusDetail = '';
        this.notice = opts.notice || '';
        this.reactSupported = false;

        this.me = lsGet('wb-chat:me', null) || { uid: uid('u'), name: '' };
        if (!this.me.uid) { this.me.uid = uid('u'); }

        this.identity = tokenInfo(getToken());
        // 昵称与头像一律取自 GitHub 账号，不再让用户手填
        if (this.identity && this.identity.kind === 'github') {
            this.me.uid = this.identity.uid;
            if (this.identity.name) { this.me.name = this.identity.name; }
        }

        this._cacheDom();
        this._bind();
        this._applyOptions();
        this._applyBg((bgRead() || {}).url || '');
        this._maybeRefreshIdentity();

        // 自建后端要登录才进；公共频道/本机模式没有账号体系，仍走昵称
        if (this.requiresLogin() && !this.loggedIn()) { this._showGate(); }
        else if (!this.requiresLogin() && !this.me.name) { this._showGate(); }
        else { this._start(); }
    }

    ChatRoom.prototype._pickRoom = function (name) {
        var want = String(name || '').trim();
        for (var i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i].name === want) { return want; }
        }
        return this.rooms[0].name;
    };

    ChatRoom.prototype._roomInfo = function () {
        for (var i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i].name === this.room) { return this.rooms[i]; }
        }
        return { name: this.room, topic: '' };
    };

    ChatRoom.prototype._cacheDom = function () {
        var q = function (sel) { return this.root.querySelector(sel); }.bind(this);
        this.dom = {
            station: q('[data-cr-station]'),
            rail: q('[data-cr-rail]'),
            channels: q('[data-cr-channels]'),
            roomSearch: q('[data-cr-roomsearch]'),
            info: q('[data-cr-info]'),
            meAvatar: q('[data-cr-meavatar]'),
            meName: q('[data-cr-mename]'),
            meStatus: q('[data-cr-mestatus]'),
            login: q('[data-cr-login]'),
            title: q('[data-cr-title]'),
            topic: q('[data-cr-topic]'),
            search: q('[data-cr-search]'),
            sideToggle: q('[data-cr-side-toggle]'),
            jumpTop: q('[data-cr-jump-top]'),
            link: q('[data-cr-link]'),
            loadMore: q('[data-cr-loadmore]'),
            bgBtn: q('[data-cr-bgbtn]'),
            bgPanel: q('[data-cr-bgpanel]'),
            bgInput: q('[data-cr-bginput]'),
            bgErr: q('[data-cr-bgerr]'),
            stream: q('[data-cr-stream]'),
            hint: q('[data-cr-hint]'),
            hintText: q('[data-cr-hinttext]'),
            dots: q('.cr-dots'),
            input: q('[data-cr-input]'),
            send: q('[data-cr-send]'),
            count: q('[data-cr-count]'),
            emojiPanel: q('[data-cr-emoji]'),
            plus: q('[data-cr-emoji-btn]'),
            emojis: q('[data-cr-emojis]'),
            replyBar: q('[data-cr-replybar]'),
            replyCancel: q('[data-cr-replycancel]'),
            mentionPanel: q('[data-cr-mentionpanel]'),
            memberPanel: q('[data-cr-memberpanel]'),
            members: q('[data-cr-members]'),
            gate: q('[data-cr-gate]'),
            gateLoginBox: q('[data-cr-gate-loginbox]'),
            gateNameBox: q('[data-cr-gate-namebox]'),
            gateBtn: q('[data-cr-gate-login]'),
            gateName: q('[data-cr-gate-name]'),
            gateEnter: q('[data-cr-gate-enter]'),
            gateErr: q('[data-cr-gate-err]')
        };
    };

    ChatRoom.prototype._applyOptions = function () {
        if (this.opts.height) { this.root.style.setProperty('--cr-height', this.opts.height + 'px'); }
        if (this.dom.station && this.opts.station) { this.dom.station.textContent = this.opts.station; }
        this._paintRooms();
        this._paintRoom();
        this._refreshHint();
    };

    /* ------------------------------------------------------------ 房间渲染 */

    ChatRoom.prototype._paintRooms = function () {
        var self = this;
        if (this.dom.rail) {
            this.dom.rail.innerHTML = '';
            this.rooms.forEach(function (r) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'cr-rail-item' + (r.name === self.room ? ' is-active' : '');
                b.title = r.name;
                b.textContent = initial(r.name);
                b.setAttribute('style', 'background:' + avatarColor(r.name));
                b.addEventListener('click', function () { self._switchRoom(r.name); });
                self.dom.rail.appendChild(b);
            });
        }
        if (this.dom.channels) {
            this.dom.channels.innerHTML = '';
            this.rooms.forEach(function (r) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'cr-channel' + (r.name === self.room ? ' is-active' : '');
                b.dataset.room = r.name;
                b.innerHTML = '<span class="cr-h">#</span><span class="cr-channel-name"></span>';
                b.querySelector('.cr-channel-name').textContent = r.name;
                b.addEventListener('click', function () { self._switchRoom(r.name); });
                self.dom.channels.appendChild(b);
            });
        }
        this._filterRooms();
    };

    ChatRoom.prototype._filterRooms = function () {
        if (!this.dom.channels || !this.dom.roomSearch) { return; }
        var q = (this.dom.roomSearch.value || '').trim().toLowerCase();
        var items = this.dom.channels.querySelectorAll('.cr-channel');
        for (var i = 0; i < items.length; i++) {
            var name = (items[i].dataset.room || '').toLowerCase();
            items[i].hidden = !!q && name.indexOf(q) < 0;
        }
    };

    ChatRoom.prototype._paintRoom = function () {
        var info = this._roomInfo();
        if (this.dom.title) { this.dom.title.textContent = this.room; }
        if (this.dom.topic) { this.dom.topic.textContent = info.topic || ''; }
        if (this.dom.input) { this.dom.input.placeholder = '发送到 # ' + this.room; }
        this._paintInfo();
    };

    ChatRoom.prototype._paintInfo = function () {
        if (!this.dom.info) { return; }
        var state = this.status === 'online'
            ? '<span class="cr-ok">已连接</span>'
            : (this.status === 'connecting'
                ? '<span>连接中…</span>'
                : '<span class="cr-bad">未连接</span>');
        var html = '房间 <code>' + esc(this.room) + '</code><br>' +
            '在线 <b>' + this.membersOnline.length + '</b> 人<br>' +
            '消息 <b>' + this.messages.length + '</b> 条<br>' +
            '通道 ' + state;
        html += '<br>身份 ' + (this.identity && this.identity.kind === 'github'
            ? '<span class="cr-ok">GitHub</span>'
            : '<span>匿名</span>');
        if (this.notice) { html += '<br><span class="cr-bad">' + esc(this.notice) + '</span>'; }
        this.dom.info.innerHTML = html;
    };

    ChatRoom.prototype._switchRoom = function (name) {
        if (!name || name === this.room) { return; }
        this.room = name;

        if (this.transport) {
            try { this.transport.disconnect(); } catch (e) { /* 忽略 */ }
            this.transport = null;
        }
        this.messages = [];
        this.seen = {};
        this.reactions = {};
        this.nodes = {};
        this.membersOnline = [];
        this.knownMembers = {};
        this.presenceReady = false;
        this.unread = 0;
        this.query = '';
        this.reactPickerFor = '';
        this.typingUntil = 0;
        this.dom.stream.innerHTML = '';
        if (this.dom.search) { this.dom.search.value = ''; }
        this._toggleEmpty(true);
        this._paintRoom();
        this._paintRooms();   // ← 补上：同步左侧频道列表与竖栏图标的高亮（此前漏掉导致高亮停在大厅）
        this._renderMembers();
        this._refreshHint();
        this._connect();
    };

    /* ---------------------------------------------------------------- 连接 */

    ChatRoom.prototype._start = function () {
        var self = this;
        this.ready = true;
        this._hideGate();
        this._paintMe();
        this._renderEmoji();
        this._toggleEmpty(true);
        this._paintRoom();
        this._connect();

        if (!this._unloadBound) {
            this._unloadBound = true;
            global.addEventListener('beforeunload', function () {
                if (self.transport) { self.transport.disconnect(); }
            });
        }
    };

    ChatRoom.prototype._connect = function () {
        var self = this;
        var Factory = FACTORIES[this.opts.transport];
        if (!Factory) { this._setStatus('error', '未知通道：' + this.opts.transport); return; }

        this.reactSupported = !!Factory.supportsReactions;

        this.transport = new Factory({
            room: this.room,
            limit: this.limit,
            uid: this.me.uid,
            name: this.me.name,
            broker: this.opts.broker,
            ws: this.opts.ws,
            key: this.opts.key
        });
        this.transport.onStatus = function (s, d) { self._setStatus(s, d); };
        this.transport.onMessage = function (m) { self._receive(m); };
        this.transport.onPresence = function (l) { self._setMembers(l); };
        this.transport.onTyping = function (n) { self._showTyping(n); };
        this.transport.onIdentity = function (i) { self._onIdentity(i); };
        this.transport.onReaction = function (p) { self._onReaction(p); };
        this.transport.onSys = function (t) { self._sysLine('ℹ️', t); };
        this.transport.onHistMore = function (p) { self.onHistMore(p); };
        this.transport.onBanList = function (uids) { self.onBanList(uids); };
        this.transport.onDeleted = function (p) { self.onDeleted(p); };
        this.transport.onNeedLogin = function (msg) { self._onNeedLogin(msg); };
        this.transport.connect();
    };

    ChatRoom.prototype._setStatus = function (status, detail) {
        this.status = status;
        this.statusDetail = detail || '';
        this.root.dataset.status = status;   // 供样式与自动化测试观察
        if (this.dom.meStatus) {
            this.dom.meStatus.textContent = status === 'online' ? '在线'
                : (status === 'connecting' ? '连接中…' : '离线');
        }
        this._paintInfo();
        this._syncSend();
        this._refreshHint();
    };

    ChatRoom.prototype._onIdentity = function (info) {
        if (!info || !info.uid) { return; }
        this.identity = {
            uid: info.uid,
            kind: info.kind || 'anon',
            name: info.name || this.me.name,
            avatar: info.avatar || (this.identity && this.identity.avatar) || '',
            role: info.role || (this.identity && this.identity.role) || '',
            login: info.login || (this.identity && this.identity.login) || ''
        };
        this.me.uid = info.uid;
        if (info.name) { this.me.name = info.name; }
        lsSet('wb-chat:me', this.me);
        this._paintMe();
        this._paintInfo();
    };

    /* ------------------------------------------------------------ 身份展示 */

    ChatRoom.prototype._paintMe = function () {
        var loggedIn = this.loggedIn();
        if (this.dom.meName) {
            this.dom.meName.textContent = this.me.name
                || (this.requiresLogin() && !loggedIn ? '未登录' : '未命名');
        }
        var av = this.identity && this.identity.avatar;
        if (this.dom.meAvatar) {
            if (loggedIn && av) {
                this.dom.meAvatar.textContent = '';
                this.dom.meAvatar.setAttribute('style', 'background:none');
                this.dom.meAvatar.innerHTML = '<img src="' + esc(av) + '" alt="">';
            } else {
                this.dom.meAvatar.textContent = initial(this.me.name || '?');
                this.dom.meAvatar.setAttribute('style', 'background:' + avatarColor(this.me.uid || this.me.name));
            }
        }
        // 自建后端才有登录/退出；公共频道没有账号体系，这个入口就藏起来
        if (this.dom.login) {
            this.dom.login.hidden = !this.requiresLogin();
            this.dom.login.title = loggedIn ? '退出登录' : '用 GitHub 登录';
        }
    };

    /* ------------------------------------------------------------ 身份续签 */

    /**
     * 老格式凭证（没有 login 字段）静默换发新格式：
     * 服务端会补齐 GitHub 登录名并重判管理员，成功后写入并刷新页面。
     * 只在「GitHub 登录 + 凭证里没有 login」时触发一次；失败静默，不影响当前使用。
     */
    ChatRoom.prototype._maybeRefreshIdentity = function () {
        if (!this.opts.ws || !this.identity || this.identity.kind !== 'github') { return; }
        if (this.identity.login) { return; }                        // 已是新格式
        if (this._refreshTried) { return; }
        // 循环防护：只有新凭证**确实带来了升级**（多了 login/role）才刷新页面；
        // 服务端反查失败时新凭证仍是老格式 → 不刷新 → 自然不会死循环。
        // 因此这里**不需要**「本会话只试一次」的标记：失败后用户刷新页面即可重试。
        this._refreshTried = true;
        var origin = wsOrigin(this.opts.ws);
        var token = getToken();
        if (!origin || !token) { return; }
        // token 走 POST body——放 URL query 会进访问日志，等于把身份泄露出去
        fetch(origin + '/auth/refresh', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: token })
        })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d || !d.token) { return; }
                var upgraded = false;
                try {
                    var head = d.token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
                    var pad = '=='.slice((head.length + 2) % 4);
                    var payload = JSON.parse(global.atob(head + pad));
                    upgraded = !!payload.login || !!payload.role;
                } catch (e) { return; }
                if (!upgraded) { return; }                          // 无升级，放弃
                setToken(d.token);
                global.location.reload();                           // 用新凭证重来一遍
            })
            .catch(function () { /* 静默失败，用户下次刷新页面时会重试 */ });
    };

    /* ------------------------------------------------------------ 聊天背景 */
    /** 图源：与首页壁纸一致的免费公开源；picsum 加随机 seed 每次都不同 */
    var BG_SOURCES = {
        scenery: { name: '随机风景', url: function () { return 'https://picsum.photos/seed/' + Math.random().toString(36).slice(2, 9) + '/1920/1080'; } },
        anime: { name: '随机二次元', url: function () { return 'https://t.alcy.cc/ycy?' + Date.now(); } }
    };

    var BG_KEY = 'wb-chat:bg';

    function bgRead() {
        try { return JSON.parse(global.localStorage.getItem(BG_KEY) || 'null'); } catch (e) { return null; }
    }

    function bgWrite(v) {
        try {
            if (v) { global.localStorage.setItem(BG_KEY, JSON.stringify(v)); }
            else { global.localStorage.removeItem(BG_KEY); }
        } catch (e) { /* 隐私模式忽略 */ }
    }

    /** 应用/清除背景。加深色遮罩保证消息可读；图片预加载成功才生效 */
    ChatRoom.prototype._applyBg = function (url) {
        var root = this.root;
        if (!url) {
            root.classList.remove('has-bg');
            root.style.backgroundImage = '';
            return;
        }
        url = String(url).replace(/"/g, '%22');
        var probe = new Image();
        probe.onload = function () {
            root.classList.add('has-bg');
            root.style.backgroundImage =
                'linear-gradient(rgba(19,19,22,.78), rgba(19,19,22,.78)), url("' + url + '")';
        };
        probe.onerror = function () { /* 加载失败：保持现状 */ };
        probe.src = url;
    };

    /** 记住并应用一个背景：先探测能否加载，成功才记忆，避免存进坏链接 */
    ChatRoom.prototype._setBg = function (url) {
        var self = this;
        if (!url) { return; }
        var probe = new Image();
        probe.onload = function () {
            bgWrite({ url: url, ts: Date.now() });
            self._applyBg(url);
            if (self.dom.bgPanel) { self.dom.bgPanel.hidden = true; }
        };
        probe.onerror = function () { self._bgError('图片加载失败，换一张试试'); };
        probe.src = url;
    };

    ChatRoom.prototype._bgFromBing = function () {
        var self = this;
        this._bgError('');
        try {
            fetch('https://peapix.com/bing/feed?country=cn')
                .then(function (r) { return r.json(); })
                .then(function (list) {
                    if (!list || !list.length || !list[0].url) { throw new Error('empty'); }
                    self._setBg(list[0].url);
                })
                .catch(function () { self._bgError('必应每日一图获取失败，请稍后再试'); });
        } catch (e) { self._bgError('必应每日一图获取失败，请稍后再试'); }
    };

    ChatRoom.prototype._bgError = function (msg) {
        if (!this.dom.bgErr) { return; }
        this.dom.bgErr.hidden = !msg;
        this.dom.bgErr.textContent = msg || '';
    };

    /* ------------------------------------------------------------ 登录门禁 */

    /** 自建后端（ws）必须登录；公共频道与本机模式没有账号体系 */
    ChatRoom.prototype.requiresLogin = function () {
        return this.opts.transport === 'ws' && !!this.opts.ws;
    };

    ChatRoom.prototype.loggedIn = function () {
        return !!(this.identity && this.identity.kind === 'github');
    };

    ChatRoom.prototype._showGate = function (err) {
        if (!this.dom.gate) { return; }
        var needLogin = this.requiresLogin();
        this.dom.gate.hidden = false;
        if (this.dom.gateLoginBox) { this.dom.gateLoginBox.hidden = !needLogin; }
        if (this.dom.gateNameBox) {
            this.dom.gateNameBox.hidden = needLogin;
            if (!needLogin && this.dom.gateName) { this.dom.gateName.value = this.me.name || ''; }
        }
        if (this.dom.gateErr) {
            this.dom.gateErr.hidden = !err;
            this.dom.gateErr.textContent = err || '';
        }
        this._paintMe();
        if (!needLogin && this.dom.gateName) {
            var el = this.dom.gateName;
            global.setTimeout(function () { try { el.focus(); } catch (e) { /* 忽略 */ } }, 60);
        }
    };

    ChatRoom.prototype._hideGate = function () {
        if (this.dom.gate) { this.dom.gate.hidden = true; }
    };

    ChatRoom.prototype._gotoLogin = function () {
        var origin = wsOrigin(this.opts.ws);
        if (!origin) { this._showGate('未配置自建服务端地址（ws 参数），无法登录'); return; }
        if (this.dom.gateBtn) { this.dom.gateBtn.disabled = true; }
        var back = global.location.origin + global.location.pathname;
        global.location.href = origin + '/auth/github/start?return=' + encodeURIComponent(back);
    };

    /** 公共频道 / 本机模式的昵称入口 */
    ChatRoom.prototype._submitGateName = function () {
        var v = ((this.dom.gateName && this.dom.gateName.value) || '').trim().slice(0, 16);
        if (!v) {
            if (this.dom.gateErr) {
                this.dom.gateErr.hidden = false;
                this.dom.gateErr.textContent = '请先填一个昵称';
            }
            return;
        }
        this.me.name = v;
        lsSet('wb-chat:me', this.me);
        this._hideGate();
        this._start();
    };

    ChatRoom.prototype._logout = function () {
        setToken('');
        this.identity = null;
        this.me.name = '';
        this.me.uid = uid('u');
        lsSet('wb-chat:me', this.me);
        if (this.transport) {
            try { this.transport.disconnect(); } catch (e) { /* 忽略 */ }
            this.transport = null;
        }
        this.ready = false;
        this.messages = [];
        this.seen = {};
        this.reactions = {};
        this.nodes = {};
        this.membersOnline = [];
        this.knownMembers = {};
        this.presenceReady = false;
        if (this.dom.stream) { this.dom.stream.innerHTML = ''; }
        this._toggleEmpty(false);
        this._setStatus('offline', '');
        this._paintRoom();
        this._showGate();
    };

    /** 服务端要求登录（凭证缺失 / 过期 / 不是 GitHub 身份） */
    ChatRoom.prototype._onNeedLogin = function (msg) {
        if (this.transport) {
            try { this.transport.disconnect(); } catch (e) { /* 忽略 */ }
            this.transport = null;
        }
        this.ready = false;
        this.identity = null;
        setToken('');
        this._showGate(msg || '请先用 GitHub 登录');
    };

    /* ------------------------------------------------------------ 事件绑定 */

    ChatRoom.prototype._bind = function () {
        var self = this;

        if (this.dom.gateBtn) {
            this.dom.gateBtn.addEventListener('click', function () { self._gotoLogin(); });
        }
        if (this.dom.gateEnter) {
            this.dom.gateEnter.addEventListener('click', function () { self._submitGateName(); });
        }
        if (this.dom.gateName) {
            this.dom.gateName.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); self._submitGateName(); }
            });
        }
        if (this.dom.login) {
            this.dom.login.addEventListener('click', function () {
                if (self.loggedIn()) { self._logout(); } else { self._gotoLogin(); }
            });
        }

        this.dom.send.addEventListener('click', function () { self._submit(); });
        this.dom.input.addEventListener('keydown', function (e) {
            if (self._mentionKeys(e)) { return; }   // @面板打开时接管方向键/回车
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._submit(); }
        });
        this.dom.input.addEventListener('input', function () { self._onInput(); });
        this.dom.input.addEventListener('focus', function () {
            global.setTimeout(function () {
                if (self.dom.input.scrollIntoView) {
                    self.dom.input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }, 300);
        });

        if (this.dom.roomSearch) {
            this.dom.roomSearch.addEventListener('input', function () { self._filterRooms(); });
        }
        if (this.dom.search) {
            this.dom.search.addEventListener('input', function () {
                self.query = self.dom.search.value || '';
                self._applySearch();
            });
        }
        if (this.dom.sideToggle) {
            this.dom.sideToggle.addEventListener('click', function () {
                self.root.dataset.members = self.root.dataset.members === 'on' ? '' : 'on';
            });
        }
        if (this.dom.jumpTop) {
            this.dom.jumpTop.addEventListener('click', function () { self._scrollToBottom(true); });
        }

        /* ── 加载更早的历史 ── */
        if (this.dom.loadMore) {
            this.dom.loadMore.addEventListener('click', function () {
                if (!self.messages.length) { return; }
                self.dom.loadMore.disabled = true;
                self.transport._tx({ t: 'hist', before: self.messages[0].ts });
            });
        }

        /* ── 引用回复条：× 取消本次引用 ── */
        if (this.dom.replyCancel) {
            this.dom.replyCancel.addEventListener('click', function () { self._clearReply(); });
        }
        /* ── @成员面板：点击选项即选中（mousedown 防止输入框先失焦） ── */
        if (this.dom.mentionPanel) {
            this.dom.mentionPanel.addEventListener('mousedown', function (e) {
                if (e.target.closest && e.target.closest('[data-cr-mention]')) { e.preventDefault(); }
            });
            this.dom.mentionPanel.addEventListener('click', function (e) {
                var b = e.target && e.target.closest ? e.target.closest('[data-cr-mention]') : null;
                if (b) { self._pickMention(Number(b.getAttribute('data-cr-mention'))); }
            });
        }

        /* ── 聊天背景：参考首页壁纸的选择方式，选择只存本机（localStorage） ── */        if (this.dom.bgBtn) {
            this.dom.bgBtn.addEventListener('click', function () {
                if (!self.dom.bgPanel) { return; }
                self.dom.bgPanel.hidden = !self.dom.bgPanel.hidden;
                if (!self.dom.bgPanel.hidden) {
                    self.dom.bgErr.hidden = true;
                    if (self.dom.bgInput) { self.dom.bgInput.value = (bgRead() || {}).url || ''; }
                }
            });
        }
        if (this.dom.bgPanel) {
            this.dom.bgPanel.addEventListener('click', function (e) {
                var btn = e.target && e.target.closest ? e.target.closest('[data-cr-bgset]') : null;
                if (!btn) { return; }
                var mode = btn.getAttribute('data-cr-bgset');
                if (mode === 'default') {
                    bgWrite(null);
                    self._applyBg('');
                    self.dom.bgPanel.hidden = true;
                    return;
                }
                var url = '';
                if (mode === 'url') {
                    url = (self.dom.bgInput && self.dom.bgInput.value || '').trim();
                    // 只允许 http(s):// 或站内绝对路径（挡掉 javascript: / data: 这类）
                    if (!/^(https?:\/\/|\/)/i.test(url)) {
                        return self._bgError('请输入图片链接（http(s):// 或站内 / 开头）');
                    }
                } else if (mode === 'bing') {
                    return self._bgFromBing();
                } else if (BG_SOURCES[mode]) {
                    url = BG_SOURCES[mode].url();
                }
                self._setBg(url);
            });
        }
        if (this.dom.link) {
            this.dom.link.addEventListener('click', function () {
                var url = global.location.href;
                if (global.navigator.clipboard) {
                    global.navigator.clipboard.writeText(url);
                    self._flash('链接已复制');
                } else {
                    self._flash('请手动复制地址栏链接');
                }
            });
        }

        var toggleEmoji = function () {
            self.dom.emojiPanel.hidden = !self.dom.emojiPanel.hidden;
            if (!self.dom.emojiPanel.hidden) { self.dom.input.focus(); }
        };
        if (this.dom.plus) { this.dom.plus.addEventListener('click', toggleEmoji); }
        if (this.dom.emojis) { this.dom.emojis.addEventListener('click', toggleEmoji); }
        this.dom.emojiPanel.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) { return; }
            self._insert(b.textContent);
            self.dom.emojiPanel.hidden = true;
        });
        document.addEventListener('click', function (e) {
            if (!self.dom.emojiPanel.hidden && !self.root.contains(e.target)) {
                self.dom.emojiPanel.hidden = true;
            }
        });

        this.dom.stream.addEventListener('scroll', function () {
            if (self._nearBottom() && self.unread) { self.unread = 0; self._refreshHint(); }
        });

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) { return; }
            var t = self.transport;
            if (t && typeof t._hello === 'function') { t._hello(); }
        });
        global.addEventListener('pageshow', function (e) {
            if (e.persisted && self.transport && self.transport.client && !self.transport.client.connected) {
                self.transport.client.reconnect();
            }
        });
    };

    /* ------------------------------------------------------------ 输入交互 */

    ChatRoom.prototype._renderEmoji = function () {
        var html = '';
        for (var i = 0; i < EMOJIS.length; i++) {
            html += '<button type="button">' + EMOJIS[i] + '</button>';
        }
        this.dom.emojiPanel.innerHTML = html;
    };

    ChatRoom.prototype._insert = function (ch) {
        var el = this.dom.input;
        var s = el.selectionStart === null || el.selectionStart === undefined ? el.value.length : el.selectionStart;
        var e = el.selectionStart === null || el.selectionStart === undefined ? el.value.length : el.selectionEnd;
        el.value = el.value.slice(0, s) + ch + el.value.slice(e);
        el.selectionStart = el.selectionEnd = s + ch.length;
        el.focus();
        this._onInput();
    };

    ChatRoom.prototype._onInput = function () {
        var len = this.dom.input.value.length;
        if (len > MAX_LEN) {
            this.dom.input.value = this.dom.input.value.slice(0, MAX_LEN);
            len = MAX_LEN;
        }
        this._syncSend();

        this.dom.input.style.height = '21px';
        this.dom.input.style.height = Math.min(110, this.dom.input.scrollHeight) + 'px';

        this._detectMention();

        var now = Date.now();
        if (len > 0 && this.transport && this.transport.typing && now - this.lastTypingSent > 3000) {
            this.lastTypingSent = now;
            this.transport.typing();
        }
    };

    /* ------------------------------------------------------------ @成员选择 */

    /** 光标前若正在输入「@xxx」就弹出成员选择面板；返回 {start,end,query} 或 null */
    ChatRoom.prototype._mentionContext = function () {
        var el = this.dom.input;
        if (!el) { return null; }
        var pos = el.selectionStart || 0;
        var before = el.value.slice(0, pos);
        // 兼容半角 @ 与中文输入法的全角 ＠
        var mm = before.match(/(^|\s)[@＠]([^\s@＠]{0,16})$/);
        if (!mm) { return null; }
        return { start: pos - mm[2].length - 1, end: pos, query: mm[2] };
    };

    ChatRoom.prototype._detectMention = function () {
        var ctx = this._mentionContext();
        if (!ctx) { this._closeMention(); return; }
        var self = this;
        var isAdmin = !!(this.identity && this.identity.role === 'admin');
        var pool = [];
        var seen = {};
        // 自己也可以被 @（测试方便、行为与 QQ 一致），不去重排除
        this.membersOnline.forEach(function (m) {
            if (!seen[m.uid]) { seen[m.uid] = 1; pool.push(m); }
        });
        var q = ctx.query.toLowerCase();
        if (q) { pool = pool.filter(function (m) { return m.name.toLowerCase().indexOf(q) >= 0; }); }
        // 没有可 @ 的成员时，管理员的「所有人」选项仍然保留
        if (!pool.length && !isAdmin) { this._closeMention(); return; }
        this._openMention(pool.slice(0, 8), ctx);
    };

    ChatRoom.prototype._openMention = function (pool, ctx) {
        var self = this;
        // 管理员独有：@所有人（服务端会给全员发提醒）
        var isAdmin = !!(self.identity && self.identity.role === 'admin');
        this.mentionPool = isAdmin ? [{ uid: '__all__', name: '所有人', isAll: true }].concat(pool) : pool;
        this.mentionCtx = ctx;
        this.mentionPick = 0;
        if (!this.dom.mentionPanel) { return; }
        var html = '<div class="cr-bgpanel-title">' + (isAdmin ? '提醒谁？（可 @ 所有人）' : '选择要提醒的成员') + '</div>';
        this.mentionPool.forEach(function (m, i) {
            var avHtml;
            if (m.isAll) {
                avHtml = '<span class="cr-avatar cr-avatar--xs" style="background:linear-gradient(135deg,#f7b733,#fc4a1a)">' +
                    '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M20 4 6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3l14 4V4ZM6 17.5V19a2 2 0 0 0 4 0v-.9L6 17.5Z" fill="currentColor"/></svg></span>';
            } else {
                var av = m.avatar || (m.uid === self.me.uid && self.identity ? self.identity.avatar : '') || '';
                avHtml = av
                    ? '<span class="cr-avatar cr-avatar--xs"><img src="' + esc(av) + '" alt=""></span>'
                    : '<span class="cr-avatar cr-avatar--xs" style="background:' + avatarColor(m.uid || m.name) + '">' + esc(initial(m.name)) + '</span>';
            }
            html += '<button type="button" class="cr-mention-item' + (i === 0 ? ' is-pick' : '') +
                '" data-cr-mention="' + i + '">' + avHtml + '<span>' + esc(m.name) + '</span>' +
                (m.isAll ? '<span class="cr-mention-alltag">全员提醒</span>' : '') + '</button>';
        });
        this.dom.mentionPanel.innerHTML = html;
        this.dom.mentionPanel.hidden = false;
    };

    ChatRoom.prototype._closeMention = function () {
        this.mentionPool = null;
        this.mentionCtx = null;
        if (this.dom.mentionPanel) { this.dom.mentionPanel.hidden = true; }
    };

    /** 选中第 i 个成员：把输入框里正在打的「@词」替换成「@名字␣」，光标落在末尾 */
    ChatRoom.prototype._pickMention = function (i) {
        var pool = this.mentionPool, ctx = this.mentionCtx;
        if (!pool || !pool[i] || !ctx) { this._closeMention(); return; }
        var el = this.dom.input;
        var val = el.value;
        var inserted = pool[i].isAll ? '@所有人 ' : ('@' + pool[i].name + ' ');
        el.value = val.slice(0, ctx.start) + inserted + val.slice(ctx.end);
        var pos = ctx.start + inserted.length;
        el.setSelectionRange(pos, pos);
        el.focus();
        this._closeMention();
        this._onInput();
    };

    /** 面板打开时接管 ↑/↓/Enter/Esc/Tab；返回 true 表示已消费 */
    ChatRoom.prototype._mentionKeys = function (e) {
        if (!this.mentionPool || !this.mentionPool.length) { return false; }
        var items = this.dom.mentionPanel
            ? this.dom.mentionPanel.querySelectorAll('.cr-mention-item')
            : [];
        function paint(idx) {
            items.forEach(function (b, i) { b.classList.toggle('is-pick', i === idx); });
        }
        if (e.key === 'Escape') { this._closeMention(); return true; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.mentionPick = (this.mentionPick + (e.key === 'ArrowDown' ? 1 : this.mentionPool.length - 1)) % this.mentionPool.length;
            paint(this.mentionPick);
            return true;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            this._pickMention(this.mentionPick);
            return true;
        }
        return false;
    };

    ChatRoom.prototype._syncSend = function () {
        var len = this.dom.input.value.length;
        var offline = this.status === 'offline' || this.status === 'error';
        this.dom.send.disabled = len === 0 || offline;
        if (this.dom.count) {
            this.dom.count.hidden = len === 0;
            if (len > 0) { this.dom.count.textContent = len + '/' + MAX_LEN; }
        }
    };

    ChatRoom.prototype._submit = function () {
        var text = (this.dom.input.value || '').replace(/\s+$/, '');
        if (!text || !this.transport) { return; }
        var msg = {
            id: uid('m'),
            room: this.room,
            uid: this.me.uid,
            name: this.me.name,
            role: (this.identity && this.identity.role) || '',   // 本地乐观渲染也要带徽章
            text: text,
            ts: Date.now()
        };
        if (this.pendingRef && this.pendingRef.id) { msg.ref = this.pendingRef; }
        if (!this.transport.send(msg)) {
            this._flash('发送失败：通道未连接');
            return;
        }
        this._receive(msg, true);
        this.dom.input.value = '';
        this._clearReply();
        this._onInput();
    };

    /* ------------------------------------------------------------ 引用回复 */

    /** 把某条消息设为「正在引用」：输入区上方出现引用条，随下一条消息一起发出 */
    ChatRoom.prototype._startReply = function (m) {
        if (!m || m.deleted) { return; }
        this.pendingRef = { id: m.id, name: m.name, text: String(m.text || '').slice(0, 120) };
        if (this.dom.replyBar) {
            var who = this.dom.replyBar.querySelector('[data-cr-replyname]');
            var what = this.dom.replyBar.querySelector('[data-cr-replytext]');
            if (who) { who.textContent = m.name; }
            if (what) { what.textContent = this.pendingRef.text; }
            this.dom.replyBar.hidden = false;
        }
        if (this.dom.input) { this.dom.input.focus(); }
    };

    ChatRoom.prototype._clearReply = function () {
        this.pendingRef = null;
        if (this.dom.replyBar) { this.dom.replyBar.hidden = true; }
    };

    /* ---------------------------------------------------------------- 提示 */

    ChatRoom.prototype._setHint = function (text, bad) {
        if (this.dom.hintText) { this.dom.hintText.textContent = text || ''; }
        if (this.dom.hint) { this.dom.hint.classList.toggle('is-bad', !!bad); }
        if (!text && this.dom.dots) { this.dom.dots.hidden = true; }
    };

    ChatRoom.prototype._refreshHint = function () {
        if (this.status === 'error' && this.statusDetail) { this._setHint(this.statusDetail, true); return; }
        if (this.typingUntil && Date.now() < this.typingUntil) { return; }
        if (this.unread) { this._setHint('↓ ' + this.unread + ' 条新消息'); return; }
        if (this.notice) { this._setHint(this.notice); return; }
        if (this.status === 'connecting' && !this.messages.length) { this._setHint('正在连接…'); return; }
        this._setHint('');
    };

    ChatRoom.prototype._flash = function (text) {
        this._setHint(text, true);
        var self = this;
        global.clearTimeout(this._flashTimer);
        this._flashTimer = global.setTimeout(function () { self._refreshHint(); }, 3000);
    };

    ChatRoom.prototype._showTyping = function (name) {
        var self = this;
        this.typingUntil = Date.now() + 2600;
        if (this.dom.dots) { this.dom.dots.hidden = false; }
        this._setHint(name + ' 正在输入…');
        global.clearTimeout(this.typingTimer);
        this.typingTimer = global.setTimeout(function () {
            self.typingUntil = 0;
            if (self.dom.dots) { self.dom.dots.hidden = true; }
            self._refreshHint();
        }, 2600);
    };

    /* ---------------------------------------------------------------- 数据 */

    ChatRoom.prototype._receive = function (m, isSelf) {
        if (!m || typeof m.text !== 'string') { return; }
        if (!m.id) { m.id = uid('m'); }
        if (this.seen[m.id]) { return; }
        this.seen[m.id] = 1;

        m.ts = Number(m.ts) || Date.now();
        m.name = String(m.name || '匿名').slice(0, 16);
        m.text = m.text.slice(0, MAX_LEN);

        // 引用快照：服务端可能给的是 JSON 串（历史）或对象（实时广播）
        if (m.ref && typeof m.ref === 'string') {
            try { m.ref = JSON.parse(m.ref); } catch (e) { m.ref = null; }
        }
        if (m.ref && !m.ref.id) { m.ref = null; }

        if (m.reactions && m.reactions.length) {
            this.reactions[m.id] = m.reactions;
        }

        var atBottom = this._nearBottom();
        var idx = this.messages.length;
        while (idx > 0 && this.messages[idx - 1].ts > m.ts) { idx--; }

        // 被艾特：服务端解析过 mentions（uid 列表），命中自己就提醒
        var mentioned = !!(m.mentions && m.mentions.length &&
            m.mentions.indexOf(this.me.uid) >= 0 && m.uid !== this.me.uid);

        if (idx === this.messages.length) {
            this.messages.push(m);
            this._appendNode(m);
        } else {
            this.messages.splice(idx, 0, m);
            this._renderAll();
        }

        if (mentioned) {
            var mrow = this.nodes[m.id];
            if (mrow) { mrow.classList.add('is-mention'); }
            this._notifyMention(m);
        }

        this._paintInfo();
        this._saveHistory();

        if (!atBottom && !(isSelf || m.uid === this.me.uid)) {
            this.unread++;
            this._refreshHint();
            this._flashTitle(mentioned ? '有人@我' : '新消息');
        } else {
            this._scrollToBottom(false);
        }
    };

    /** 被 @ 的提醒：提示音一下 + 标签页标题闪烁（仅在后台时） */
    ChatRoom.prototype._notifyMention = function (m) {
        try {
            var ac = new (global.AudioContext || global.webkitAudioContext)();
            var o = ac.createOscillator(), g = ac.createGain();
            o.connect(g); g.connect(ac.destination);
            o.type = 'sine'; o.frequency.value = 880;
            g.gain.setValueAtTime(0.0001, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
            o.start(ac.currentTime); o.stop(ac.currentTime + 0.4);
        } catch (e) { /* 无声环境忽略 */ }
        if (global.document && global.document.hidden) { this._flashTitle('有人@我'); }
    };

    /** 管理员：接收当前封禁名单，并刷新成员列表（操作菜单据此显示封禁/解封） */
    ChatRoom.prototype.onBanList = function (uids) {
        this.bannedUids = {};
        for (var i = 0; i < uids.length; i++) { this.bannedUids[uids[i]] = 1; }
        this._renderMembers();
    };

    /** 管理员：点成员弹出封禁/解封操作菜单（在线、离线都可操作） */
    ChatRoom.prototype._openMemberMenu = function (m) {
        if (!this.dom.memberPanel) { return; }
        var self = this;
        var banned = !!this.bannedUids[m.uid];
        var menu = this.dom.memberPanel.querySelector('[data-cr-membermenu]');
        if (!menu) {
            menu = document.createElement('div');
            menu.className = 'cr-membermenu';
            menu.setAttribute('data-cr-membermenu', '');
            this.dom.memberPanel.appendChild(menu);
        }
        menu.hidden = false;
        var stateLine = (m.uid === this.me.uid ? '（你自己）' : (banned ? '已封禁' : '正常'));
        menu.innerHTML = '<div class="cr-bgpanel-title">' + esc(m.name) +
            ' <span class="cr-mm-state">' + stateLine + '</span></div>';
        function item(label, fn) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'cr-mention-item';
            b.textContent = label;
            b.addEventListener('click', fn);
            menu.appendChild(b);
        }
        if (m.uid === this.me.uid) {
            item('这是你自己', function () { menu.hidden = true; });
        } else if (banned) {
            item('解除封禁', function () {
                self.transport._tx({ t: 'unban', uid: m.uid, name: m.name });
                delete self.bannedUids[m.uid];
                menu.hidden = true;
                self._renderMembers();
            });
        } else {
            item('封禁 24 小时', function () {
                self.transport._tx({ t: 'ban', uid: m.uid, name: m.name, hours: 24 });
                self.bannedUids[m.uid] = 1;
                menu.hidden = true;
                self._renderMembers();
            });
            item('封禁 7 天', function () {
                self.transport._tx({ t: 'ban', uid: m.uid, name: m.name, hours: 168 });
                self.bannedUids[m.uid] = 1;
                menu.hidden = true;
                self._renderMembers();
            });
        }
        item('关闭', function () { menu.hidden = true; });
    };

    /** 「加载更早」：把分页历史插到消息列表头部并保持视口位置 */
    ChatRoom.prototype.onHistMore = function (p) {
        var list = p.list || [];
        this.hasMore = !!p.hasMore;
        if (this.dom.loadMore) { this.dom.loadMore.hidden = !this.hasMore; this.dom.loadMore.disabled = false; }
        var prevFirstId = this.messages.length ? this.messages[0].id : null;
        var added = 0;
        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            if (this.seen[m.id]) { continue; }
            this.seen[m.id] = 1;
            if (m.ref && typeof m.ref === 'string') {
                try { m.ref = JSON.parse(m.ref); } catch (e) { m.ref = null; }
            }
            this.messages.unshift(m);
            added++;
        }
        if (!added) { return; }
        this._renderAll();
        var anchor = prevFirstId ? this.nodes[prevFirstId] : null;
        if (anchor && anchor.scrollIntoView) { anchor.scrollIntoView({ block: 'start' }); }
    };

    /** 标签页在后台时闪烁标题；回到前台自动恢复 */
    ChatRoom.prototype._flashTitle = function (label) {
        if (!global.document || !global.document.hidden) { return; }
        var self = this;
        if (this._titleTimer) { return; }
        var flip = false, base = global.document.title;
        this._titleTimer = global.setInterval(function () {
            flip = !flip;
            global.document.title = flip ? '【' + label + '】' + base : base;
        }, 900);
        global.document.addEventListener('visibilitychange', function () {
            if (!global.document.hidden && self._titleTimer) {
                global.clearInterval(self._titleTimer);
                self._titleTimer = 0;
                global.document.title = base;
            }
        });
    };

    /** 管理员撤回广播：把对应消息就地变成「已撤回」样式 */
    ChatRoom.prototype.onDeleted = function (p) {
        if (!p || !p.id) { return; }
        for (var i = 0; i < this.messages.length; i++) {
            if (this.messages[i].id === p.id) { this.messages[i].deleted = 1; break; }
        }
        delete this.reactions[p.id];
        this._renderReactions(p.id);
        var row = this.nodes[p.id];
        if (!row) { return; }
        row.classList.add('is-deleted');
        row.classList.remove('is-mention');
        var body = row.querySelector('.cr-msg-body');
        if (body) { body.innerHTML = '<div class="cr-deleted">该消息已被管理员撤回</div>'; }
        var refEl = row.querySelector('.cr-refquote');
        if (refEl) { refEl.remove(); }
    };

    ChatRoom.prototype._saveHistory = function () {
        var self = this;
        global.clearTimeout(this._saveTimer);
        this._saveTimer = global.setTimeout(function () {
            lsSet('wb-chat:hist:' + self.room, self.messages.slice(-self.limit));
        }, 500);
    };

    /* ------------------------------------------------------------ 表情回应 */

    ChatRoom.prototype._onReaction = function (p) {
        if (!p || !p.id) { return; }
        this.reactions[p.id] = Array.isArray(p.list) ? p.list : [];
        this._renderReactions(p.id);
    };

    ChatRoom.prototype._toggleReaction = function (id, emoji) {
        if (!this.transport || typeof this.transport.react !== 'function') { return; }
        this.reactPickerFor = '';
        this.transport.react(id, emoji);
    };

    ChatRoom.prototype._renderReactions = function (id) {
        var row = this.nodes[id];
        if (!row || !this.reactSupported) { return; }
        var col = row.querySelector('.cr-msg-col');
        var old = col.querySelector('.cr-reacts');
        if (old) { old.remove(); }

        var list = this.reactions[id] || [];
        if (!list.length && this.reactPickerFor !== id) { return; }

        var self = this;
        var box = document.createElement('div');
        box.className = 'cr-reacts';

        list.forEach(function (r) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'cr-react' + (r.users && r.users.indexOf(self.me.uid) >= 0 ? ' is-mine' : '');
            b.textContent = r.emoji + ' ' + r.count;
            b.addEventListener('click', function () { self._toggleReaction(id, r.emoji); });
            box.appendChild(b);
        });

        if (this.reactPickerFor === id) {
            QUICK_REACTS.forEach(function (e) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'cr-react';
                b.textContent = e;
                b.addEventListener('click', function () { self._toggleReaction(id, e); });
                box.appendChild(b);
            });
        } else {
            var add = document.createElement('button');
            add.type = 'button';
            add.className = 'cr-react';
            add.textContent = '＋';
            add.title = '添加表情';
            add.addEventListener('click', function () {
                self.reactPickerFor = id;
                self._renderReactions(id);
            });
            box.appendChild(add);
        }

        col.appendChild(box);
    };

    /* ------------------------------------------------------------- 成员名单 */

    ChatRoom.prototype._setMembers = function (list) {
        var self = this;
        this.membersOnline = list.slice().sort(function (a, b) {
            return a.name > b.name ? 1 : -1;
        });

        if (this.presenceReady) {
            this.membersOnline.forEach(function (m) {
                if (m.uid !== self.me.uid && !self.knownMembers[m.uid]) {
                    self._sysLine(m.name, '加入了 #' + self.room);
                }
            });
        }
        this.membersOnline.forEach(function (m) { self.knownMembers[m.uid] = 1; });
        this.presenceReady = true;

        this._renderMembers();
        this._paintInfo();
    };

    ChatRoom.prototype._offlineMembers = function () {
        var online = {};
        this.membersOnline.forEach(function (m) { online[m.uid] = 1; });
        var seen = {}, out = [];
        for (var i = this.messages.length - 1; i >= 0 && out.length < 15; i--) {
            var m = this.messages[i];
            if (!m.uid || online[m.uid] || seen[m.uid]) { continue; }
            seen[m.uid] = 1;
            out.push({ uid: m.uid, name: m.name, avatar: m.avatar || '' });
        }
        return out;
    };

    ChatRoom.prototype._renderMembers = function () {
        if (!this.dom.members) { return; }
        var self = this;
        var row = function (m, isOff) {
            var mine = m.uid === self.me.uid;
            // 自己的行：消息/成员列表里可能没有头像，用自己的登录身份兜底
            var av = m.avatar || (mine && self.identity && self.identity.avatar) || '';
            var avHtml = av
                ? '<span class="cr-avatar cr-avatar--xs"><img src="' + esc(av) + '" alt=""></span>'
                : '<span class="cr-avatar cr-avatar--xs" style="background:' +
                  avatarColor(m.uid || m.name) + '">' + esc(initial(m.name)) + '</span>';
            var clickable = self.identity && self.identity.role === 'admin' && self.opts.ws;
            return '<div class="cr-member' + (isOff ? ' is-off' : '') + (clickable ? ' is-clickable' : '') + '"' +
                (clickable ? ' data-cr-member-uid="' + esc(m.uid) + '"' : '') + '>' + avHtml +
                '<span class="cr-member-name">' + esc(m.name) + '</span>' +
                (self.bannedUids && self.bannedUids[m.uid] ? '<span class="cr-member-tag is-banned">封</span>' : '') +
                (mine ? '<span class="cr-member-tag">我</span>' : '') +
                '</div>';
        };

        var html = '<div class="cr-members-title">在线 — ' + this.membersOnline.length + '</div>' +
            (this.identity && this.identity.role === 'admin' ? '<div class="cr-members-hint">点击成员可封禁/解封</div>' : '');
        this.membersOnline.forEach(function (m) { html += row(m, false); });

        var off = this._offlineMembers();
        if (off.length) {
            html += '<div class="cr-members-title">离线 — ' + off.length + '</div>';
            off.forEach(function (m) { html += row(m, true); });
        }

        this.dom.members.innerHTML = html;

        // 管理员：成员行点击 → 封禁/解封操作菜单（事件委托，在线/离线都支持）
        if (this.identity && this.identity.role === 'admin' && this.opts.ws) {
            this.dom.members.querySelectorAll('[data-cr-member-uid]').forEach(function (el) {
                el.addEventListener('click', function () {
                    var uid = el.getAttribute('data-cr-member-uid');
                    var m = null;
                    self.membersOnline.concat(self._offlineMembers()).some(function (x) {
                        if (x.uid === uid) { m = x; return true; }
                        return false;
                    });
                    if (m) { self._openMemberMenu(m); }
                });
            });
        }
    };

    /* ---------------------------------------------------------------- 渲染 */

    ChatRoom.prototype._node = function (m, prev) {
        var self = this;
        var frag = document.createDocumentFragment();

        if (!prev || fmtDay(prev.ts) !== fmtDay(m.ts)) {
            var day = document.createElement('div');
            day.className = 'cr-day';
            var ds = document.createElement('span');
            ds.textContent = fmtDay(m.ts);
            day.appendChild(ds);
            frag.appendChild(day);
        }

        var row = document.createElement('div');
        row.className = 'cr-msg';
        row.dataset.id = m.id;

        var av = document.createElement('span');
        av.className = 'cr-avatar';
        // 真实头像优先（消息自带；自己的消息再用登录身份兜底），没有才用字母色块
        var mAv = m.avatar || ((m.uid === this.me.uid && this.identity) ? this.identity.avatar : '') || '';
        if (mAv) {
            var img = document.createElement('img');
            img.src = mAv;
            img.referrerPolicy = 'no-referrer';
            img.alt = '';
            av.appendChild(img);
        } else {
            av.setAttribute('style', 'background:' + avatarColor(m.uid || m.name));
            av.textContent = initial(m.name);
        }

        var col = document.createElement('div');
        col.className = 'cr-msg-col';

        var head = document.createElement('div');
        head.className = 'cr-msg-head';

        var nm = document.createElement('span');
        nm.className = 'cr-msg-name';
        nm.textContent = m.name;
        nm.setAttribute('style', 'color:' + nameColor(m.uid || m.name));

        var tm = document.createElement('span');
        tm.className = 'cr-msg-time';
        tm.textContent = fmtTime(m.ts);

        head.appendChild(nm);
        head.appendChild(tm);
        if (m.role === 'admin') {
            var badge = document.createElement('span');
            badge.className = 'cr-admin-badge';
            badge.textContent = '凹凸曼';
            head.appendChild(badge);           // 管理员头衔（类似群主标识），放名字旁
        }
        if (m.kind === 'github') {
            var tag = document.createElement('span');
            tag.className = 'cr-member-tag';
            tag.textContent = 'GitHub';
            head.appendChild(tag);
        }

        // 引用块：点击跳到被引消息
        if (m.ref && m.ref.id && !m.deleted) {
            var refq = document.createElement('div');
            refq.className = 'cr-refquote';
            var rn = document.createElement('b');
            rn.textContent = m.ref.name;
            var rt = document.createElement('span');
            rt.textContent = '：' + String(m.ref.text || '').slice(0, 120);
            refq.appendChild(rn);
            refq.appendChild(rt);
            var refTarget = m.ref.id;
            refq.addEventListener('click', function () {
                var el = document.querySelector('.cr-msg[data-id="' + refTarget + '"]');
                if (el) {
                    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    el.classList.add('is-flash');
                    global.setTimeout(function () { el.classList.remove('is-flash'); }, 1400);
                }
            });
            col.appendChild(refq);
        }

        var body = document.createElement('div');
        body.className = 'cr-msg-body';
        if (m.deleted) {
            var del = document.createElement('div');
            del.className = 'cr-deleted';
            del.textContent = '该消息已被管理员撤回';
            body.appendChild(del);
        } else {
            this._fillBody(body, m.text);
        }

        col.appendChild(head);
        col.appendChild(body);
        row.appendChild(av);
        row.appendChild(col);

        // 悬停出现操作按钮：引用（所有人）+ 撤回（管理员撤任意；成员撤自己 3 分钟内）
        if (!m.deleted) {
            var acts = document.createElement('div');
            acts.className = 'cr-acts';

            var qb = document.createElement('button');
            qb.type = 'button';
            qb.className = 'cr-act-btn';
            qb.title = '引用这条消息';
            qb.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M10 8H6a4 4 0 0 0 0 8h1v2l-3 3-1.4-1.4L5.2 17H6a6 6 0 0 1 0-12h4V8Zm4 0h4a4 4 0 0 1 0 8h-1v2l3 3 1.4-1.4L18.8 17H18a6 6 0 0 1 0-12h-4V8Z" transform="rotate(180 12 12)" fill="currentColor"/></svg>';
            qb.addEventListener('click', function (e) {
                e.stopPropagation();
                self._startReply(m);
            });
            acts.appendChild(qb);

            var isAdmin = !!(self.identity && self.identity.role === 'admin');
            var fresh = (Date.now() - (self.tsOffset || 0)) - m.ts <= 180000;   // tsOffset=服务端钟差
            if (self.opts.ws && (isAdmin || (m.uid === self.me.uid && fresh))) {
                var db = document.createElement('button');
                db.type = 'button';
                db.className = 'cr-act-btn cr-act-btn--del';
                db.title = isAdmin ? '撤回这条消息' : '撤回';
                db.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 9Zm4 2v9h2v-9h-2Z" fill="currentColor"/></svg>';
                db.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (!isAdmin && (Date.now() - (self.tsOffset || 0)) - m.ts > 180000) {
                        self._flash('发送超过 3 分钟的消息不能撤回了');
                        return;
                    }
                    if (self.transport && self.transport._tx) {
                        self.transport._tx({ t: 'del', id: m.id });
                    }
                });
                acts.appendChild(db);
            }
            // 管理员对**别人的**消息：额外提供封禁 24h 入口
            if (self.opts.ws && isAdmin && m.uid !== self.me.uid && !m.deleted) {
                var bb = document.createElement('button');
                bb.type = 'button';
                bb.className = 'cr-act-btn cr-act-btn--ban';
                bb.title = '封禁该成员 24 小时';
                bb.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-8 10a8 8 0 0 1 12.9-6.3L5.7 16.9A8 8 0 0 1 4 12Zm8 8a8 8 0 0 1-4.9-1.7L18.3 7.1A8 8 0 0 1 12 20Z" fill="currentColor"/></svg>';
                bb.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (!global.confirm('确定封禁「' + m.name + '」24 小时吗？')) { return; }
                    if (self.transport && self.transport._tx) {
                        self.transport._tx({ t: 'ban', uid: m.uid, name: m.name, hours: 24 });
                    }
                });
                acts.appendChild(bb);
            }

            if (acts.children.length) { row.appendChild(acts); }
        }

        frag.appendChild(row);

        return { frag: frag, row: row };
    };

    ChatRoom.prototype._fillBody = function (el, text) {
        var t = String(text).trim();
        if (IMAGE_RE.test(t)) {
            var a = document.createElement('a');
            a.href = t;
            a.target = '_blank';
            a.rel = 'noopener';
            var img = document.createElement('img');
            img.className = 'cr-img';
            img.src = t;
            img.alt = '';
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            a.appendChild(img);
            el.appendChild(a);
            return;
        }
        el.innerHTML = renderText(text);
    };

    ChatRoom.prototype._appendNode = function (m) {
        var prev = this.messages[this.messages.length - 2] || null;
        var n = this._node(m, prev);
        this.nodes[m.id] = n.row;
        this.dom.stream.appendChild(n.frag);
        this._toggleEmpty(false);
        this._applySearchTo(n.row, m);
        this._renderReactions(m.id);
    };

    ChatRoom.prototype._renderAll = function () {
        var frag = document.createDocumentFragment();
        this.nodes = {};
        for (var i = 0; i < this.messages.length; i++) {
            var prev = i > 0 ? this.messages[i - 1] : null;
            var n = this._node(this.messages[i], prev);
            this.nodes[this.messages[i].id] = n.row;
            frag.appendChild(n.frag);
        }
        this.dom.stream.innerHTML = '';
        this.dom.stream.appendChild(frag);
        this._toggleEmpty(this.messages.length === 0);
        var self = this;
        this.messages.forEach(function (m) {
            self._applySearchTo(self.nodes[m.id], m);
            self._renderReactions(m.id);
        });
        this._scrollToBottom(false);
    };

    ChatRoom.prototype._applySearchTo = function (row, m) {
        if (!row) { return; }
        var q = (this.query || '').trim().toLowerCase();
        if (!q) { row.hidden = false; return; }
        row.hidden = String(m.text).toLowerCase().indexOf(q) < 0 &&
            String(m.name).toLowerCase().indexOf(q) < 0;
    };

    ChatRoom.prototype._applySearch = function () {
        var self = this;
        this.messages.forEach(function (m) { self._applySearchTo(self.nodes[m.id], m); });
    };

    ChatRoom.prototype._sysLine = function (name, text) {
        var d = document.createElement('div');
        d.className = 'cr-sys';
        d.innerHTML = '<span><b>' + esc(name) + '</b> ' + esc(text) + '</span>';
        this.dom.stream.appendChild(d);
        this._scrollToBottom(false);
    };

    ChatRoom.prototype._toggleEmpty = function (on) {
        var el = this.dom.stream.querySelector('.cr-empty');
        if (on && !el) {
            el = document.createElement('div');
            el.className = 'cr-empty';
            el.textContent = '还没有人说话，来打个招呼吧';
            this.dom.stream.appendChild(el);
        } else if (!on && el) {
            el.remove();
        }
    };

    ChatRoom.prototype._nearBottom = function () {
        var s = this.dom.stream;
        return s.scrollHeight - s.scrollTop - s.clientHeight < 90;
    };

    ChatRoom.prototype._scrollToBottom = function (smooth) {
        var s = this.dom.stream;
        if (smooth && s.scrollTo) { s.scrollTo({ top: s.scrollHeight, behavior: 'smooth' }); }
        else { s.scrollTop = s.scrollHeight; }
        this.unread = 0;
    };
    /* ---------------------------------------------------------------- 挂载 */

    function readOptions(root) {
        var d = root.dataset;
        return {
            room: d.room || '',
            rooms: d.rooms || '',
            station: d.station || '',
            transport: d.transport || 'ws',
            broker: d.broker || 'wss://broker.emqx.io:8084/mqtt',
            ws: d.ws || '',
            key: d.key || '',
            limit: parseInt(d.limit, 10) > 0 ? parseInt(d.limit, 10) : 200,
            height: parseInt(d.height, 10) > 0 ? parseInt(d.height, 10) : 0,
            wantNotice: d.notice !== 'off'
        };
    }

    function mount(root, opts) {
        if (!root) { return null; }
        var o = Object.assign(readOptions(root), opts || {});
        if (!o.notice && o.transport === 'mqtt' && o.wantNotice !== false) {
            o.notice = '公共频道：消息与在线名单对所有订阅者可见（含最近历史），请勿发送隐私信息。' +
                (o.key ? '' : ' 建议在参数里加 key 让房间不易被搜到。');
        }
        var app = new ChatRoom(root, o);
        if (!global.__wbChatRooms) { global.__wbChatRooms = []; }
        global.__wbChatRooms.push(app);
        return app;
    }

    function autoMount() {
        var nodes = document.querySelectorAll('.chatroom[data-room]');
        for (var i = 0; i < nodes.length; i++) {
            if (!nodes[i].dataset.crMounted) {
                nodes[i].dataset.crMounted = '1';
                mount(nodes[i]);
            }
        }
    }

    /* 登录回来时先把凭证收好，再让组件进场 —— 顺序反了就会先用旧身份连一次 */
    var HASH = absorbHash();
    if (HASH && HASH.token) { setToken(HASH.token); }
    var LOGIN_ERROR = (HASH && HASH.error) || '';

    if (LOGIN_ERROR) {
        // 挂载后把错误显示到首个实例的状态栏上，别让失败静默
        var showErr = function () {
            var el = document.querySelector('.chatroom [data-cr-barleft]');
            if (el) { el.textContent = '登录失败：' + LOGIN_ERROR; el.classList.add('is-warn'); }
        };
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', showErr); }
        else { showErr(); }
    }

    global.ChatRoom = {
        version: VERSION,
        mount: mount,
        autoMount: autoMount,
        registerTransport: registerTransport,
        esc: esc
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
})(window);
