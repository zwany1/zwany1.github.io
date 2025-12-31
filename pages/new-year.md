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
    background-color: white;
    overflow: hidden;
}

.photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 0;
    width: 100vw;
    aspect-ratio: 1 / 1;
    max-width: 100vh;
    margin: 0 auto;
    position: relative;
}

.grid-item {
    position: relative;
    overflow: hidden;
}

.grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

/* 烟花Canvas */
#fireworksCanvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
}
</style>

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
    <!-- 烟花Canvas -->
    <canvas id="fireworksCanvas"></canvas>
</div>

<!-- 烟花音效 -->
<audio id="fireworkSound" preload="auto">
    <source src="https://assets.mixkit.co/sfx/preview/mixkit-explosion-sound-4027.mp3" type="audio/mpeg">
    Your browser does not support the audio element.
</audio>

<script>
// 烟花效果实现
class Firework {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.fireworks = [];
        this.gravity = 0.15;
        this.friction = 0.98;
        this.maxParticles = 150;
        this.lastFireworkTime = 0;
        this.fireworkInterval = 500;
        this.colors = [
            '#FF1461', '#18FF92', '#5A87FF', '#FBF38C',
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ];
        
        // 设置Canvas尺寸
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 开始动画循环
        this.animate();
    }
    
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    // 创建烟花
    createFirework() {
        const firework = {
            x: Math.random() * this.canvas.width,
            y: this.canvas.height,
            targetY: Math.random() * (this.canvas.height * 0.3) + this.canvas.height * 0.1,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 8 - 5,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            size: Math.random() * 3 + 2,
            exploded: false,
            explosionRadius: Math.random() * 50 + 50,
            particleCount: Math.floor(Math.random() * 50) + 80
        };
        
        this.fireworks.push(firework);
    }
    
    // 创建爆炸粒子
    createParticles(firework) {
        const { x, y, color, explosionRadius, particleCount } = firework;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Math.random() * 5 + 2;
            
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Math.random() * 3 + 1,
                alpha: 1,
                decay: Math.random() * 0.02 + 0.01
            };
            
            this.particles.push(particle);
        }
        
        // 播放爆炸声音
        this.playExplosionSound();
    }
    
    // 播放爆炸声音
    playExplosionSound() {
        const sound = document.getElementById('fireworkSound');
        if (sound) {
            sound.currentTime = 0;
            sound.volume = 0.3;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    }
    
    // 更新烟花
    updateFireworks() {
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const firework = this.fireworks[i];
            
            if (!firework.exploded) {
                // 未爆炸的烟花向上飞行
                firework.x += firework.vx;
                firework.y += firework.vy;
                
                // 应用重力
                firework.vy += this.gravity;
                
                // 到达目标高度，爆炸
                if (firework.y <= firework.targetY) {
                    firework.exploded = true;
                    this.createParticles(firework);
                    this.fireworks.splice(i, 1);
                }
            }
        }
    }
    
    // 更新粒子
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // 应用速度
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 应用重力和阻力
            particle.vy += this.gravity;
            particle.vx *= this.friction;
            particle.vy *= this.friction;
            
            // 减少透明度
            particle.alpha -= particle.decay;
            
            // 移除死亡的粒子
            if (particle.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    // 绘制烟花
    drawFireworks() {
        for (const firework of this.fireworks) {
            if (!firework.exploded) {
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'lighter';
                this.ctx.fillStyle = firework.color;
                this.ctx.beginPath();
                this.ctx.arc(firework.x, firework.y, firework.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }
    }
    
    // 绘制粒子
    drawParticles() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        
        for (const particle of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }
    
    // 动画循环
    animate() {
        const now = Date.now();
        
        // 清空Canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 定期创建新烟花
        if (now - this.lastFireworkTime > this.fireworkInterval) {
            this.createFirework();
            this.lastFireworkTime = now;
        }
        
        // 更新和绘制烟花和粒子
        this.updateFireworks();
        this.updateParticles();
        this.drawFireworks();
        this.drawParticles();
        
        // 继续动画循环
        requestAnimationFrame(() => this.animate());
    }
}

// 页面加载完成后初始化烟花效果
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('fireworksCanvas');
    if (canvas) {
        new Firework(canvas);
    }
});
</script>