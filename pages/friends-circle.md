---
layout: page
title: 友链朋友圈
description: 朋友们博客的最新文章
comments: false
permalink: /friends/
---

<div id="friends-circle">
    <p>订阅朋友们的博客，聚合他们最新的文章，每天更新。</p>
    <div class="fc-list" id="fc-list"><div class="fc-loading">加载中…</div></div>
    <p class="fc-foot">想出现在这里？先在<a href="/links/">友链页</a>交换链接，然后确保你的站点有 RSS/Atom 输出即可。</p>
</div>

<script>
(function () {
    var list = document.getElementById('fc-list');
    if (!list) return;
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    fetch('/assets/friends-posts.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (posts) {
            if (!posts.length) {
                list.innerHTML = '<div class="fc-empty">朋友们还没有可聚合的 RSS 源，先去<a href="/links/">友链页</a>串个门吧～</div>';
                return;
            }
            var html = '';
            posts.forEach(function (p) {
                var d = p.date ? new Date(p.date) : null;
                var ds = d ? d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) : '';
                html += '<a class="fc-item" href="' + esc(p.link) + '" target="_blank" rel="noopener">'
                    + '<span class="fc-item__friend">' + esc(p.friend) + '</span>'
                    + '<b class="fc-item__title">' + esc(p.title) + '</b>'
                    + '<span class="fc-item__meta">' + (ds ? '<i class="far fa-calendar fa-fw"></i> ' + ds : '')
                    + ' · ' + esc((p.friendSite || '').replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</span></a>';
            });
            list.innerHTML = html;
        })
        .catch(function () {
            list.innerHTML = '<div class="fc-empty">加载失败，稍后再来看看～</div>';
        });
})();
</script>
