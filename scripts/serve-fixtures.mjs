import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '../fixtures/checkout');
const port = Number(process.env.FIXTURE_PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = createServer((req, res) => {
  let pathname = req.url?.split('?')[0] ?? '/';
  if (pathname === '/') pathname = '/login.html';

  const relative = pathname.replace(/^\//, '');
  const filePath = join(root, relative);

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'text/plain; charset=utf-8' });
  res.end(readFileSync(filePath));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[fixtures] checkout demo at http://127.0.0.1:${port}`);
});
