#!/usr/bin/env node
/*
 * Render the crystals poster (first frame of the 3D stats) for every language:
 * site/assets/posters/crystals-<lang>-{desktop,mobile}.webp
 *
 * The landing shows the poster until the live scene has drawn its first frame,
 * so it must match the scene exactly. Re-run after changing embed.crys.* captions
 * (after build-i18n.py, which writes embeds/i18n.js):
 *
 *   cd tools && npm install && npx playwright install chromium   # once
 *   node render-posters.mjs [lang ...]
 *
 * Needs WebGL in headless Chromium and python3 with Pillow for the WebP encode.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..', 'site');
const tmp = join(here, '.posters-tmp');
const languages = JSON.parse(readFileSync(join(here, 'i18n', 'languages.json'), 'utf8')).map((l) => l.code);
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : languages;
const SIZES = { desktop: [860, 538], mobile: [358, 497] };   // the iframe box at max width / on a 390px phone
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
for (const lang of wanted) {
  for (const [name, [w, h]] of Object.entries(SIZES)) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => console.error(lang, name, String(e)));
    await page.goto(`http://127.0.0.1:${port}/embeds/crystals.html?still&lang=${lang}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__crystals, null, { timeout: 180000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(tmp, `crystals-${lang}-${name}.png`) });
    await page.close();
    console.log('rendered', lang, name);
  }
}
await browser.close();
server.close();

execFileSync('python3', ['-c', `
import glob, os
from PIL import Image
for f in glob.glob(${JSON.stringify(tmp)} + '/*.png'):
    out = os.path.join(${JSON.stringify(join(site, 'assets', 'posters'))}, os.path.basename(f)[:-4] + '.webp')
    Image.open(f).convert('RGB').save(out, 'WEBP', quality=86, method=6)
    print('wrote', os.path.relpath(out), os.path.getsize(out))
`], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
