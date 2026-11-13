#!/usr/bin/env node
/*
 * The partner film on the home page as a video (the 24.2 s loop, 60 fps: the live film moved every frame, 30 looked jerky) in site/assets/film/: tradequo-film-1440.mp4
 * (2560x1440, for screens where the film covers more than ~1700 pixels across: retina, 150% scaling), tradequo-film-1080.mp4
 * (1920x1080, the same shrunk with Lanczos, for the rest) and tradequo-film-1080.webm (VP9, for browsers without H.264).
 *
 * The page plays this video (with the film's grain drawn over it: startFilm in landing.js) instead of running the film live (site/embeds/tradequo-film.html: React, three.js and a
 * glass logo drawn every frame, too heavy next to Infinite Flow). It is the film itself, frame by frame: the film is
 * authored at 1920x1080 and driven by its own clock, so a patched copy of its app (served to the browser only, the file
 * is not changed) exposes a seek and stops the clock; it is drawn at 4/3 (2560x1440), the glass logo at 2560 px; the player buttons are hidden
 * (the page draws its own over the video). Re-run after changing the film:
 *
 *   cd tools && node render-film.mjs
 *   python3 build-i18n.py   (from the repo root: new ?v= stamps)
 *
 * Takes a while (minutes: every frame of the glass logo is rendered). Needs ffmpeg (libx264).
 * CHROME=/path/to/chrome if Playwright's own browser is not installed.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const out = join(site, 'assets', 'film');
const tmp = join(here, '.film-tmp');
const FPS = 60, TOTAL = 24.2;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };

const patch = (f, s) => {
  if (f.endsWith('/embeds/tradequo-film.app.js')) {
    const k = 'h.current=F;';
    const g = 'React.createElement(q,{grain:!0,letterbox:!1})';
    if (s.split(k).length !== 2 || s.split(g).length !== 2) throw new Error('render-film: the film app changed, its seek / grain hooks are not there');
    /* a seek; and no grain: the page draws the film's grain over the video (animated noise compresses worst) */
    return s.replace(k, k + 'window.__tqSeek=function(t){d.current=!0;n=t;w(n)};').replace(g, 'React.createElement(q,{grain:!1,letterbox:!1})');
  }
  if (f.endsWith('/embeds/tradequo-film.html')) return s.replace('window.TQ_RENDER_W = ', 'window.TQ_RENDER_W = 2560 || ');
  return null;
};
const server = createServer((req, res) => {
  let f = join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  const p = /\.(html|js)$/.test(f) ? patch(f.replace(/\\/g, '/'), readFileSync(f, 'utf8')) : null;
  res.end(p != null ? p : readFileSync(f));
}).listen(0);
const port = server.address().port;

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(out, { recursive: true });

const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args } : { args });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2560 / 1920 });
await page.goto(`http://127.0.0.1:${port}/embeds/tradequo-film.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => typeof window.__tqSeek === 'function' && window.TQGlassRenderer, null, { timeout: 60000 });
await page.waitForTimeout(6000);   /* the film prepares its pictures asynchronously */
await page.evaluate(() => { document.querySelector('.tq-pp').parentElement.parentElement.style.display = 'none'; });

const N = Math.round(TOTAL * FPS);
for (let i = 0; i < N; i++) {
  await page.evaluate((t) => window.__tqSeek(t), i / FPS);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: join(tmp, `f${String(i).padStart(4, '0')}.png`) });
  if (i % 60 === 0) process.stdout.write(`frame ${i}/${N}\n`);
}
await browser.close();
server.close();

/* Quality: the film is dark, with faint dots and soft light bands that a coarse encode turns into blocks — so a fine CRF,
 * x264's film tuning and AQ that favours dark areas. Colours: the PNGs are converted with the BT.709 matrix the stream
 * is tagged with (ffmpeg's default would be BT.601: reds would shift). */
const VF = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p';
const TAGS = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
const H264 = ['-c:v', 'libx264', '-preset', 'slower', '-crf', '21', '-tune', 'film', '-aq-mode', '3', '-g', '120', '-profile:v', 'high', ...TAGS, '-movflags', '+faststart', '-an'];
const IN = ['-y', '-v', 'error', '-framerate', String(FPS), '-i', join(tmp, 'f%04d.png')];
const TO1080 = 'scale=1920:1080:flags=lanczos,' + VF;
execFileSync('ffmpeg', [...IN, '-vf', VF, ...H264, join(out, 'tradequo-film-1440.mp4')]);
execFileSync('ffmpeg', [...IN, '-vf', TO1080, ...H264, join(out, 'tradequo-film-1080.mp4')]);
/* the same in VP9, for browsers built without H.264 (some Linux builds) */
execFileSync('ffmpeg', [...IN,
  '-vf', TO1080, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '31', '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-g', '120', '-aq-mode', '2',
  ...TAGS, '-an', join(out, 'tradequo-film-1080.webm')]);
rmSync(tmp, { recursive: true, force: true });
console.log('wrote site/assets/film/tradequo-film-1440.mp4, -1080.mp4 and -1080.webm');
