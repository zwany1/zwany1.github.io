/* 首页 iOS 桌面「聊天室」
 * ---------------------------------------------------------------------------
 * 点桌面组件 → 在当前页弹出聊天室（不跳转页面），和工具箱 / 游戏中心一致。
 * 「首次打开才挂载」很重要：组件本身带 WebSocket，若在页面加载时就挂载，
 * 每个访客一进首页就会建立一条连接。
 * 关闭动效与 Esc 复用 footer.html 里的 window.__closePop（本弹层带 .games-pop 类）。
 */
(function () {
    var $ = function (id) { return document.getElementById(id); };
    var pop = $('chat-pop');
    var widget = $('chat-widget');
    if (!pop || !widget) { return; }

    var mask = $('chat-pop-mask');
    var closeBtn = $('chat-pop-close');
    var dock = $('dock-chat');
    var mounted = false;

    /** 首次打开时才挂载（组件脚本可能还没加载完，所以要重试） */
    function mountOnce() {
        if (mounted) { return; }
        var root = pop.querySelector('.chatroom[data-rooms]');
        if (!root) { return; }
        if (!window.ChatRoom) { setTimeout(mountOnce, 60); return; }
        root.dataset.crMounted = '1';
        try {
            window.ChatRoom.mount(root);
            mounted = true;
        } catch (e) {
            // 挂载失败就留着下次打开再试，不要卡死在这个状态
        }
    }

    function openPop() {
        pop.hidden = false;
        if (dock) { dock.hidden = false; }
        mountOnce();
    }

    function closePop() {
        if (window.__closePop) { window.__closePop(pop); }
        else { pop.hidden = true; }
    }

    widget.addEventListener('click', openPop);
    if (dock) { dock.addEventListener('click', openPop); }
    if (mask) { mask.addEventListener('click', closePop); }
    if (closeBtn) { closeBtn.addEventListener('click', closePop); }

    // 关掉之后把 Dock 上的图标也收起来（和工具箱的行为一致）
    if (window.MutationObserver) {
        new MutationObserver(function () {
            if (pop.hidden && dock) { dock.hidden = true; }
        }).observe(pop, { attributes: true, attributeFilter: ['hidden'] });
    }

    // 顶部导航里的「聊天室」：在本页直接开弹层，不再跳到 /chat/
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href$="/chat/"]') : null;
        if (!a) { return; }
        e.preventDefault();
        openPop();
    });

    // 弹层尺寸变化后，把消息区重新滚到底（避免打开时停在半路）
    window.addEventListener('resize', function () {
        if (pop.hidden) { return; }
        var list = window.__wbChatRooms || [];
        var app = list[list.length - 1];
        if (app && typeof app._scrollToBottom === 'function') { app._scrollToBottom(false); }
    });
})();
