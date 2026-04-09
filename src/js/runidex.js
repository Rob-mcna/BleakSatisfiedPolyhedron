const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 3000;

http.createServer((req, res) => {
  let filePath = req.url === "/" ? "index.html" : req.url;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("File not found");
    } else {
      res.writeHead(200);
      res.end(content);
    }
  });
}).listen(port);

console.log(`Server running at http://localhost:${port}`);
