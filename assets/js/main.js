// 菜单切换功能
function toggleMenu() {
  const menu = document.querySelector('.nav-menu');
  menu.classList.toggle('active');
}

// 滚动动画功能
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });
  
  animatedElements.forEach(el => observer.observe(el));
}

// 波纹效果功能
function initRippleEffect() {
  document.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const rect = e.target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    e.target.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
}

// 平滑滚动功能
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
}

// 鼠标跟随效果
function initMouseFollow() {
  const follower = document.createElement('div');
  follower.className = 'mouse-follower';
  document.body.appendChild(follower);
  
  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  function animate() {
    followerX += (mouseX - followerX - 15) * 0.1;
    followerY += (mouseY - followerY - 15) * 0.1;
    
    follower.style.left = followerX + 'px';
    follower.style.top = followerY + 'px';
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// 背景粒子效果功能
function initBackgroundParticles() {
  const container = document.querySelector('.particles-container');
  if (!container) return;
  
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // 随机位置
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    
    // 随机大小
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // 随机颜色
    const colors = ['#c8b593', '#8b6f47', '#7a6a4a', '#5a4a33'];
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    
    // 随机延迟和持续时间
    const delay = Math.random() * 10;
    const duration = Math.random() * 10 + 10;
    
    particle.style.animationDelay = delay + 's';
    particle.style.animationDuration = duration + 's';
    
    container.appendChild(particle);
  }
}

// 波浪效果功能
function initWaveEffect() {
  const container = document.querySelector('.wave-container');
  if (!container) return;
  
  // 创建波浪SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 1440 320');
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', '#c8b593');
  path.setAttribute('fill-opacity', '0.2');
  path.setAttribute('d', 'M0,160L60,154.7C120,149,240,139,360,144C480,149,600,171,720,181.3C840,192,960,192,1080,170.7C1200,149,1320,107,1380,85.3L1440,64L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z');
  
  svg.appendChild(path);
  container.appendChild(svg);
}

// 滚动进度指示器功能
function initScrollProgress() {
  const progressBar = document.querySelector('.scroll-progress');
  if (!progressBar) return;
  
  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + '%';
  });
}

// 返回顶部按钮功能
function initToTopButton() {
  const toTopButton = document.querySelector('.to-top');
  if (!toTopButton) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      toTopButton.classList.add('visible');
    } else {
      toTopButton.classList.remove('visible');
    }
  });
  
  toTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 导航栏滚动效果功能
function initHeaderScrollEffect() {
  const header = document.querySelector('header');
  if (!header) return;
  
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
      header.classList.add('scrolled');
      if (currentScroll > lastScroll && currentScroll > 100) {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }
    } else {
      header.classList.remove('scrolled', 'hidden');
    }
    
    lastScroll = currentScroll;
  });
}

// 视差滚动效果功能
function initParallaxEffect() {
  const parallaxElements = document.querySelectorAll('.parallax');
  if (!parallaxElements.length) return;
  
  window.addEventListener('scroll', () => {
    parallaxElements.forEach(el => {
      const speed = parseFloat(el.getAttribute('data-speed') || '0.5');
      const yPos = -(window.scrollY * speed);
      el.style.transform = `translateY(${yPos}px)`;
    });
  });
}

// 元素滚动淡出功能
function initFadeOutOnScroll() {
  const fadeElements = document.querySelectorAll('.fade-out-on-scroll');
  if (!fadeElements.length) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  fadeElements.forEach(el => observer.observe(el));
}

// 初始化所有微交互
jQuery(function() {
  // 添加必要的CSS样式
  const style = document.createElement('style');
  style.textContent = "/* 波纹效果 */" +
      ".ripple {" +
        "position: absolute;" +
        "border-radius: 50%;" +
        "background: rgba(122, 106, 74, 0.2);" +
        "transform: scale(0);" +
        "animation: ripple-animation 0.6s linear;" +
        "pointer-events: none;" +
        "z-index: 1000;" +
      "}" +
      
      "@keyframes ripple-animation {" +
        "to {" +
          "transform: scale(4);" +
          "opacity: 0;" +
        "}" +
      "}" +
      
      "/* 平滑滚动 */" +
      "html {" +
        "scroll-behavior: smooth;" +
      "}" +
      
      "/* 滚动进度指示器 */" +
      ".scroll-progress {" +
        "position: fixed;" +
        "top: 0;" +
        "left: 0;" +
        "width: 0%;" +
        "height: 3px;" +
        "background: linear-gradient(90deg, #c8b593, #8b6f47, #7a6a4a);" +
        "z-index: 9999;" +
        "transition: width 0.1s ease;" +
      "}" +
      
      "/* 返回顶部按钮 */" +
      ".to-top {" +
        "position: fixed;" +
        "bottom: 30px;" +
        "right: 30px;" +
        "width: 45px;" +
        "height: 45px;" +
        "border-radius: 50%;" +
        "background: rgba(255, 255, 255, 0.1);" +
        "backdrop-filter: blur(5px);" +
        "border: 1px solid rgba(255, 255, 255, 0.2);" +
        "color: #fff;" +
        "display: flex;" +
        "align-items: center;" +
        "justify-content: center;" +
        "opacity: 0;" +
        "visibility: hidden;" +
        "transition: all 0.3s ease;" +
        "cursor: pointer;" +
        "z-index: 1000;" +
      "}" +
      
      ".to-top:hover {" +
        "background: rgba(255, 255, 255, 0.2);" +
        "transform: translateY(-5px);" +
      "}" +
      
      ".to-top.visible {" +
        "opacity: 1;" +
        "visibility: visible;" +
      "}" +
      
      "/* 背景粒子动画 */" +
      ".particle {" +
        "position: absolute;" +
        "width: 3px;" +
        "height: 3px;" +
        "background: #c8b593;" +
        "border-radius: 50%;" +
        "animation: particleFloat 6s infinite ease-in-out;" +
      "}" +
      
      "@keyframes particleFloat {" +
        "0%, 100% {" +
          "transform: translateY(0px) rotate(0deg);" +
          "opacity: 0.5;" +
        "}" +
        "25% {" +
          "transform: translateY(-20px) rotate(90deg);" +
          "opacity: 0.8;" +
        "}" +
        "50% {" +
          "transform: translateY(-5px) rotate(180deg);" +
          "opacity: 0.6;" +
        "}" +
        "75% {" +
          "transform: translateY(-25px) rotate(270deg);" +
          "opacity: 0.7;" +
        "}" +
      "}" +
      
      "/* 波浪效果 */" +
      ".wave-container {" +
        "position: fixed;" +
        "bottom: 0;" +
        "left: 0;" +
        "width: 100%;" +
        "height: 100px;" +
        "z-index: -1;" +
        "overflow: hidden;" +
      "}";
  document.head.appendChild(style);

  // 初始化所有功能
  initScrollAnimations();
  initRippleEffect();
  initSmoothScroll();
  initToTopButton();
  initScrollProgress();
  initHeaderScrollEffect();
  initParallaxEffect();
  initFadeOutOnScroll();
  
  // 仅在桌面设备上启用动态背景效果
  if (window.innerWidth > 768) {
    initBackgroundParticles();
    initWaveEffect();
  }
});
