#!/usr/bin/env node
/*
 * Record the phones' partner film as a video: site/assets/video/film-mobile.mp4 (+ film-mobile-poster.jpg).
 *
 * Phones show this MP4 instead of the live embed (embeds/tradequo-film-mobile.html): the live film keeps six
 * 1080x1920 layers and a WebGL scene, and on iPhone that ran out of memory (blank film, then Safari's
 * "A problem repeatedly occurred"). Re-run after changing the mobile film:
 *
 *   cd tools && npm install && node record-film.mjs        # needs ffmpeg with libx264
 *   python3 build-i18n.py                                   # new ?v= stamps on the video and poster
 *
 * The film's requestAnimationFrame is replaced by a virtual clock, so every frame is exactly 1/30 s after the
 * previous one however slowly the capture runs (WebGL in headless Chromium is software-rendered). The film's
 * Google Fonts are served from the site's own copies of the same families. Set CHROMIUM=<path> to use a
 * particular Chromium build.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const tmp = join(here, '.film-tmp');
const out = join(site, 'assets', 'video');
const FPS = 30, LOOP = 22.0, STILL = 21.4;   // the film's length and its reduced-motion still (Sign + 2.2 s)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.css': 'text/css', '.jpg': 'image/jpeg' };
const FONT_CSS = `
@font-face{font-family:'DM Sans';font-style:normal;font-weight:300 900;src:url(/assets/fonts/dm-sans-latin.woff2) format('woff2')}
@font-face{font-family:'Fragment Mono';font-style:normal;font-weight:400;src:url(/assets/fonts/fragment-mono-latin.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;src:url(/assets/fonts/cormorant-garamond-latin.woff2) format('woff2')}`;

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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
/* 360x640 at 2x: the film's 9:16 frame exactly, 720x1280; a touch screen, so its controls stay hidden */
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: 'text/css', body: FONT_CSS }));
await page.route(/fonts\.gstatic\.com/, (r) => r.abort());
await page.addInitScript(() => {
  let q = [], now = 1000, id = 0;
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { q = q.filter(([k]) => k !== i); };
  window.__tick = (ms) => { now += ms; const run = q; q = []; run.forEach(([, cb]) => cb(now)); };
});
page.on('pageerror', (e) => console.error('page error:', String(e)));
await page.goto(`http://127.0.0.1:${port}/embeds/tradequo-film-mobile.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelector('#tq-film canvas'), null, { timeout: 30000 });
const settle = () => page.evaluate(() => new Promise((r) => setTimeout(() => setTimeout(r, 30), 30)));
await page.evaluate(() => window.__tick(0)); await settle(); await page.waitForTimeout(300);

const n = Math.round(LOOP * FPS);
for (let k = 0; k < n; k++) {
  if (k) { await page.evaluate((d) => window.__tick(d), 1000 / FPS); await settle(); }
  await page.screenshot({ path: join(tmp, `f${String(k).padStart(4, '0')}.png`), timeout: 120000 });
  if (k % 60 === 0) console.log(`frame ${k} / ${n}`);
}
await browser.close();
server.close();
if (readdirSync(tmp).length !== n) throw new Error('missing frames');

/* H.264 (plays on every phone), 30 fps, no sound, moov atom first so playback starts while it downloads */
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(tmp, 'f%04d.png'),
  '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '24', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.0',
  '-movflags', '+faststart', '-an', join(out, 'film-mobile.mp4')], { stdio: 'inherit' });
/* the poster is the film's own still, where playback starts */
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, `f${String(Math.round(STILL * FPS)).padStart(4, '0')}.png`),
  '-q:v', '4', join(out, 'film-mobile-poster.jpg')], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
console.log('wrote site/assets/video/film-mobile.mp4 and film-mobile-poster.jpg');
