/* 全站小彩蛋：Konami 秘籍彩带 + 离开页面标题变化 */
(function () {
    /* Konami：↑↑↓↓←→←→BA 触发全屏彩带 */
    var SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0, raining = false;
    document.addEventListener('keydown', function (e) {
        var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        pos = (k === SEQ[pos]) ? pos + 1 : (k === SEQ[0] ? 1 : 0);
        if (pos === SEQ.length) { pos = 0; confetti(); }
    });
    function confetti() {
        if (raining) return;
        raining = true;
        var c = document.createElement('canvas');
        c.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';
        c.width = innerWidth; c.height = innerHeight;
        document.body.appendChild(c);
        var ctx = c.getContext('2d');
        var COLORS = ['#ff5f57', '#febc2e', '#28c840', '#49b1f5', '#fc5c7d', '#a29bfe'];
        var parts = [];
        for (var i = 0; i < 160; i++) {
            parts.push({
                x: Math.random() * c.width,
                y: -20 - Math.random() * c.height * 0.5,
                w: 6 + Math.random() * 6,
                h: 8 + Math.random() * 8,
                vy: 2 + Math.random() * 3.5,
                vx: -1.5 + Math.random() * 3,
                rot: Math.random() * Math.PI,
                vr: -0.12 + Math.random() * 0.24,
                color: COLORS[(Math.random() * COLORS.length) | 0]
            });
        }
        var start = Date.now();
        (function frame() {
            ctx.clearRect(0, 0, c.width, c.height);
            parts.forEach(function (p) {
                p.x += p.vx; p.y += p.vy; p.rot += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            if (Date.now() - start < 4000) requestAnimationFrame(frame);
            else { c.remove(); raining = false; }
        })();
    }

    /* 离开页面：标题变成求回归彩蛋 */
    var ORIG = document.title;
    var SAD = '(´･_･`) 回来看看～';
    document.addEventListener('visibilitychange', function () {
        document.title = document.hidden ? SAD : ORIG;
    });
})();
