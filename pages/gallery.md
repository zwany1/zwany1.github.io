---
layout: page
title: 回忆录
description: 个人相册
comments: false
permalink: /gallery/
---

<div id="page">
    <p>生活的碎片都收在这里。桌面「相册」组件与本页共用同一份数据（<code>_data/photos.yml</code>），加照片改那一处即可。</p>
    {% for sec in site.data.photos %}
    <h2>{{ sec.section }}</h2>
    <div class="gallery">
        {% for p in sec.items %}
        <a href="{{ p.src }}" class="gallery-item" data-title="{{ p.title }}">
            <img src="{{ p.img }}" alt="{{ p.title }}" loading="lazy">
            {% if p.type == 'video' %}
            <span class="gallery-play"><i class="fas fa-play"></i></span>
            {% endif %}
        </a>
        {% endfor %}
    </div>
    {% endfor %}
</div>

<style>
.gallery-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 56px;
    height: 56px;
    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff0000;
    font-size: 20px;
    pointer-events: none;
}
</style>
