---
layout: page
title: 回忆录
description: 个人相册
permalink: /gallery/
---

# 相册

<style>
/* 相册样式 */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin: 20px 0;
  padding: 0 10px;
}

.gallery-item {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  aspect-ratio: 1 / 1;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: #f5f5f5;
}

.gallery-item:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.gallery-item img.loaded {
  opacity: 1;
}

.gallery-item:hover img {
  transform: scale(1.1);
}

/* 图片标题 */
.gallery-item::after {
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
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  z-index: 2;
}

.gallery-item:hover::after {
  opacity: 1;
  transform: translateY(0);
}

/* 图片加载占位符 - 使用菱形装载机GIF */
.gallery-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5 url('/images/blog/icons8-菱形装载机.gif') no-repeat center center;
  background-size: 60px 60px;
  z-index: 1;
  transition: opacity 0.3s ease;
}

/* 图片加载完成后隐藏GIF加载动画 */
.gallery-item.image-loaded::before {
  display: none;
}

/* 视频播放按钮 */
.gallery-item > div {
  z-index: 2;
}

/* 加载动画已替换为GIF */

/* 响应式设计 */
@media (max-width: 1024px) {
  .gallery {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .gallery {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }
  
  .gallery-item {
    border-radius: 8px;
  }
}

@media (max-width: 480px) {
  .gallery {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }
}
</style>

<script>
  // 图片加载完成后添加loaded类并隐藏GIF加载动画
  document.addEventListener('DOMContentLoaded', function() {
    // 选择所有gallery-item内的图片
    const images = document.querySelectorAll('.gallery .gallery-item img');
    images.forEach(img => {
      // 创建隐藏GIF的函数
      const hideLoadingGif = function() {
        this.classList.add('loaded');
        // 隐藏加载占位符GIF
        const galleryItem = this.closest('.gallery-item');
        if (galleryItem) {
          // 直接添加类来隐藏GIF，避免使用复杂的nth-child选择器
          galleryItem.style.position = 'relative'; // 确保定位正确
          galleryItem.classList.add('image-loaded');
        }
      };
      
      // 图片加载完成事件
      img.onload = hideLoadingGif;
      
      // 如果图片已经在缓存中
      if (img.complete) {
        hideLoadingGif.call(img);
      }
    });
  });
</script>

<h2 style="margin-top: 40px; margin-bottom: 20px; color: #333; font-size: 28px;">🎬 视频</h2>

<div class="gallery">
  <!-- 视频内容 -->
  <a href="/images/gallery/1d219a323cedb70b129d3317acbcc63d.mp4" class="gallery-item" data-title="视频1">
    <img src="/images/gallery/22.png" alt="视频1" width="800" height="600" loading="lazy">
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 3l14 9-14 9V3z"></path>
      </svg>
    </div>
  </a>
  <a href="/images/gallery/8be4fe5f439369750f6022b7d9254839.mp4" class="gallery-item" data-title="视频2">
    <img src="/images/gallery/11.png" alt="视频2" width="800" height="600" loading="lazy">
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 3l14 9-14 9V3z"></path>
      </svg>
    </div>
  </a>
</div>

<h2 style="margin-top: 60px; margin-bottom: 20px; color: #333; font-size: 28px;">📷 照片</h2>

<div class="gallery">
  <!-- 照片内容 -->
  <a href="/images/gallery/05ac7d8484417f2f4301215889fc5988.jpg" class="gallery-item" data-title="照片1"><img src="/images/gallery/05ac7d8484417f2f4301215889fc5988.jpg" alt="照片1" loading="lazy"></a>
  <a href="/images/gallery/363ce57e51d78927fbbb05fc3228bd97.jpg" class="gallery-item" data-title="照片2"><img src="/images/gallery/363ce57e51d78927fbbb05fc3228bd97.jpg" alt="照片2" loading="lazy"></a>
  <a href="/images/gallery/3bb276100b2b9c40a2225f124345ba64.jpg" class="gallery-item" data-title="照片3"><img src="/images/gallery/3bb276100b2b9c40a2225f124345ba64.jpg" alt="照片3" loading="lazy"></a>
  <a href="/images/gallery/53637bb52ad51ba0e928c36671927e37.jpg" class="gallery-item" data-title="照片4"><img src="/images/gallery/53637bb52ad51ba0e928c36671927e37.jpg" alt="照片4" loading="lazy"></a>
  <a href="/images/gallery/8335bbd5b1ad82bddd33e43d4915910f.jpg" class="gallery-item" data-title="照片5"><img src="/images/gallery/8335bbd5b1ad82bddd33e43d4915910f.jpg" alt="照片5" loading="lazy"></a>
  <a href="/images/gallery/aed3c79064681fca2429e02c2b7f3a57.jpg" class="gallery-item" data-title="照片6"><img src="/images/gallery/aed3c79064681fca2429e02c2b7f3a57.jpg" alt="照片6" loading="lazy"></a>
  <a href="/images/gallery/bbc73ac8d8e75ddbbdfbbf92ced1784f.jpg" class="gallery-item" data-title="照片7"><img src="/images/gallery/bbc73ac8d8e75ddbbdfbbf92ced1784f.jpg" alt="照片7" loading="lazy"></a>
  <a href="/images/gallery/c10125d5c8833567c705a01bb8d73107.jpg" class="gallery-item" data-title="照片8"><img src="/images/gallery/c10125d5c8833567c705a01bb8d73107.jpg" alt="照片8" loading="lazy"></a>
  <a href="/images/gallery/dc490ba6283e64e224aa1313640e49f8.jpg" class="gallery-item" data-title="照片9"><img src="/images/gallery/dc490ba6283e64e224aa1313640e49f8.jpg" alt="照片9" loading="lazy"></a>
  <a href="/images/gallery/e90d8f8520a6bd67631c805850fe723f.jpg" class="gallery-item" data-title="照片10"><img src="/images/gallery/e90d8f8520a6bd67631c805850fe723f.jpg" alt="照片10" loading="lazy"></a>
</div>

<!-- 图片优化提示 -->
<div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
  <strong>图片优化建议：</strong>视频封面图片(11.png, 22.png)过大，建议压缩至200KB以下以提升加载速度。可以使用tinypng.com等在线工具进行无损压缩。<br>

  <p style="color: #666; font-size: 14px; margin: 0;">
    💡 提示：为获得更好的加载效果，建议将相册图片压缩至100KB以下，并使用适当尺寸的缩略图
  </p>
</div>