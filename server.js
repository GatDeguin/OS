const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8000;

http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
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

