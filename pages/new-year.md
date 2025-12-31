---
layout: page
title: 新年快乐
description: 新年祝福页面
keywords: 新年, 祝福, 新年快乐
comments: true
permalink: /new-year/
---

<style>
/* 新年页面样式 */
.new-year-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    text-align: center;
    background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dfe6e9);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

.new-year-title {
    font-size: 64px;
    font-weight: 900;
    color: #fff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    margin-bottom: 30px;
    animation: bounce 2s ease infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-20px); }
    60% { transform: translateY(-10px); }
}

.new-year-subtitle {
    font-size: 32px;
    color: #fff;
    margin-bottom: 40px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.new-year-wishes {
    font-size: 24px;
    color: #fff;
    margin-bottom: 50px;
    line-height: 1.8;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.new-year-countdown {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 30px;
    border-radius: 15px;
    margin-bottom: 50px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.countdown-title {
    font-size: 28px;
    color: #fff;
    margin-bottom: 20px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.countdown-display {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
}

.countdown-item {
    background-color: rgba(255, 255, 255, 0.3);
    padding: 20px;
    border-radius: 10px;
    min-width: 100px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(5px);
}

.countdown-number {
    font-size: 48px;
    font-weight: bold;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.countdown-label {
    font-size: 16px;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    margin-top: 5px;
}

.new-year-decoration {
    margin: 50px 0;
}

.decoration-emoji {
    font-size: 64px;
    margin: 0 10px;
    animation: float 3s ease-in-out infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
}

.decoration-emoji:nth-child(1) { animation-delay: 0s; }
.decoration-emoji:nth-child(2) { animation-delay: 0.5s; }
.decoration-emoji:nth-child(3) { animation-delay: 1s; }
.decoration-emoji:nth-child(4) { animation-delay: 1.5s; }
.decoration-emoji:nth-child(5) { animation-delay: 2s; }

.new-year-quote {
    font-size: 20px;
    color: #fff;
    font-style: italic;
    margin-top: 40px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .new-year-title {
        font-size: 48px;
    }
    
    .new-year-subtitle {
        font-size: 24px;
    }
    
    .new-year-wishes {
        font-size: 20px;
    }
    
    .countdown-display {
        gap: 10px;
    }
    
    .countdown-item {
        min-width: 80px;
        padding: 15px;
    }
    
    .countdown-number {
        font-size: 36px;
    }
    
    .decoration-emoji {
        font-size: 48px;
        margin: 0 5px;
    }
}

@media (max-width: 480px) {
    .new-year-title {
        font-size: 36px;
    }
    
    .new-year-subtitle {
        font-size: 20px;
    }
    
    .new-year-wishes {
        font-size: 18px;
    }
    
    .countdown-item {
        min-width: 60px;
        padding: 10px;
    }
    
    .countdown-number {
        font-size: 28px;
    }
    
    .countdown-label {
        font-size: 14px;
    }
    
    .decoration-emoji {
        font-size: 36px;
    }
}
</style>

<div class="new-year-container">
    <h1 class="new-year-title">🎉 新年快乐 🎉</h1>
    <h2 class="new-year-subtitle">2026 新年快乐</h2>
    
    <div class="new-year-decoration">
        <span class="decoration-emoji">🎊</span>
        <span class="decoration-emoji">🎁</span>
        <span class="decoration-emoji">🎈</span>
        <span class="decoration-emoji">✨</span>
        <span class="decoration-emoji">🎊</span>
    </div>
    
    <div class="new-year-wishes">
        <p>愿新的一年里：</p>
        <p>🍀 万事如意，心想事成</p>
        <p>💰 财源广进，事业有成</p>
        <p>❤️ 身体健康，家庭幸福</p>
        <p>🌟 前程似锦，美梦成真</p>
        <p>🎈 快乐常伴，笑容满面</p>
    </div>
    
    <div class="new-year-countdown">
        <h3 class="countdown-title">距离新年还有</h3>
        <div class="countdown-display">
            <div class="countdown-item">
                <div class="countdown-number" id="days">00</div>
                <div class="countdown-label">天</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-number" id="hours">00</div>
                <div class="countdown-label">时</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-number" id="minutes">00</div>
                <div class="countdown-label">分</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-number" id="seconds">00</div>
                <div class="countdown-label">秒</div>
            </div>
        </div>
    </div>
    
    <div class="new-year-decoration">
        <span class="decoration-emoji">🎊</span>
        <span class="decoration-emoji">🎁</span>
        <span class="decoration-emoji">🎈</span>
        <span class="decoration-emoji">✨</span>
        <span class="decoration-emoji">🎊</span>
    </div>
    
    <div class="new-year-quote">
        "新的一年，新的开始，新的希望，新的梦想。"
    </div>
</div>

<!-- 倒计时脚本 -->
<script>
function updateCountdown() {
    // 设置目标日期为2026年1月1日
    const targetDate = new Date('2026-01-01T00:00:00');
    const now = new Date();
    const difference = targetDate - now;
    
    // 计算剩余时间
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    // 更新显示
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// 初始调用一次，然后每秒更新一次
updateCountdown();
setInterval(updateCountdown, 1000);
</script>