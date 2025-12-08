---
layout: page
title: about
description: 关于我
keywords: Zyyo, zwany1
comments: false
menu: 关于
permalink: /about/
---

<style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: #fafafa;
  color: #333;
  line-height: 1.6;
}

/* 全局容器 */
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

/* 个人资料区 */
.profile-container {
  text-align: center;
  padding: 80px 20px;
  animation: fadeIn 1s ease-out;
}

.profile-header {
  margin-bottom: 40px;
}

/* 头像样式 */
.profile-avatar {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 20px;
  border: 5px solid #fff;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.profile-avatar:hover {
  transform: scale(1.1);
}

/* 姓名和标签 */
.profile-name {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: #333;
}

.profile-tagline {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 30px;
}

/* 社交链接 */
.social-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
}

.social-link {
  display: inline-block;
  width: 50px;
  height: 50px;
  line-height: 50px;
  text-align: center;
  border-radius: 50%;
  background-color: #fff;
  color: #666;
  font-size: 1.5rem;
  text-decoration: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.social-link:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  background-color: #333;
  color: #fff;
}

/* 内容区块 */
.content-section {
  background-color: #fff;
  border-radius: 10px;
  padding: 40px;
  margin-bottom: 40px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
  animation: slideUp 0.8s ease-out;
  animation-delay: 0.3s;
  animation-fill-mode: both;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
  border-left: 4px solid #333;
  padding-left: 15px;
}

.section-content {
  color: #666;
  font-size: 1.1rem;
  line-height: 1.8;
}

/* 时间线 */
.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #eee;
}

.timeline-item {
  position: relative;
  margin-bottom: 30px;
  padding-left: 20px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -33px;
  top: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #333;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px #333;
}

.timeline-date {
  font-size: 0.9rem;
  color: #999;
  margin-bottom: 5px;
}

.timeline-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: #333;
}

.timeline-content {
  font-size: 1rem;
  color: #666;
}

/* 项目列表 */
.project-list {
  list-style: none;
}

.project-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.project-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.project-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.project-description {
  font-size: 1rem;
  color: #666;
  margin-bottom: 10px;
}

.project-link {
  display: inline-block;
  color: #333;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.project-link:hover {
  color: #666;
}

/* 技能标签 */
.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-tag {
  display: inline-block;
  padding: 8px 15px;
  border-radius: 20px;
  background-color: #f5f5f5;
  color: #666;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.skill-tag:hover {
  background-color: #333;
  color: #fff;
  transform: translateY(-2px);
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-container {
    padding: 60px 20px;
  }
  
  .profile-name {
    font-size: 2rem;
  }
  
  .social-links {
    flex-wrap: wrap;
    gap: 15px;
  }
  
  .content-section {
    padding: 30px 20px;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
}

/* 隐藏默认的导航栏和页脚 */
.page .site-header,
.page .site-footer {
  display: none;
}

/* 确保页面内容居中 */
.page .container.content {
  padding: 0;
  background-color: transparent;
  box-shadow: none;
}
</style>

<div class="profile-container">
  <div class="profile-header">
    <!-- 使用指定的头像图片 -->
    <img class="profile-avatar" src="{{ site.url }}/assets/images/qrcode.jpg" alt="Avatar">
    <h1 class="profile-name">Zyyo</h1>
    <p class="profile-tagline">Just for fun</p>
  </div>
  
  <!-- 社交链接 -->
  <div class="social-links">
    {% for site in site.social %}
    <a class="social-link" href="{{ site.url }}" target="_blank" title="{{ site.name }}">
      <span class="octicon octicon-{{ site.octicon }}"></span>
    </a>
    {% endfor %}
  </div>
  
  <!-- 个人简介 -->
  <div class="content-section">
    <h2 class="section-title">关于我</h2>
    <div class="section-content">
      <p>热爱编程的开发者，坚信熟能生巧，在不断练习中成长。</p>
      <p>专注于前端开发，喜欢探索新技术，分享学习心得。</p>
    </div>
  </div>
  
  <!-- 时间线 -->
  <div class="content-section">
    <h2 class="section-title">经历</h2>
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-date">2023 - 至今</div>
        <div class="timeline-title">前端开发工程师</div>
        <div class="timeline-content">专注于React、Vue等前端框架的应用开发</div>
      </div>
      <div class="timeline-item">
        <div class="timeline-date">2021 - 2023</div>
        <div class="timeline-title">学习编程</div>
        <div class="timeline-content">系统学习前端开发技术栈</div>
      </div>
      <div class="timeline-item">
        <div class="timeline-date">2018 - 2021</div>
        <div class="timeline-title">计算机相关专业学习</div>
        <div class="timeline-content">打下扎实的计算机基础</div>
      </div>
    </div>
  </div>
  
  <!-- 项目 -->
  <div class="content-section">
    <h2 class="section-title">项目</h2>
    <div class="project-list">
      <div class="project-item">
        <div class="project-title">个人博客</div>
        <div class="project-description">使用Jekyll搭建的个人技术博客</div>
        <a class="project-link" href="{{ site.url }}" target="_blank">查看详情</a>
      </div>
      <div class="project-item">
        <div class="project-title">前端组件库</div>
        <div class="project-description">基于React的UI组件库</div>
        <a class="project-link" href="#" target="_blank">查看详情</a>
      </div>
      <div class="project-item">
        <div class="project-title">响应式网站模板</div>
        <div class="project-description">适用于各种设备的现代网站模板</div>
        <a class="project-link" href="#" target="_blank">查看详情</a>
      </div>
    </div>
  </div>
  
  <!-- 技能 -->
  <div class="content-section">
    <h2 class="section-title">技能</h2>
    <div class="skills-container">
      <span class="skill-tag">HTML5</span>
      <span class="skill-tag">CSS3</span>
      <span class="skill-tag">JavaScript</span>
      <span class="skill-tag">React</span>
      <span class="skill-tag">Vue</span>
      <span class="skill-tag">Node.js</span>
      <span class="skill-tag">Git</span>
      <span class="skill-tag">Webpack</span>
      <span class="skill-tag">TypeScript</span>
      <span class="skill-tag">Sass</span>
      <span class="skill-tag">MongoDB</span>
      <span class="skill-tag">Express</span>
    </div>
  </div>
</div>
