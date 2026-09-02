---
layout: page
title: 书影清单
description: 在读的书与看过的片
comments: false
permalink: /books/
---

<div id="books-page">
    <p>记录读过的书、看过的片。清单在 <code>_data/books.yml</code> 里维护，随手更新。</p>
    {% assign groups = 'reading|在读,done|读过,wish|想读' | split: ',' %}
    {% for g in groups %}
    {% assign kv = g | split: '|' %}
    {% assign list = site.data.books | where: 'status', kv[0] %}
    {% if list.size > 0 %}
    <div class="books-sec">
        <div class="books-sec__title"><i class="fas fa-bookmark fa-fw"></i> {{ kv[1] }} <small>{{ list.size }}</small></div>
        <div class="books-grid">
            {% for b in list %}
            <div class="book-card">
                {% if b.link %}<a class="book-card__title" href="{{ b.link }}" target="_blank" rel="noopener">{{ b.title }}</a>
                {% else %}<span class="book-card__title">{{ b.title }}</span>{% endif %}
                <span class="book-card__author">{% if b.author %}{{ b.author }}{% endif %}</span>
                {% if b.rating %}
                <span class="book-card__stars">{{ '★★★★★' | truncate: b.rating, '' }}</span>
                {% endif %}
                {% if b.note %}<span class="book-card__note">{{ b.note }}</span>{% endif %}
            </div>
            {% endfor %}
        </div>
    </div>
    {% endif %}
    {% endfor %}
</div>
