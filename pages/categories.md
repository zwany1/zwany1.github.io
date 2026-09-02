---
layout: default
title: 分类
permalink: /categories/
comments: false
aside: true
---

<div id="page">
    <div class="category-lists">
        <ul class="category-list">
            {% for cat in site.categories %}
            <li class="category-list-item"><a class="category-list-link" href="#{{ cat[0] }}">{{ cat[0] }}</a><span class="category-list-count">{{ cat[1].size }}</span></li>
            {% endfor %}
        </ul>
    </div>
    <hr class="custom-hr"/>
    {% for cat in site.categories %}
    <div class="tag-cloud-title" id="{{ cat[0] }}"><i class="fas fa-folder-open fa-fw"></i>{{ cat[0] }}</div>
    <div class="article-sort">
        {% for post in cat[1] %}
        <div class="article-sort-item no-article-cover">
            <div class="article-sort-item-info">
                <div class="article-sort-item-time"><i class="far fa-calendar-alt"></i><time>{{ post.date | date: "%Y-%m-%d" }}</time></div>
                <a class="article-sort-item-title" href="{{ post.url }}">{{ post.title }}</a>
            </div>
        </div>
        {% endfor %}
    </div>
    {% endfor %}
</div>
