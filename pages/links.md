---
layout: page
title: 友链
permalink: /links/
comments: false
aside: true
---

<div id="page">
    <p>很高兴和朋友们的站点互相串门～ 想交换友链的话，欢迎在评论区留言或通过<a href="/about/">关于页</a>联系我。</p>
    <div class="friends-grid">
        {% for f in site.data.friends %}
        <a class="friend-card" href="{{ f.url }}" target="_blank" rel="noopener">
            <img class="friend-card__avatar" src="{{ f.avatar }}" alt="{{ f.name }}" loading="lazy"
                 onerror="this.src='/assets/images/avatar.jpg'">
            <span class="friend-card__info">
                <b class="friend-card__name">{{ f.name }}</b>
                <span class="friend-card__desc">{{ f.desc }}</span>
            </span>
        </a>
        {% endfor %}
    </div>
</div>
