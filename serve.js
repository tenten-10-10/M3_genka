/* ローカル開発用の静的ファイルサーバー（依存なし）。
 * バックエンド（認証・保存）は Supabase Edge Function を利用するため、
 * ここでは public/ を配信するだけ。
 *   node serve.js   →  http://localhost:8000
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'public');
const port = process.env.PORT || 8000;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const fp = path.join(root, path.normalize(p));
    if (!fp.startsWith(root)) {
      res.writeHead(403);
      return res.end('forbidden');
    }
    fs.readFile(fp, (err, buf) => {
      if (err) {
        res.writeHead(404);
        return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
      res.end(buf);
    });
  })
  .listen(port, () => console.log('静的サーバー: http://localhost:' + port));
