/**
 * Minimal static server for dist/, for screenshots and browser checks.
 * (Astro 7's `astro preview` detaches into a background server, which outlives the script.)
 */
import { createServer, type Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync } from 'node:zlib';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

export async function serveDist(port: number, root = 'dist'): Promise<Server> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(normalize(root))) return void res.writeHead(403).end();
    try {
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
      const type = TYPES[extname(path)] ?? 'application/octet-stream';
      let body = await readFile(path);
      const headers: Record<string, string> = { 'Content-Type': type };
      // Brotli for text, like Vercel, so size measurements are realistic.
      if (/text|javascript|json|xml|svg/.test(type) && /\bbr\b/.test(String(req.headers['accept-encoding']))) {
        body = brotliCompressSync(body);
        headers['Content-Encoding'] = 'br';
      }
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}
