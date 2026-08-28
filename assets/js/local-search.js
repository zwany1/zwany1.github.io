/* butterfly-theme replica: LocalSearch (adapted from hexo-theme-butterfly, deps-free) */
(function () {
  function LocalSearch(opts) {
    opts = opts || {};
    this.path = opts.path || '';
    this.unescape = !!opts.unescape;
    this.top_n_per_article = opts.top_n_per_article || 1;
    this.isfetched = false;
    this.datas = null;
    this._processedKeywords = null;
    this._unescapeDiv = this.unescape ? document.createElement('div') : null;
  }
  LocalSearch.prototype._processKeywords = function (keywords) {
    if (this._processedKeywords) return this._processedKeywords;
    this._processedKeywords = keywords.map(word => {
      if (this.unescape) { this._unescapeDiv.innerText = word; return this._unescapeDiv.innerHTML; }
      return word;
    });
    return this._processedKeywords;
  };
  LocalSearch.prototype.getIndexByWord = function (words, text, caseSensitive) {
    caseSensitive = false;
    var index = [], included = new Set();
    var processedWords = this._processKeywords(words);
    if (!caseSensitive) text = text.toLowerCase();
    processedWords.forEach((word, i) => {
      var wordLen = word.length;
      if (wordLen === 0) return;
      var startPosition = 0, position = -1;
      var searchWord = caseSensitive ? word : word.toLowerCase();
      while ((position = text.indexOf(searchWord, startPosition)) > -1) {
        index.push({ position: position, word: word });
        included.add(words[i]);
        startPosition = position + wordLen;
      }
    });
    index.sort((l, r) => l.position !== r.position ? l.position - r.position : r.word.length - l.word.length);
    return [index, included];
  };
  LocalSearch.prototype.mergeIntoSlice = function (start, end, index) {
    var item = index[0];
    var position = item.position, word = item.word;
    var hits = [], count = new Set();
    while (position + word.length <= end && index.length !== 0) {
      count.add(word);
      hits.push({ position: position, length: word.length });
      var wordEnd = position + word.length;
      index.shift();
      while (index.length !== 0) {
        item = index[0];
        position = item.position; word = item.word;
        if (wordEnd > position) index.shift(); else break;
      }
    }
    return { hits: hits, start: start, end: end, count: count.size };
  };
  LocalSearch.prototype.highlightKeyword = function (val, slice) {
    var parts = [], index = slice.start;
    slice.hits.forEach(function (h) {
      parts.push(val.substring(index, h.position));
      index = h.position + h.length;
      parts.push('<mark class="search-keyword">' + val.substring(h.position, h.position + h.length) + '</mark>');
    });
    parts.push(val.substring(index, slice.end));
    return parts.join('');
  };
  LocalSearch.prototype.getResultItems = function (keywords) {
    var resultItems = [];
    this._processedKeywords = null;
    var highlightParam = keywords.join(' ');
    this.datas.forEach(({ title, content, url }) => {
      var iT = this.getIndexByWord(keywords, title);
      var iC = this.getIndexByWord(keywords, content);
      var includedCount = new Set([...iT[1], ...iC[1]]).size;
      var indexOfTitle = iT[0], indexOfContent = iC[0];
      var hitCount = indexOfTitle.length + indexOfContent.length;
      if (hitCount === 0) return;
      var slicesOfTitle = [];
      if (indexOfTitle.length !== 0) slicesOfTitle.push(this.mergeIntoSlice(0, title.length, indexOfTitle.slice()));
      var slicesOfContent = [];
      var idx = indexOfContent.slice();
      while (idx.length !== 0) {
        var it = idx[0];
        var start = Math.max(0, it.position - 20);
        var end = Math.min(content.length, it.position + 100);
        slicesOfContent.push(this.mergeIntoSlice(start, end, idx));
      }
      slicesOfContent.sort((l, r) => l.count !== r.count ? r.count - l.count : (l.hits.length !== r.hits.length ? r.hits.length - l.hits.length : l.start - r.start));
      var upperBound = parseInt(this.top_n_per_article, 10);
      if (upperBound >= 0) slicesOfContent = slicesOfContent.slice(0, upperBound);
      var u = new URL(url, location.origin);
      u.searchParams.append('highlight', highlightParam);
      var resultItem = '';
      if (slicesOfTitle.length !== 0) {
        resultItem += '<li class="local-search-hit-item"><a href="' + u.href + '"><span class="search-result-title">' + this.highlightKeyword(title, slicesOfTitle[0]) + '</span>';
      } else {
        resultItem += '<li class="local-search-hit-item"><a href="' + u.href + '"><span class="search-result-title">' + title + '</span>';
      }
      slicesOfContent.forEach(slice => {
        resultItem += '<p class="search-result">' + this.highlightKeyword(content, slice) + '...</p>';
      });
      resultItem += '</a></li>';
      resultItems.push({ item: resultItem, id: resultItems.length, hitCount: hitCount, includedCount: includedCount });
    });
    return resultItems;
  };
  LocalSearch.prototype.fetchData = function () {
    var self = this;
    fetch(this.path).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).then(function (res) {
      self.isfetched = true;
      self.datas = [];
      var doc = new DOMParser().parseFromString(res, 'text/xml');
      var entries = doc.querySelectorAll('entry');
      entries.forEach(function (el) {
        var t = el.querySelector('title');
        var c = el.querySelector('content');
        var u = el.querySelector('url');
        var data = { title: t ? t.textContent.trim() : '', content: c ? c.textContent.trim().replace(/<[^>]+>/g, '') : '', url: u ? decodeURIComponent(u.textContent).replace(/\/{2,}/g, '/') : '' };
        if (data.title) self.datas.push(data);
      });
      window.dispatchEvent(new Event('search:loaded'));
    }).catch(function (e) {
      console.error('Local search fetch failed:', e);
      self.isfetched = true; self.datas = [];
      window.dispatchEvent(new Event('search:loaded'));
    });
  };
  LocalSearch.prototype.highlightSearchWords = function (body) {
    var params = new URL(location.href).searchParams.get('highlight');
    var keywords = params ? params.split(' ') : [];
    if (!keywords.length || !body) return;
    var self = this;
    var walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
    var allNodes = [];
    while (walk.nextNode()) {
      if (!walk.currentNode.parentNode.matches('button, select, textarea, .mermaid')) allNodes.push(walk.currentNode);
    }
    allNodes.forEach(function (node) {
      var idx = self.getIndexByWord(keywords, node.nodeValue)[0];
      if (!idx.length) return;
      var slice = self.mergeIntoSlice(0, node.nodeValue.length, idx);
      var val = node.nodeValue, index = slice.start, children = [];
      slice.hits.forEach(function (h) {
        children.push(document.createTextNode(val.substring(index, h.position)));
        index = h.position + h.length;
        var mark = document.createElement('mark');
        mark.className = 'search-keyword';
        mark.appendChild(document.createTextNode(val.substring(h.position, h.position + h.length)));
        children.push(mark);
      });
      node.nodeValue = val.substring(index, slice.end);
      children.forEach(function (el) { node.parentNode.insertBefore(el, node); });
    });
  };

  window.localSearchInit = function () {
    var cfg = (window.GLOBAL_CONFIG && GLOBAL_CONFIG.localSearch) || {};
    var localSearch = new LocalSearch({ path: cfg.path, top_n_per_article: cfg.top_n_per_article, unescape: cfg.unescape });
    var languages = cfg.languages || { hits_empty: 'No results for ${query}', hits_stats: '${hits} articles found' };
    var $input = document.querySelector('.local-search-input input');
    var $statsItem = document.getElementById('local-search-stats');
    var $loadingStatus = document.getElementById('loading-status');
    var $searchMask = document.getElementById('search-mask');
    var $searchDialog = document.querySelector('#local-search .search-dialog');
    var $results = document.getElementById('local-search-results');
    var $loadDataItem = document.getElementById('loading-database');
    if (!$input || !$searchDialog) return;

    function renderResults(resultItems) {
      $results.innerHTML = '<ol class="search-result-list">' + resultItems.map(r => r.item).join('') + '</ol>';
      var stats = languages.hits_stats.replace('${hits}', resultItems.length);
      $statsItem.innerHTML = '<hr><div class="search-result-stats">' + stats + '</div>';
    }
    function showNoResults(q) {
      $results.textContent = '';
      $statsItem.innerHTML = '<div class="search-result-stats">' + languages.hits_empty.replace('${query}', q) + '</div>';
    }
    function clearResults() { $results.textContent = ''; $statsItem.textContent = ''; }
    var searchTimeout;
    function onInput() {
      if (!localSearch.isfetched) return;
      var text = $input.value.trim().toLowerCase().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (text !== '') $loadingStatus.hidden = false;
      var keywords = text.split(/[-\s]+/);
      var resultItems = [];
      if (text.length > 0) resultItems = localSearch.getResultItems(keywords);
      if (keywords.length === 1 && keywords[0] === '') clearResults();
      else if (resultItems.length === 0) showNoResults(text);
      else {
        resultItems.sort((l, r) => l.includedCount !== r.includedCount ? r.includedCount - l.includedCount : (l.hitCount !== r.hitCount ? r.hitCount - l.hitCount : r.id - l.id));
        renderResults(resultItems);
      }
      $loadingStatus.hidden = true;
    }
    function debouncedInput() {
      clearTimeout(searchTimeout);
      if (!$input.value.trim()) { onInput(); return; }
      searchTimeout = setTimeout(onInput, 200);
    }
    var loadFlag = false;
    function openSearch() {
      document.body.style.overflow = 'hidden';
      $searchMask.classList.add('open');
      $searchDialog.classList.add('open');
      setTimeout(function () { $input.focus(); }, 200);
      if (!loadFlag) {
        if (!localSearch.isfetched) localSearch.fetchData();
        $input.addEventListener('input', debouncedInput);
        loadFlag = true;
      }
    }
    function closeSearch() {
      document.body.style.overflow = '';
      $searchDialog.classList.remove('open');
      $searchMask.classList.remove('open');
    }
    document.querySelector('#search-button .search').addEventListener('click', openSearch);
    document.querySelector('#local-search .search-close-button').addEventListener('click', closeSearch);
    $searchMask.addEventListener('click', closeSearch);
    document.addEventListener('keydown', function (e) { if (e.code === 'Escape') closeSearch(); });
    window.addEventListener('search:loaded', function () {
      if ($loadDataItem) { var next = $loadDataItem.nextElementSibling; if (next) next.style.visibility = 'visible'; $loadDataItem.remove(); }
    });
    localSearch.highlightSearchWords(document.getElementById('article-container') || document.getElementById('page-content'));
  };
})();
