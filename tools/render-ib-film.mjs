#!/usr/bin/env node
/*
 * The IB Tools hero for phones: site/assets/ib/ib-film-phone.mp4 (the 15.5 s loop, 30 fps, 1080x1060) and its poster
 * site/assets/ib/ib-film-phone.webp (the line-up frame, shown if the video cannot play).
 *
 * Phones play this video instead of drawing the film live (too heavy for them). It is the live film itself, framed
 * as on a portrait phone: the screen's width, 1100 scene px across (1400 for the laptop, 1780 for the line-up),
 * without the captions (the page draws those). Re-run after changing tools/ib-film/ib-film.jsx (and building it):
 *
 *   cd tools && node build-ib-film.mjs && node render-ib-film.mjs
 *   python3 build-i18n.py   (from the repo root: new ?v= stamps)
 *
 * Needs ffmpeg (libx264) and python3 with Pillow. CHROME=/path/to/chrome if Playwright's own browser is not installed.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const out = join(site, 'assets', 'ib');
const tmp = join(here, '.ib-film-tmp');
const FPS = 30, TOTAL = 15.5, STILL = 13.7, W = 390, OUT_W = 1080, OUT_H = 1060;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };

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
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: W, height: 1000 }, deviceScaleFactor: OUT_W / W });
await page.goto(`http://127.0.0.1:${port}/ib-tools/?film=capture`, { waitUntil: 'load' });
await page.addStyleTag({ content: '[data-loader], header, .tq-ibh__cap { visibility: hidden !important; }' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => typeof window.ibFilmSeek === 'function');
/* the band the video covers: the hero's width, the scene's height at 1100 scene px across, centred at 44% */
const clip = await page.evaluate((W) => {
  const r = document.querySelector('.tq-ibh__box').getBoundingClientRect(), h = 1080 * W / 1100;
  return { x: 0, y: r.top + r.height * 0.44 - h / 2, width: W, height: h };
}, W);

const shot = async (t, file) => {
  await page.evaluate((t) => window.ibFilmSeek(t), t);
  await page.screenshot({ path: file, clip });
};
const N = Math.round(TOTAL * FPS);
for (let i = 0; i < N; i++) {
  await shot(i / FPS, join(tmp, `f${String(i).padStart(4, '0')}.png`));
  if (i % 60 === 0) process.stdout.write(`frame ${i}/${N}\n`);
}
await shot(STILL, join(tmp, 'still.png'));
await browser.close();
server.close();

execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', join(tmp, 'f%04d.png'),
  '-vf', `scale=${OUT_W}:${OUT_H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-profile:v', 'high',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', '-an', join(out, 'ib-film-phone.mp4')]);
execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(join(tmp, 'still.png'))}).convert('RGB').resize((${OUT_W}, ${OUT_H}), Image.LANCZOS).save(${JSON.stringify(join(out, 'ib-film-phone.webp'))}, 'WEBP', quality=82, method=6)`]);
rmSync(tmp, { recursive: true, force: true });
console.log('wrote site/assets/ib/ib-film-phone.mp4 and .webp');
