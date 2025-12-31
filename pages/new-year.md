---
layout: page
title: 新年快乐
description: 新年祝福页面
keywords: 新年, 祝福, 新年快乐
comments: true
permalink: /new-year/
---

<style>
/* 新年九宫格页面样式 */
body {
    background-color: #f5f5f5;
    margin: 0;
    padding: 0;
    font-family: 'Arial', sans-serif;
}

.new-year-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    text-align: center;
}

.new-year-title {
    font-size: 64px;
    font-weight: 900;
    color: #ff6b6b;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    animation: bounce 2s ease infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-20px); }
    60% { transform: translateY(-10px); }
}

.new-year-subtitle {
    font-size: 28px;
    color: #666;
    margin-bottom: 40px;
}

/* 九宫格布局 */
.photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 10px;
    max-width: 800px;
    margin: 0 auto;
    background-color: #fff;
    padding: 20px;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

/* 确保九宫格为正方形 */
.photo-grid::before {
    content: '';
    padding-bottom: 100%;
    grid-row: 1 / 1;
    grid-column: 1 / 1;
}

.photo-grid > *:first-child {
    grid-row: 1 / 1;
    grid-column: 1 / 1;
}

.grid-item {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.grid-item:hover {
    transform: scale(1.02);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.grid-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.grid-item:hover img {
    transform: scale(1.1);
}

/* 图片标题 */
.grid-item::after {
    content: attr(data-title);
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    color: white;
    padding: 20px 15px 15px;
    font-size: 14px;
    opacity: 0;
    transform: translateY(100%);
    transition: all 0.3s ease;
    text-align: center;
}

.grid-item:hover::after {
    opacity: 1;
    transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .new-year-title {
        font-size: 48px;
    }
    
    .new-year-subtitle {
        font-size: 24px;
    }
    
    .photo-grid {
        gap: 8px;
        padding: 15px;
        max-width: 90%;
    }
}

@media (max-width: 480px) {
    .new-year-title {
        font-size: 36px;
    }
    
    .new-year-subtitle {
        font-size: 20px;
    }
    
    .photo-grid {
        gap: 5px;
        padding: 10px;
        border-radius: 10px;
    }
    
    .grid-item {
        border-radius: 5px;
    }
}
</style>

<div class="new-year-container">
    <h1 class="new-year-title">🎉 新年快乐 🎉</h1>
    <h2 class="new-year-subtitle">2026 新年快乐</h2>
    
    <!-- 九宫格照片墙 -->
    <div class="photo-grid">
        <div class="grid-item" data-title="新年大吉">
            <img src="/images/kuanian/09bf3aff6c4829f312d97ba4246d1cb0.jpg" alt="新年大吉" loading="lazy">
        </div>
        <div class="grid-item" data-title="福到">
            <img src="/images/kuanian/16e61fd03ef4a3d217b4452e0f305c50.jpg" alt="福到" loading="lazy">
        </div>
        <div class="grid-item" data-title="新年快乐">
            <img src="/images/kuanian/1a1034079ae5b092aa76e0ca12f7a1c5.jpg" alt="新年快乐" loading="lazy">
        </div>
        <div class="grid-item" data-title="马到成功">
            <img src="/images/kuanian/36f9e09baeee6147b39475dec1e4f58d.jpg" alt="马到成功" loading="lazy">
        </div>
        <div class="grid-item" data-title="新年祝福">
            <img src="/images/kuanian/42482904d828ceea3795d8d12c3d31b9.jpg" alt="新年祝福" loading="lazy">
        </div>
        <div class="grid-item" data-title="恭喜发财">
            <img src="/images/kuanian/4f039159e17a8ce3a60932e6dec23795.jpg" alt="恭喜发财" loading="lazy">
        </div>
        <div class="grid-item" data-title="福如东海">
            <img src="/images/kuanian/6195dbc6da416bdc342784bb42f085eb.jpg" alt="福如东海" loading="lazy">
        </div>
        <div class="grid-item" data-title="万事如意">
            <img src="/images/kuanian/6c130f4dea83d5e6354db93c04ed4e25.jpg" alt="万事如意" loading="lazy">
        </div>
        <div class="grid-item" data-title="吉星高照">
            <img src="/images/kuanian/961d5038f39fe0728888be1920f49eb9.jpg" alt="吉星高照" loading="lazy">
        </div>
    </div>
</div>