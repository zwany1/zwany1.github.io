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
:root {
    --gradient: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dfe6e9);
    --card_filter: 10px;
    --item_bg_color: rgba(255, 255, 255, 0.1);
}

body {
    font-family: 'Arial', sans-serif;
    background: url('/assets/images/back.png') center center fixed;
    background-size: cover;
    background-repeat: no-repeat;
    margin: 0;
    padding: 0;
    color: white;
    overflow-x: hidden;
}

.about-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    display: flex;
    gap: 30px;
}

.sidebar {
    width: 280px;
    flex-shrink: 0;
}

.main-content {
    flex: 1;
}

/* 左侧边栏 */
.sidebar {
    width: 280px;
    flex-shrink: 0;
}

.avatar {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background-color: white;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    position: relative;
}

.avatar .main-avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
}

.avatar .decoration {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: contain;
    z-index: 10;
}

.tags-section {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
    margin-bottom: 20px;
}

.tags-section h4 {
    font-size: 16px;
    margin-bottom: 15px;
    color: #ffd700;
    text-align: center;
}

.tags-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.tag-item {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    text-align: center;
    transition: all 0.3s ease;
}

.tag-item:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.links-section {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
}

.links-section h4 {
    font-size: 16px;
    margin-bottom: 15px;
    color: #ffd700;
    text-align: center;
}

.link-item {
    display: block;
    background-color: rgba(255, 255, 255, 0.2);
    padding: 10px 15px;
    border-radius: 6px;
    margin-bottom: 10px;
    text-decoration: none;
    color: white;
    font-size: 14px;
    transition: all 0.3s ease;
}

.link-item:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: translateX(5px);
}

/* 右侧主内容 */
.main-content {
    flex: 1;
}

/* 头部区域 */
.header {
    margin-bottom: 30px;
}

.avatar img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
}

.title-section h1 {
    font-size: 65px;
    font-weight: 800;
    margin: 20px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.gradientText {
    background-clip: text;
    -webkit-text-fill-color: transparent;
    background-size: 200%;
    font-family: title;
    background-image: var(--gradient);
    background-position: 0% center;
    animation: 10s ease-in-out 0s infinite normal none running backgroundSizeAnimation;
}
.welcome {
    font-size: 65px;
    font-weight: 800;
    margin: 20px 0px;
}

@keyframes backgroundSizeAnimation {
    0% {
        background-position: 0%;
    }
    50% {
        background-position: 100%;
    }
    100% {
        background-position: 0%;
    }
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

.grid-section img {
    display: block;
    margin-bottom: 10px;
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


#line {
    width: 100%;
    height: 200px;
    font-size: 13px;
    padding-left: 8px;
    scroll-snap-type: y mandatory;
    overflow-y: scroll;
}

#line ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

#line li {
    padding: 15px 0 15px 15px;
    position: relative;
    border-left: 2px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;
    scroll-snap-align: start;
}

#line li:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

#line li:first-child {
    font-weight: bold;
    font-size: 16px;
    color: #ffd700;
}

.focus {
    width: 8px;
    height: 8px;
    border-radius: 22px;
    background-color: rgb(255 255 255);
    border: 2px solid #fff;
    position: absolute;
    left: -5px;
    top: 50%;
    transform: translateY(-50%);
}

/* 技能部分 */
.skills-section {
    margin-top: 30px;
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
@media (max-width: 992px) {
    .about-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
    }
    
    .avatar {
        margin-right: 0;
        margin-bottom: 20px;
    }
}

