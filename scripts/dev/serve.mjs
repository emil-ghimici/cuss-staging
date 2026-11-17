// Static server with gzip and Pages-like caching, for Lighthouse runs against _site.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const root = process.argv[2], port = +process.argv[3] || 8090;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { f = path.join(root, '404.html'); res.statusCode = 404; if (!fs.existsSync(f)) return res.end('404'); }
  const ext = path.extname(f), buf = fs.readFileSync(f);
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'max-age=600');
  if (/gzip/.test(req.headers['accept-encoding'] || '') && ext !== '.woff2' && ext !== '.png') { res.setHeader('Content-Encoding', 'gzip'); return res.end(zlib.gzipSync(buf)); }
  res.end(buf);
}).listen(port, () => console.log('serving', root, 'on', port));
