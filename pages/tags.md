---
layout: default
title: 标签
permalink: /tags/
comments: false
aside: true
---

<div id="page">
    <div class="tag-cloud-list text-center">
        {% for tag in site.tags %}
        {% assign c = tag[1].size %}
        {% assign fs = c | times: 0.06 | plus: 1.0 %}
        {% if fs > 1.5 %}{% assign fs = 1.5 %}{% endif %}
        <a href="#{{ tag[0] }}" style="font-size: {{ fs }}em; background-color: {% cycle '#406e32', '#919a68', '#3471bb', '#c664bf', '#323b61', '#7dbc4c', '#4aa99a', '#c3c532' %};">{{ tag[0] }}</a>
        {% endfor %}
    </div>
    <hr class="custom-hr"/>
    {% for tag in site.tags %}
    <div class="tag-cloud-title" id="{{ tag[0] }}"><i class="fas fa-tag fa-fw"></i>{{ tag[0] }}</div>
    <div class="article-sort">
        {% for post in tag[1] %}
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