@media (max-width: 768px) {
    .title-section h1 {
        font-size: 45px;
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
    <!-- 左侧边栏 -->
    <div class="sidebar">
        <div class="avatar">
            <img src="{{ site.url }}/assets/images/d56012bab88f5aabe76bb1fc7eeeb9c6.jpg" alt="Zwy" class="main-avatar" />
            <img src="{{ site.url }}/assets/images/to.png" alt="Decoration" class="decoration" />
        </div>
        
        <div class="tags-section">
            <h4>标签</h4>
            <div class="tags-grid">
                <div class="tag-item">后端</div>
                <div class="tag-item">小学生</div>
                <div class="tag-item">阅读</div>
                <div class="tag-item">linux</div>
                <div class="tag-item">配置</div>
                <div class="tag-item">游戏</div>
                <div class="tag-item">收藏</div>
                <div class="tag-item">旅行</div>
            </div>
        </div>
        
        <div class="links-section">
            <h4>链接</h4>
            <a href="#" class="link-item">
                <i class="fas fa-book"></i> 动态字符
            </a>
            <a href="#" class="link-item">
                <i class="fas fa-server"></i> CDN动态加速
            </a>
            <a href="#" class="link-item">
                <i class="fas fa-code"></i> 2024-3
            </a>
            <a href="#" class="link-item">
                <i class="fas fa-bullhorn"></i> 出站不掉...
            </a>
        </div>
    </div>
    <!-- 右侧主内容 -->
    <div class="main-content">
        <!-- 头部区域 -->
        <div class="header">
            <div class="title-section">
                <div class="welcome">Hello I'm <span class="gradientText">Zwy1</span></div>
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
                    <!-- 自绘SVG图标 -->
                    <a href="#" title="Custom Icon 1" style="display: inline-block; width: 24px; height: 24px; vertical-align: middle;">
                        <svg width="24" height="24" viewBox="0 0 1024 1024" fill="currentColor">
                            <path d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9 23.5 23.2 38.1 55.4 38.1 91v112.5c0.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"/>
                        </svg>
                    </a>
                    <a href="#" title="Custom Icon 2" style="display: inline-block; width: 24px; height: 24px; vertical-align: middle;">
                        <svg width="24" height="24" viewBox="0 0 1024 1024" fill="currentColor">
                            <path d="M926.47619 355.644952V780.190476a73.142857 73.142857 0 0 1-73.142857 73.142857H170.666667a73.142857 73.142857 0 0 1-73.142857-73.142857V355.644952l304.103619 257.828572a170.666667 170.666667 0 0 0 220.745142 0L926.47619 355.644952zM853.333333 170.666667a74.044952 74.044952 0 0 1 26.087619 4.778666 72.704 72.704 0 0 1 30.622477 22.186667 73.508571 73.508571 0 0 1 10.678857 17.67619c3.169524 7.509333 5.12 15.652571 5.607619 24.210286L926.47619 243.809524v24.380952L559.469714 581.241905a73.142857 73.142857 0 0 1-91.306666 2.901333l-3.632762-2.925714L97.52381 268.190476v-24.380952a72.899048 72.899048 0 0 1 40.155428-65.292191A72.97219 72.97219 0 0 1 170.666667 170.666667h682.666666z"/>
                        </svg>
                    </a>
                    <a href="#" title="Custom Icon 3" style="display: inline-block; width: 24px; height: 24px; vertical-align: middle;">
                        <svg width="24" height="24" viewBox="0 0 1024 1024" fill="currentColor">
                            <path d="M816.551274 248.167103C697.80273 131.500986 553.294498 97.66946 394.437467 140.52757 114.716718 215.994356 28.163433 506.98887 169.479973 696.646394c6.853082 9.198499 8.147564 26.164916 5.545296 38.09769-7.601118 34.868135-18.714224 68.958558-28.000728 103.474676-4.965082 18.455327-7.90504 37.21253 8.632611 52.019771 17.777899 15.921621 36.82572 12.654204 56.258305 2.777253 31.879058-16.200984 64.335261-31.314193 95.763041-48.336892 20.469194-11.086499 38.847773-11.658528 61.942771-5.240351 46.063105 12.799514 93.717452 19.872606 117.992321 24.74866 144.317896-2.603291 249.610988-41.736567 333.958024-129.489166C955.8826 594.966597 954.903296 384.090818 816.551274 248.167103zM763.498988 681.878039C658.864906 785.728268 531.49603 810.562886 393.782551 764.371868c-45.408189-15.229866-82.686211-19.207457-122.088616 7.493671-3.576455 2.423189-8.448416 2.934842-26.51284 8.852622 36.271088-62.917982 9.41851-102.273315-21.181415-146.894581-67.886133-98.989525-54.03773-226.624461 26.78197-318.740438 132.026966-150.480246 390.603139-150.382009 522.634198 0.196475C869.144096 424.455131 867.098507 579.054185 763.498988 681.878039z"/>
                        </svg>
                    </a>
                    <a href="#" title="Custom Icon 4" style="display: inline-block; width: 24px; height: 24px; vertical-align: middle;">
                        <svg width="24" height="24" viewBox="0 0 1024 1024" fill="currentColor">
                            <path d="M995.575172 725.451034c-12.358621-26.835862-38.488276-64.794483-92.689655-94.27862-62.146207-33.721379-136.297931-40.96-208.860689-20.303448l-99.928276 28.424827-279.304828-126.057931H22.775172v489.401379h509.704828l432.375172-195.266207c15.006897-6.708966 26.835862-19.42069 32.662069-34.957241 5.649655-15.36 4.943448-31.955862-1.942069-46.962759z m-482.162758 188.910345H111.051034V601.688276h184.673104l166.664828 75.387586-3.354483 0.882759h-170.372414v88.275862H471.393103l246.819311-70.267586c49.434483-14.124138 101.517241-9.357241 142.653793 12.888275 18.184828 9.886897 30.72 20.833103 39.371034 30.896552l-386.824827 174.609655z"/>
                            <path d="M695.437241 163.486897l58.615173-142.30069h-397.24138l66.736552 143.36c-121.82069 53.142069-207.095172 174.433103-207.095172 315.674483 0 28.601379 3.531034 57.202759 10.593103 84.744827l85.627586-21.715862c-5.12-20.48-7.768276-41.666207-7.768275-63.028965 0-141.241379 114.758621-256 256-256s256 114.758621 256 256c0 51.023448-14.830345 100.104828-43.078621 142.300689l73.268965 49.08138c37.958621-56.673103 58.085517-122.88 58.085518-191.382069-0.176552-141.947586-86.686897-264.121379-209.743449-316.733793zM467.508966 91.983448h180.965517l-21.009655 50.846897a348.16 348.16 0 0 0-66.913104-6.708966c-23.834483 0-46.962759 2.471724-69.384827 7.062069l-23.657931-51.2z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    
    <!-- 网格图案 -->
    <div class="grid-section">
        <img src="/images/blog/snake-Light.svg" alt="Snake Grid" style="width: 100%; height: auto;">
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
                    Zwy主页
                </a>
                <a href="#" class="project-link">
                    <i class="fas fa-palette"></i>
                    Zwy主题
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
          <div class="skills-grid" style="display: flex; justify-content: center; align-items: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; overflow: hidden;">
            <img src="{{ site.url }}/images/fragments/image.png" alt="Skills" style="max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 5px;" />
        </div>
    </div>
</div>
</div>

<!-- 添加Font Awesome图标库 -->
<script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
