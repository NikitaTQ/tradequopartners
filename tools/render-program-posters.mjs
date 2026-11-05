#!/usr/bin/env node
/*
 * Posters for the 3D on the Partner Programs page, all transparent webp in site/assets/posters/:
 *   program-<obj>.webp           the cards' art (embeds/program-art.html), 16:9
 *   benefits-candles-wide.webp   key benefits candles (embeds/benefit-candles.html), 2:1 stage
 *   benefits-candles.webp        the same for the 4:3 stage under 820px
 *   trust-dome.webp              why TradeQuo dome, first frame: flat field (embeds/trust-dome.html), 600:520
 * The page shows a poster until its live scene has drawn the first frame, so re-run after
 * changing a scene (an optional argument renders only the posters whose name contains it):
 *
 *   cd tools && node render-program-posters.mjs [benefits]
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
const JOBS = [
  ...['link', 'network', 'flag'].map((obj) => ({ name: `program-${obj}`, url: `program-art.html?still&obj=${obj}`, w: 384, h: 216, dpr: 2 })),
  { name: 'benefits-candles-wide', url: 'benefit-candles.html?still', w: 1240, h: 620, dpr: 1.5 },
  { name: 'benefits-candles', url: 'benefit-candles.html?still', w: 720, h: 540, dpr: 1.5 },
  { name: 'trust-dome', url: 'trust-dome.html?still', w: 600, h: 520, dpr: 1.5 },
].filter((j) => !process.argv[2] || j.name.includes(process.argv[2]));
for (const job of JOBS) {
  const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: job.dpr });
  page.on('pageerror', (e) => console.error(job.name, String(e)));
  await page.goto(`http://127.0.0.1:${port}/embeds/${job.url}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tqArt, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(tmp, `${job.name}.png`), omitBackground: true });
  await page.close();
  console.log('rendered', job.name);
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
