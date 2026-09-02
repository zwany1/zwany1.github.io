---
layout: default
title: 归档
permalink: /archives/
comments: false
aside: true
---

<div id="archive">
    <div class="article-sort-title">All Articles - {{ site.posts | size }}</div>
    <div class="article-sort">
        {% assign lastyear = 0 %}
        {% for post in site.posts %}
        {% assign y = post.date | date: "%Y" | plus: 0 %}
        {% if y != lastyear %}
        <div class="article-sort-item year">{{ y }}</div>
        {% assign lastyear = y %}
        {% endif %}
        <div class="article-sort-item no-article-cover">
            <div class="article-sort-item-info">
                <div class="article-sort-item-time"><i class="far fa-calendar-alt"></i><time class="post-meta-date-created" datetime="{{ post.date | date_to_xmlschema }}" title="Created {{ post.date | date: '%Y-%m-%d %H:%M:%S' }}">{{ post.date | date: "%Y-%m-%d" }}</time></div>
                <a class="article-sort-item-title" href="{{ post.url }}" title="{{ post.title }}">{{ post.title }}</a>
            </div>
        </div>
        {% endfor %}
    </div>
</div>
