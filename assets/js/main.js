function toggleMenu() {
  var nav = document.getElementsByClassName("site-header-nav")[0];
  if (nav.style.display == "inline-flex") {
    nav.style.display = "none";
  } else {
    nav.style.display = "inline-flex";
  }
}

// 滚动触发动画
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // 观察需要动画的元素
  document.querySelectorAll('.boxed-group, .repo-card, .post-item, .article, h2, h3, h4').forEach(el => {
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

// 鼠标跟随效果
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
    
    /* 鼠标跟随 */
    .mouse-cursor {
      position: fixed;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(122, 106, 74, 0.6);
      pointer-events: none;
      z-index: 9999;
      transition: transform 0.1s ease;
    }
    
    .cursor-active {
      transform: scale(1.5);
      background: rgba(139, 111, 71, 0.8);
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
  `;
  document.head.appendChild(style);

  // 初始化所有功能
  initScrollAnimations();
  initRippleEffect();
  initSmoothScroll();
  initToTopButton();
  initScrollProgress();
  
  // 可选：鼠标跟随效果（如果需要）
  // initMouseFollow();
});
