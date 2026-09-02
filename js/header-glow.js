// 头部鼠标跟随光斑
// 抄自 WeGraduated 前端 Home.vue：mousemove + requestAnimationFrame 节流，
// 把鼠标相对 header 的坐标写入 --mx / --my，光斑在 #page-header::before 中跟随。
// 不区分页面类型：只要 header 用了线性渐变背景（蓝色调渐变横幅）就启用。
(function () {
  var header = document.getElementById('page-header')
  if (!header) return

  // 仅对使用线性渐变背景的 header 生效（首页/归档/标签/分类/关于/具体文章等）
  var bg = header.style.background || getComputedStyle(header).backgroundImage || ''
  if (bg.indexOf('linear-gradient') === -1) return

  header.classList.add('glow-header')

  var raf = 0
  header.addEventListener('mousemove', function (e) {
    if (raf) return
    raf = requestAnimationFrame(function () {
      var rect = header.getBoundingClientRect()
      header.style.setProperty('--mx', (e.clientX - rect.left) + 'px')
      header.style.setProperty('--my', (e.clientY - rect.top) + 'px')
      raf = 0
    })
  })

  header.addEventListener('mouseleave', function () {
    header.style.setProperty('--mx', '50%')
    header.style.setProperty('--my', '50%')
  })
})()
