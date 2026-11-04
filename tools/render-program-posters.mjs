#!/usr/bin/env node
/*
 * Posters for the 3D art on the Partner Programs cards (site/embeds/program-art.html):
 * site/assets/posters/program-<obj>.webp, transparent, 16:9. The card shows the poster until
 * the live scene has drawn its first frame, so re-run after changing the scene:
 *
 *   cd tools && node render-program-posters.mjs
 *
 * Needs WebGL in headless Chromium (swiftshader) and python3 with Pillow.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const tmp = join(here, '.program-posters-tmp');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = createServer((req, res) => {
  let f = join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const port = server.address().port;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const obj of ['link', 'network', 'flag']) {
  const page = await browser.newPage({ viewport: { width: 384, height: 216 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error(obj, String(e)));
  await page.goto(`http://127.0.0.1:${port}/embeds/program-art.html?still&obj=${obj}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tqArt, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(tmp, `program-${obj}.png`), omitBackground: true });
  await page.close();
  console.log('rendered', obj);
}
await browser.close();
server.close();
execFileSync('python3', ['-c', `
import glob, os
from PIL import Image
for f in glob.glob(${JSON.stringify(tmp)} + '/*.png'):
    out = os.path.join(${JSON.stringify(join(site, 'assets', 'posters'))}, os.path.basename(f)[:-4] + '.webp')
    Image.open(f).convert('RGBA').save(out, 'WEBP', quality=86, method=6)
    print('wrote', os.path.relpath(out), os.path.getsize(out))
`], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
