const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = __dirname;
const MIME = {
  html: 'text/html', css: 'text/css', js: 'application/javascript',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  json: 'application/json', svg: 'image/svg+xml', ico: 'image/x-icon',
  webp: 'image/webp', woff2: 'font/woff2', woff: 'font/woff', txt: 'text/plain',
  xml: 'application/xml', pdf: 'application/pdf', docx: 'application/octet-stream'
};

function serveFile(fp, res) {
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(fp).slice(1).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // Ruta raíz
  if (url === '/') { serveFile(path.join(ROOT, 'index.html'), res); return; }

  let fp = path.join(ROOT, url);

  // Si el archivo existe tal cual, servirlo
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    serveFile(fp, res); return;
  }

  // Clean URLs: intentar con .html
  const fpHtml = fp + '.html';
  if (fs.existsSync(fpHtml)) {
    serveFile(fpHtml, res); return;
  }

  // index.html dentro de carpeta
  const fpIndex = path.join(fp, 'index.html');
  if (fs.existsSync(fpIndex)) {
    serveFile(fpIndex, res); return;
  }

  res.writeHead(404); res.end('Not found');
}).listen(PORT, () => console.log(`Server: http://localhost:${PORT}/`));
