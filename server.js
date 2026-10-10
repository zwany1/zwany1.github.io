const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.md': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // 必须剥掉查询串和 hash：站点里不少资源带 ?v={{ site.time }} 做缓存击穿，
  // 不剥的话 './js/xxx.js?v=123' 会被当成文件名，直接 404。
  let pathname = req.url.split('#')[0].split('?')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch (e) { /* 非法编码就按原样用 */ }

  let filePath = '.' + pathname;
  if (filePath === './' || pathname.endsWith('/')) {
    filePath = filePath.replace(/\/$/, '') + '/index.html';
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，尝试添加.html扩展名
        const htmlFilePath = filePath + '.html';
        fs.readFile(htmlFilePath, (htmlError, htmlContent) => {
          if (htmlError) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + '\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop server');
});