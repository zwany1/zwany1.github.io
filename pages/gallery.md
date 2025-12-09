---
layout: page
title: 相册
description: 个人相册
permalink: /gallery/
---

# 相册

<style>
/* 相册样式 */
.gallery {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;
}

.gallery a {
  width: calc(33.333% - 8px);
  height: 200px;
  display: inline-block;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.gallery a:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.gallery a:hover img {
  transform: scale(1.05);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .gallery a {
    width: calc(50% - 8px);
  }
}

@media (max-width: 480px) {
  .gallery a {
    width: 100%;
  }
}
</style>

<div class="gallery">
  <!-- 相册内容 -->
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片1"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片1"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片2"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片2"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片3"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片3"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片4"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片4"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片5"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片5"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片6"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片6"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片7"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片7"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片8"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片8"></a>
  <a href="{{ site.url }}/assets/images/zanzu.jpg" title="示例照片9"><img src="{{ site.url }}/assets/images/zanzu.jpg" alt="示例照片9"></a>
</div>