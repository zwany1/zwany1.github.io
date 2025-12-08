function toggleMenu() {
  var nav = document.getElementsByClassName("site-header-nav")[0];
  if (nav.style.display == "inline-flex") {
    nav.style.display = "none";
  } else {
    nav.style.display = "inline-flex";
  }
}

// 滚动触发动画 - 增强版
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  // 定义不同类型的动画
  const animationTypes = [
    'fade-in-up',
    'slide-in-left',
    'slide-in-right',
    'zoom-in',
    'bounce-in'
  ];

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // 为不同元素分配不同的动画类型
        const animationType = animationTypes[index % animationTypes.length];
        entry.target.classList.add(animationType);
        
        // 随机添加延迟，创造交错动画效果
        const delay = Math.random() * 0.3;
        entry.target.style.animationDelay = delay + 's';
        
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // 观察需要动画的元素
  document.querySelectorAll('.boxed-group, .repo-card, .post-item, .article, h2, h3, h4, blockquote, .meta-info, .site-footer-links').forEach(el => {
    observer.observe(el);
  });
}

// 按钮波纹效果
function initRippleEffect() {
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.classList.contains('clickable')) {
      const ripple = document.createElement('span');
      const rect = e.target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      e.target.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
  });
}

// 平滑滚动
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// 增强版鼠标跟随效果
function initMouseFollow() {
  const cursor = document.createElement('div');
  cursor.classList.add('mouse-cursor');
  document.body.appendChild(cursor);
  
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
  
  document.addEventListener('mousedown', () => {
    cursor.classList.add('cursor-active');
  });
  
  document.addEventListener('mouseup', () => {
    cursor.classList.remove('cursor-active');
  });
  
  // 鼠标悬停在可交互元素上时的效果
  const interactiveElements = document.querySelectorAll('a, button, .repo-list-item, .meta-info');
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('cursor-hover');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('cursor-hover');
    });
  });
}

// 动态背景粒子效果
function initBackgroundParticles() {
  const particlesContainer = document.createElement('div');
  particlesContainer.classList.add('background-particles');
  document.body.appendChild(particlesContainer);
  
  // 创建粒子
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // 随机位置
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    
    // 随机大小
    const size = 2 + Math.random() * 4;
    
    // 随机动画延迟和持续时间
    const delay = Math.random() * 10;
    const duration = 10 + Math.random() * 20;
    
    // 应用样式
    particle.style.cssText = `
      position: fixed;
      left: ${left}%;
      top: ${top}%;
      width: ${size}px;
      height: ${size}px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      pointer-events: none;
      z-index: -1;
      animation: particleFloat ${duration}s ease-in-out infinite ${delay}s;
    `;
    
    particlesContainer.appendChild(particle);
  }
}

// 动态波浪效果
function initWaveEffect() {
  // 只在首页添加波浪效果
  if (document.body.classList.contains('home')) {
    const waveContainer = document.createElement('div');
    waveContainer.classList.add('wave-container');
    document.body.appendChild(waveContainer);
    
    // 添加波浪SVG
    waveContainer.innerHTML = `
      <svg class="wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
        <path fill="rgba(255, 255, 255, 0.05)" fill-opacity="1" d="M0,192L48,202.7C96,213,192,235,288,224C384,213,480,171,576,176C672,181,768,235,864,234.7C960,235,1056,181,1152,165.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
      </svg>
    `;
  }
}

// 滚动进度指示器
function initScrollProgress() {
  const progressBar = document.createElement('div');
  progressBar.classList.add('scroll-progress');
  document.body.appendChild(progressBar);
  
  window.addEventListener('scroll', () => {
    const totalHeight = document.body.scrollHeight - window.innerHeight;
    const progress = (window.pageYOffset / totalHeight) * 100;
    progressBar.style.width = progress + '%';
  });
}

// 回到顶部按钮增强
function initToTopButton() {
  const $toTop = $("#gotop");

  $(window).on("scroll", function () {
    if ($(window).scrollTop() >= $(window).height()) {
      $toTop.addClass('visible');
    } else {
      $toTop.removeClass('visible');
    }
  });

  $toTop.on("click", function (evt) {
    var $obj = $("body,html");
    $obj.animate({
      scrollTop: 0
    }, 500);

    evt.preventDefault();
  });
}

// 滚动时导航栏样式变化
function initHeaderScrollEffect() {
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// 滚动视差效果
function initParallaxEffect() {
  const parallaxElements = document.querySelectorAll('.parallax');
  window.addEventListener('scroll', () => {
    parallaxElements.forEach(element => {
      const speed = element.dataset.speed || 0.1;
      const yPos = -(window.pageYOffset * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });
  });
}

// 元素离开视口时的淡出效果
function initFadeOutOnScroll() {
  const fadeElements = document.querySelectorAll('.fade-out-on-scroll');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        entry.target.style.opacity = '0.5';
        entry.target.style.transform = 'translateY(20px)';
      } else {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.2 });

  fadeElements.forEach(el => observer.observe(el));
}

// 初始化所有微交互
jQuery(function() {
  // 添加必要的CSS样式
  const style = document.createElement('style');
  style.textContent = `
    /* 波纹效果 */
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(122, 106, 74, 0.2);
      transform: scale(0);
      animation: ripple-animation 0.6s linear;
      pointer-events: none;
      z-index: 1000;
    }
    
    @keyframes ripple-animation {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    /* 滚动进度指示器 */
    .scroll-progress {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #c8b593, #8b6f47, #7a6a4a);
      z-index: 9999;
      transition: width 0.1s ease;
    }
    
    /* 背景粒子动画 - 优化版本 */
    @keyframes particleFloat {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
        opacity: 0.5;
      }
      25% {
        transform: translateY(-20px) rotate(90deg);
        opacity: 0.8;
      }
      50% {
        transform: translateY(-5px) rotate(180deg);
        opacity: 0.6;
      }
      75% {
        transform: translateY(-25px) rotate(270deg);
        opacity: 0.7;
      }
    }
    
    /* 波浪效果 */
    .wave-container {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100px;
      z-index: -1;
      overflow: hidden;
    }
    
    .wave {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 200%;
      height: 100%;
      animation: waveAnimation 25s linear infinite;
    }
    
    @keyframes waveAnimation {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-50%);
      }
    }
  `;
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
