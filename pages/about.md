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
/* 全局样式 */
body {
    font-family: 'Arial', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    margin: 0;
    padding: 0;
    color: white;
    overflow-x: hidden;
}

.about-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* 头部区域 */
.header {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
}

.avatar {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background-color: white;
    margin-right: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.avatar img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
}

.title-section h1 {
    font-size: 48px;
    margin: 0;
    color: white;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.title-section h1 span {
    color: #ffd700;
}

.title-section p {
    font-size: 18px;
    margin: 10px 0;
    color: rgba(255, 255, 255, 0.9);
}

/* 职业信息 */
职业信息 {
    margin-bottom: 20px;
}

职业信息 p {
    font-size: 16px;
    margin: 5px 0;
}

职业信息 p:first-child {
    color: #ffd700;
    font-weight: bold;
}

/* 社交图标 */
social-icons {
    margin-top: 20px;
}

social-icons a {
    color: white;
    font-size: 24px;
    margin-right: 15px;
    text-decoration: none;
    transition: color 0.3s ease;
}

social-icons a:hover {
    color: #ffd700;
}

/* 网格图案 */
grid-section {
    margin: 40px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.grid {
    display: grid;
    grid-template-columns: repeat(50, 8px);
    grid-template-rows: repeat(5, 8px);
    gap: 2px;
    margin-bottom: 10px;
}

.grid-item {
    width: 8px;
    height: 8px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
}

.grid-item.green {
    background-color: #4CAF50;
}

.grid-item.purple {
    background-color: #9C27B0;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    width: 70%;
    background-color: #4CAF50;
}

/* 切片和项目 */
slices-projects {
    display: flex;
    justify-content: space-between;
    margin: 40px 0;
    flex-wrap: wrap;
}

slice-section, .project-section {
    flex: 1;
    min-width: 300px;
    margin: 10px;
}

slice-section h3, .project-section h3 {
    font-size: 18px;
    margin-bottom: 20px;
    color: #ffd700;
}

.slice-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
}

.slice-tag {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 5px 15px;
    border-radius: 20px;
    font-size: 14px;
}

.slice-links, .project-links {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
}

.slice-link, .project-link {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 10px 15px;
    border-radius: 5px;
    text-decoration: none;
    color: white;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.slice-link:hover, .project-link:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.slice-link i, .project-link i {
    font-size: 18px;
}

/* 技能部分 */
skills-section {
    margin: 40px 0;
}

skills-section h3 {
    font-size: 18px;
    margin-bottom: 20px;
    color: #ffd700;
}

.skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: center;
}

.skill-icon {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 15px;
    border-radius: 10px;
    font-size: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    transition: all 0.3s ease;
}

.skill-icon:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .header {
        flex-direction: column;
        text-align: center;
    }
    
    .avatar {
        margin-right: 0;
        margin-bottom: 20px;
    }
    
    .title-section h1 {
        font-size: 36px;
    }
    
    .slices-projects {
        flex-direction: column;
    }
    
    .grid {
        grid-template-columns: repeat(25, 8px);
    }
}
</style>

<div class="about-container">
    <!-- 头部区域 -->
    <div class="header">
        <div class="avatar">
            <img src="{{ site.url }}/assets/images/d56012bab88f5aabe76bb1fc7eeeb9c6.jpg" alt="Z.w.YI" />
        </div>
        <div class="title-section">
            <h1>Hello I'm <span>Z.w.YI</span></h1>
            <职业信息>
                <p>Full Stack Developer</p>
                <p>The only way to do great is to love what you do.</p>
            </职业信息>
            <p style="color: #ffd700; margin-top: 10px;">📍 China-Henan</p>
            <social-icons>
                <a href="#" title="GitHub"><i class="fab fa-github"></i></a>
                <a href="#" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="#" title="Weibo"><i class="fab fa-weibo"></i></a>
                <a href="#" title="Blog"><i class="fas fa-blog"></i></a>
                <a href="#" title="Light"><i class="fas fa-lightbulb"></i></a>
            </social-icons>
        </div>
    </div>
    
    <!-- 网格图案 -->
    <grid-section>
        <div class="grid">
            <!-- 这里可以根据需要生成网格图案 -->
            {% for i in (1..250) %}
                {% if i % 7 == 0 %}
                    <div class="grid-item green"></div>
                {% elsif i % 31 == 0 %}
                    <div class="grid-item purple"></div>
                {% else %}
                    <div class="grid-item"></div>
                {% endif %}
            {% endfor %}
        </div>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
    </grid-section>
    
    <!-- 切片和项目 -->
    <slices-projects>
        <slice-section>
            <h3>🗂️ slice</h3>
            <div class="slice-tags">
                <div class="slice-tag">前端</div>
                <div class="slice-tag">小学生</div>
                <div class="slice-tag">阅读</div>
                <div class="slice-tag">linux</div>
                <div class="slice-tag">配置</div>
                <div class="slice-tag">游戏</div>
                <div class="slice-tag">旅行</div>
            </div>
            <div class="slice-links">
                <a href="#" class="slice-link">
                    <i class="fas fa-book"></i>
                    动态字符
                </a>
                <a href="#" class="slice-link">
                    <i class="fas fa-server"></i>
                    CDN动态加速
                </a>
                <a href="#" class="slice-link">
                    <i class="fas fa-code"></i>
                    202403
                </a>
                <a href="#" class="slice-link">
                    <i class="fas fa-calendar"></i>
                    202402
                </a>
                <a href="#" class="slice-link">
                    <i class="fas fa-bullhorn"></i>
                    出站不掉...
                </a>
            </div>
        </slice-section>
        
        <slice-section>
            <h3>📚 slice</h3>
            <div class="slice-links">
                <a href="#" class="slice-link">
                    <i class="fas fa-book"></i>
                    博客密
                </a>
                <a href="#" class="slice-link">
                    <i class="fas fa-globe"></i>
                    文档站
                </a>
                <a href="#" class="slice-link">
                    <i class="fas fa-cat"></i>
                    测试
                </a>

            
            </div>
            
            <h3 style="margin-top: 30px;">💼 project</h3>
            <div class="project-links">
                <a href="#" class="project-link">
                    <i class="fas fa-home"></i>
                    z.w.yi主页
                </a>
                <a href="#" class="project-link">
                    <i class="fas fa-palette"></i>
                    z.w.yi主题
                </a>
            </div>
        </slice-section>
    </slices-projects>
    
    <!-- 技能部分 -->
    <skills-section>
        <h3>⚡ skills</h3>
        <div class="skills-grid" style="display: flex; justify-content: center; align-items: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; overflow: hidden;">
            <img src="{{ site.url }}/images/fragments/image.png" alt="Skills" style="max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 5px;" />
        </div>
    </skills-section>
</div>

<!-- 添加Font Awesome图标库 -->
<script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
