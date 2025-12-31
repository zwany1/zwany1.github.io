---
layout: page
title: 新年快乐
description: 新年祝福页面
keywords: 新年, 祝福, 新年快乐
comments: true
permalink: /new-year/
---

<style>
/* 纯九宫格布局 */
body {
    margin: 0;
    padding: 0;
    background: #000;
    overflow: hidden;
    height: 100vh;
    font-family: "Microsoft YaHei", sans-serif;
    color: white;
}

.photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 0;
    width: 80vw;
    aspect-ratio: 1 / 1;
    max-width: 80vh;
    margin: 0 auto;
    position: relative;
    z-index: 2;
}

.grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

/* 烟花效果样式 */
canvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
}

.title {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    text-align: center;
    font-size: 2.5rem;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.7);
    animation: glow 2s infinite alternate;
}

@keyframes glow {
    from { text-shadow: 0 0 5px #fff, 0 0 10px #fff; }
    to { text-shadow: 0 0 15px #ff00de, 0 0 30px #ff00de, 0 0 40px #ff00de; }
}
</style>

<div class="title">🎉 新年快乐！2026 🎆</div>
<canvas id="fireworks"></canvas>

<div class="photo-grid">
    <div class="grid-item">
        <img src="/images/kuanian/36f9e09baeee6147b39475dec1e4f58d.jpg" alt="新年祝福1">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/09bf3aff6c4829f312d97ba4246d1cb0.jpg" alt="新年祝福2">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/6c130f4dea83d5e6354db93c04ed4e25.jpg" alt="新年祝福3">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/1a1034079ae5b092aa76e0ca12f7a1c5.jpg" alt="新年祝福4">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/6195dbc6da416bdc342784bb42f085eb.jpg" alt="新年祝福5">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/16e61fd03ef4a3d217b4452e0f305c50.jpg" alt="新年祝福6">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/4f039159e17a8ce3a60932e6dec23795.jpg" alt="新年祝福7">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/42482904d828ceea3795d8d12c3d31b9.jpg" alt="新年祝福8">
    </div>
    <div class="grid-item">
        <img src="/images/kuanian/961d5038f39fe0728888be1920f49eb9.jpg" alt="新年祝福9">
    </div>
</div>

<script>
    const canvas = document.getElementById('fireworks');
    const ctx = canvas.getContext('2d');

    // 设置画布尺寸
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 随机工具函数
    const random = (min, max) => Math.random() * (max - min) + min;
    const randomColor = () => `hsl(${Math.floor(random(0, 360))}, 100%, 60%)`;

    // 粒子类
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.radius = random(1, 3);
            this.velocity = {
                x: random(-6, 6),
                y: random(-8, -2)
            };
            this.alpha = 1;
            this.gravity = 0.05;
            this.friction = 0.95;
            this.decay = random(0.01, 0.03);
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        update() {
            this.velocity.x *= this.friction;
            this.velocity.y += this.gravity;
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= this.decay;
            this.draw();
            return this.alpha > 0;
        }
    }

    // 烟花类
    class Firework {
        constructor(x, y) {
            this.x = x || random(50, canvas.width - 50);
            this.y = y || canvas.height;
            this.targetY = random(100, canvas.height / 2);
            this.speed = random(2, 6);
            this.color = randomColor();
            this.particles = [];
            this.exploded = false;
        }

        draw() {
            if (!this.exploded) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        update() {
            if (!this.exploded) {
                this.y -= this.speed;
                if (this.y <= this.targetY) {
                    this.exploded = true;
                    // 爆炸生成粒子
                    for (let i = 0; i < 150; i++) {
                        this.particles.push(new Particle(this.x, this.y, this.color));
                    }
                }
                this.draw();
            } else {
                this.particles = this.particles.filter(p => p.update());
            }
            return this.exploded ? this.particles.length > 0 : true;
        }
    }

    // 主动画循环
    const fireworks = [];
    let hue = 0;

    function animate() {
        requestAnimationFrame(animate);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 随机发射新烟花（每15~30帧一次）
        if (Math.random() < 0.03) {
            fireworks.push(new Firework());
        }

        // 更新所有烟花
        for (let i = fireworks.length - 1; i >= 0; i--) {
            if (!fireworks[i].update()) {
                fireworks.splice(i, 1);
            }
        }
    }

    animate();
</script>