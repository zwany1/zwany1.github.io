---
layout: page
title: about
description: 打码改变世界
keywords: 朱, zwany1
comments: true
menu: 关于
permalink: /about/
---

<style>
/* 贪吃蛇游戏样式 */
.snake-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px 0;
}

.snake-game {
    border: 2px solid #333;
    background-color: #f0f0f0;
    display: block;
}

.snake-info {
    margin-top: 10px;
    font-size: 18px;
    font-weight: bold;
    color: #333;
}

.progress-bar {
    width: 300px;
    height: 20px;
    background-color: #ddd;
    border-radius: 10px;
    margin: 10px 0;
    overflow: hidden;
}

.progress {
    height: 100%;
    background-color: #4CAF50;
    width: 0%;
    transition: width 0.3s ease;
}

/* 保持原有内容样式 */
.about-content {
    margin-top: 30px;
    text-align: center;
}

.btn-inline {
    margin-bottom: 15px;
}
</style>

<div class="snake-container">
    <h2>贪吃蛇游戏</h2>
    <canvas id="snake" class="snake-game" width="400" height="400"></canvas>
    <div class="snake-info">
        <div>得分: <span id="score">0</span></div>
        <div class="progress-bar">
            <div id="progress" class="progress"></div>
        </div>
        <div>进度: <span id="progressText">0%</span></div>
    </div>
</div>

<div class="about-content">
    <h2>关于我</h2>
    <p>我是朱，一名热爱编程的开发者。</p>
    <p>仰慕「优雅编码的艺术」。</p>
    <p>坚信熟能生巧，努力改变人生。</p>

    <h3>联系</h3>
    <ul style="list-style-type: none; padding-left: 0;">
    {% for website in site.data.social %}
    <li>{{website.sitename }}：<a href="{{ website.url }}" target="_blank">@{{ website.name }}</a></li>
    {% endfor %}
    {% if site.url contains 'mazhuang.org' %}
    <li>
    微信公众号：<br />
    <img style="height:192px;width:192px;border:1px solid lightgrey;" src="{{ site.url }}/assets/images/qrcode.jpg" alt="朱猪写作" />
    </li>
    {% endif %}
    </ul>

    <h3>Skill Keywords</h3>
    {% for skill in site.data.skills %}
    <h4>{{ skill.name }}</h4>
    <div class="btn-inline">
    {% for keyword in skill.keywords %}
    <button class="btn btn-outline" type="button">{{ keyword }}</button>
    {% endfor %}
    </div>
    {% endfor %}
</div>

<script>
// 贪吃蛇游戏代码
const canvas = document.getElementById('snake');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const progressElement = document.getElementById('progress');
const progressTextElement = document.getElementById('progressText');

// 游戏设置
const gridSize = 20;
const tileCount = canvas.width / gridSize;
const maxProgress = 100;

// 蛇的初始位置和速度
let snake = [{x: 10, y: 10}];
let velocity = {x: 1, y: 0};
let food = {x: 15, y: 15};
let score = 0;
let progress = 0;
let gameLoop = null;
let gameSpeed = 150;

// 开始游戏
startGame();

function startGame() {
    // 重置游戏状态
    snake = [{x: 10, y: 10}];
    velocity = {x: 1, y: 0};
    food = {x: 15, y: 15};
    score = 0;
    progress = 0;
    updateScore();
    updateProgress();
    
    // 启动游戏循环
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, gameSpeed);
}

function update() {
    // 移动蛇头
    const head = {x: snake[0].x + velocity.x, y: snake[0].y + velocity.y};
    
    // 检查边界碰撞
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        changeDirection();
        return;
    }
    
    // 检查自身碰撞
    for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
            changeDirection();
            return;
        }
    }
    
    // 添加新头部
    snake.unshift(head);
    
    // 检查食物碰撞
    if (head.x === food.x && head.y === food.y) {
        score++;
        progress++;
        updateScore();
        updateProgress();
        
        // 生成新食物
        generateFood();
        
        // 检查是否完成100%
        if (progress >= maxProgress) {
            startGame(); // 重新开始游戏
        }
    } else {
        // 移除尾部
        snake.pop();
    }
    
    // 绘制游戏
    draw();
}

function draw() {
    // 清空画布
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制蛇
    ctx.fillStyle = '#4CAF50';
    for (let segment of snake) {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    }
    
    // 绘制食物
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function generateFood() {
    // 生成随机位置
    let newFood;
    while (!newFood || isSnakeOnFood(newFood)) {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    }
    food = newFood;
}

function isSnakeOnFood(pos) {
    for (let segment of snake) {
        if (segment.x === pos.x && segment.y === pos.y) {
            return true;
        }
    }
    return false;
}

function changeDirection() {
    // 随机改变方向
    const directions = [
        {x: 1, y: 0},  // 右
        {x: -1, y: 0}, // 左
        {x: 0, y: 1},  // 下
        {x: 0, y: -1}  // 上
    ];
    
    // 过滤掉相反方向
    const validDirections = directions.filter(dir => 
        !(dir.x === -velocity.x && dir.y === -velocity.y)
    );
    
    // 随机选择一个方向
    velocity = validDirections[Math.floor(Math.random() * validDirections.length)];
}

function updateScore() {
    scoreElement.textContent = score;
}

function updateProgress() {
    const progressPercent = Math.min((progress / maxProgress) * 100, 100);
    progressElement.style.width = progressPercent + '%';
    progressTextElement.textContent = Math.round(progressPercent) + '%';
}

// 自动改变方向（使游戏更有趣）
setInterval(changeDirection, 2000);
</script>
