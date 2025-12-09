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
    background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%);
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
.职业信息 {
    margin-bottom: 15px;
}

.职业信息 p {
    font-size: 16px;
    margin: 5px 0;
    display: flex;
    align-items: center;
}

.职业信息 p:first-child {
    color: #ffd700;
    font-weight: bold;
}

/* 社交图标 */
.social-icons {
    margin-top: 15px;
}

.social-icons a {
    color: white;
    font-size: 24px;
    margin-right: 15px;
    text-decoration: none;
    transition: color 0.3s ease;
}

.social-icons a:hover {
    color: #ffd700;
}

/* 网格图案 */
.grid-section {
    margin: 30px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.grid {
    display: grid;
    grid-template-columns: repeat(60, 6px);
    grid-template-rows: repeat(8, 6px);
    gap: 1px;
    margin-bottom: 10px;
}

.grid-item {
    width: 6px;
    height: 6px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 1px;
}

.grid-item.green {
    background-color: #4CAF50;
}

.grid-item.purple {
    background-color: #9C27B0;
}

.progress-bar {
    width: 100%;
    height: 2px;
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 1px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    width: 80%;
    background-color: #4CAF50;
}

/* 站点和项目 */
.sites-projects {
    margin: 30px 0;
}

.site-section, .project-section {
    margin-bottom: 30px;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
}

.site-section h3, .project-section h3 {
    font-size: 20px;
    margin-bottom: 20px;
    color: #ffd700;
    display: flex;
    align-items: center;
    gap: 10px;
}

.site-links, .project-links {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
}

.site-link, .project-link {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 12px 20px;
    border-radius: 8px;
    text-decoration: none;
    color: white;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.site-link:hover, .project-link:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.site-link i, .project-link i {
    font-size: 20px;
    color: #ffd700;
}

/* 技能部分 */
.skills-section {
    margin: 30px 0;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
}

.skills-section h3 {
    font-size: 20px;
    margin-bottom: 20px;
    color: #ffd700;
    text-align: center;
}

.skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: center;
}

.skill-icon {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 12px;
    border-radius: 8px;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
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
    
    .grid {
        grid-template-columns: repeat(30, 6px);
    }
    
    .site-links, .project-links {
        flex-direction: column;
    }
}
</style>

<div class="about-container">
    <!-- 头部区域 -->
    <div class="header">
        <div class="avatar">
            <img src="{{ site.url }}/assets/images/d56012bab88f5aabe76bb1fc7eeeb9c6.jpg" alt="Zyyo" />
        </div>
        <div class="title-section">
            <h1>Hello I'm <span>Zyyo</span></h1>
            <div class="职业信息">
                <p><i class="fas fa-briefcase"></i> Full Stack Developer</p>
                <p><i class="fas fa-quote-left"></i> The only way to do great is to love what you do.</p>
            </div>
            <div style="display: flex; align-items: center; gap: 20px; margin: 15px 0;">
                <p style="color: #ffd700; display: flex; align-items: center; gap: 5px;"><i class="fas fa-map-marker-alt"></i> China-Henan</p>
                <p style="color: #ffd700; display: flex; align-items: center; gap: 5px;"><i class="fas fa-code"></i> Stas</p>
            </div>
            <div class="social-icons">
                <a href="#" title="Refresh"><i class="fas fa-sync-alt"></i></a>
                <a href="#" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="#" title="Comment"><i class="fas fa-comment"></i></a>
                <a href="#" title="Bookmark"><i class="fas fa-bookmark"></i></a>
                <a href="#" title="Light"><i class="fas fa-lightbulb"></i></a>
            </div>
        </div>
    </div>
    
    <!-- 网格图案 -->
    <div class="grid-section">
        <div class="grid">
            <!-- 这里可以根据需要生成网格图案 -->
            {% for i in (1..480) %}
                {% if i % 5 == 0 or i % 7 == 0 or i % 11 == 0 %}
                    <div class="grid-item green"></div>
                {% elsif i % 13 == 0 or i % 17 == 0 %}
                    <div class="grid-item purple"></div>
                {% else %}
                    <div class="grid-item"></div>
                {% endif %}
            {% endfor %}
        </div>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
    </div>
    
    <!-- 站点和项目 -->
    <div class="sites-projects">
        <div class="site-section">
            <h3>📦 site</h3>
            <div class="site-links">
                <a href="#" class="site-link">
                    <i class="fas fa-home"></i>
                    博客
                </a>
                <a href="#" class="site-link">
                    <i class="fas fa-book"></i>
                    文档网站
                </a>
                <a href="#" class="site-link">
                    <i class="fas fa-cat"></i>
                    测试
                </a>
                <a href="#" class="site-link">
                    <i class="fas fa-heart"></i>
                    测试
                </a>
                <a href="#" class="site-link">
                    <i class="fas fa-heart"></i>
                    测试
                </a>
                <a href="#" class="site-link">
                    <i class="fas fa-heart"></i>
                    测试
                </a>
            </div>
        </div>
        
        <div class="project-section">
            <h3>💼 project</h3>
            <div class="project-links">
                <a href="#" class="project-link">
                    <i class="fas fa-home"></i>
                    ZYYO主页
                </a>
                <a href="#" class="project-link">
                    <i class="fas fa-palette"></i>
                    ZYYO主题
                </a>
                <a href="#" class="project-link">
                    <i class="fas fa-palette"></i>
                    一键切换
                </a>
            </div>
        </div>
    </div>
    
    <!-- 技能部分 -->
    <div class="skills-section">
        <h3>⚡ skills</h3>
        <div class="skills-grid">
            <div class="skill-icon" title="HTML"><i class="fab fa-html5"></i></div>
            <div class="skill-icon" title="CSS"><i class="fab fa-css3-alt"></i></div>
            <div class="skill-icon" title="JavaScript"><i class="fab fa-js"></i></div>
            <div class="skill-icon" title="Python"><i class="fab fa-python"></i></div>
            <div class="skill-icon" title="Java"><i class="fab fa-java"></i></div>
            <div class="skill-icon" title="Git"><i class="fab fa-git"></i></div>
            <div class="skill-icon" title="GitHub"><i class="fab fa-github"></i></div>
            <div class="skill-icon" title="Linux"><i class="fab fa-linux"></i></div>
            <div class="skill-icon" title="Docker"><i class="fab fa-docker"></i></div>
            <div class="skill-icon" title="MySQL"><i class="fas fa-database"></i></div>
            <div class="skill-icon" title="MongoDB"><i class="fab fa-mongodb"></i></div>
            <div class="skill-icon" title="Redis"><i class="fab fa-redis"></i></div>
            <div class="skill-icon" title="AWS"><i class="fab fa-aws"></i></div>
            <div class="skill-icon" title="Nginx"><i class="fab fa-nginx"></i></div>
            <div class="skill-icon" title="Photoshop"><i class="fab fa-adobe"></i></div>
            <div class="skill-icon" title="VS Code"><i class="fab fa-vscode"></i></div>
            <div class="skill-icon" title="Sass"><i class="fab fa-sass"></i></div>
            <div class="skill-icon" title="React"><i class="fab fa-react"></i></div>
            <div class="skill-icon" title="Vue"><i class="fab fa-vuejs"></i></div>
            <div class="skill-icon" title="Node.js"><i class="fab fa-node-js"></i></div>
            <div class="skill-icon" title="TypeScript"><i class="fab fa-typescript"></i></div>
            <div class="skill-icon" title="Angular"><i class="fab fa-angular"></i></div>
        </div>
    </div>
</div>

<!-- 添加Font Awesome图标库 -->
<script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
