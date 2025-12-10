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
}

.gallery-item:hover::after {
  opacity: 1;
  transform: translateY(0);
}

/* 图片加载占位符 */
.gallery-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.gallery-item img.loaded::before {
  display: none;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

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

<div class="gallery">
  <!-- 相册内容 -->
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片1"><img src="/assets/images/zanzu.jpg" alt="示例照片1" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片2"><img src="/assets/images/zanzu.jpg" alt="示例照片2" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片3"><img src="/assets/images/zanzu.jpg" alt="示例照片3" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片4"><img src="/assets/images/zanzu.jpg" alt="示例照片4" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片5"><img src="/assets/images/zanzu.jpg" alt="示例照片5" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片6"><img src="/assets/images/zanzu.jpg" alt="示例照片6" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片7"><img src="/assets/images/zanzu.jpg" alt="示例照片7" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片8"><img src="/assets/images/zanzu.jpg" alt="示例照片8" loading="lazy"></a>
  <a href="/assets/images/zanzu.jpg" class="gallery-item" data-title="示例照片9"><img src="/assets/images/zanzu.jpg" alt="示例照片9" loading="lazy"></a>
</div>

<!-- 图片优化提示 -->
<div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
  <p style="color: #666; font-size: 14px; margin: 0;">
    💡 提示：为获得更好的加载效果，建议将相册图片压缩至100KB以下，并使用适当尺寸的缩略图
  </p>
</div>