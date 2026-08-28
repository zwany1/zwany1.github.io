// 时段问候语 + 背景切换
// 检测当前时间，切换 #page-header 背景 class，插入问候语
// 兼容 pjax 页面切换（监听 pjax:complete 重入）
// 停留期间到时段边界自动切换（setTimeout 到边界唤醒），切回标签页立即校准
(function () {
  var timer = null

  function applyTimeGreeting() {
    var header = document.getElementById('page-header')
    if (!header) return

    // 移除旧问候语（pjax 重入时防重复）
    var oldGreeting = document.getElementById('time-greeting')
    if (oldGreeting) oldGreeting.remove()

    // 移除旧时段 class
    header.classList.remove('time-morning', 'time-noon', 'time-afternoon', 'time-night')

    var now = new Date()
    var hour = now.getHours()
    var period, greeting

    if (hour >= 5 && hour < 11) {
      period = 'morning'
      greeting = '早上好呀～今天也要元气满满！☀️'
    } else if (hour >= 11 && hour < 14) {
      period = 'noon'
      greeting = '中午好！休息一下，吃个午饭吧～🌤️'
    } else if (hour >= 14 && hour < 18) {
      period = 'afternoon'
      greeting = '下午好～一杯下午茶，继续加油！🍵'
    } else {
      period = 'night'
      greeting = '晚上好～忙碌了一天，好好休息吧 ✨'
    }

    // 应用时段背景 class
    header.classList.add('time-' + period)

    // 插入问候语元素
    var greetingEl = document.createElement('div')
    greetingEl.id = 'time-greeting'
    greetingEl.className = 'time-greeting'
    greetingEl.textContent = greeting

    // 找到合适的插入位置
    var siteInfo = document.getElementById('site-info')        // 首页
    var pageSiteInfo = document.getElementById('page-site-info') // 归档/标签/分类/关于
    var postInfo = document.getElementById('post-info')        // 文章页

    var container = siteInfo || pageSiteInfo || postInfo
    if (container) {
      container.appendChild(greetingEl)
      // 延迟触发淡入动画
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          greetingEl.classList.add('visible')
        })
      })
    }

    scheduleNextBoundary(now)
  }

  // 调度到下一个时段边界（5/11/14/18 点）自动重新应用
  function scheduleNextBoundary(now) {
    if (timer) clearTimeout(timer)
    var next = nextBoundary(now)
    timer = setTimeout(applyTimeGreeting, next.getTime() - now.getTime() + 1000)
  }

  // 计算下一个时段边界时刻（5:00 / 11:00 / 14:00 / 18:00）
  function nextBoundary(now) {
    var next = new Date(now)
    var hour = now.getHours()

    if (hour < 5) {
      next.setHours(5, 0, 0, 0)
    } else if (hour < 11) {
      next.setHours(11, 0, 0, 0)
    } else if (hour < 14) {
      next.setHours(14, 0, 0, 0)
    } else if (hour < 18) {
      next.setHours(18, 0, 0, 0)
    } else {
      next.setDate(next.getDate() + 1)
      next.setHours(5, 0, 0, 0)
    }
    return next
  }

  // 首次加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTimeGreeting)
  } else {
    applyTimeGreeting()
  }

  // pjax 页面切换后重新应用
  document.addEventListener('pjax:complete', applyTimeGreeting)

  // 切回标签页时立即校准（长时间休眠后可能错过边界）
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) applyTimeGreeting()
  })
})()