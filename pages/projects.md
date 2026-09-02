---
layout: page
title: 项目
permalink: /projects/
comments: false
aside: false
---

<div class="gh-projects">
    {% for p in site.data.projects %}
    <div class="gh-project-card">
        <a class="gh-project-title" href="{{ p.link }}" target="_blank" rel="noopener">{{ p.name }}</a>
        <div class="gh-project-desc">{{ p.desc }}</div>
    </div>
    {% endfor %}
</div>
