import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 8000;

http.createServer((req, res) => {
  const urlPath = req.url === '/' ? 'index.html' : req.url;
  const filePath = path.join(__dirname, urlPath.replace(/^\//, ''));
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {'Content-Type': mime[ext] || 'application/octet-stream'});
    res.end(content);
  });
}).listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

