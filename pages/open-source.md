---
layout: page
title: Open Source Projects
keywords: 开源,open-source,GitHub,开源项目
description: 开源改变世界。
permalink: /open-source/
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
