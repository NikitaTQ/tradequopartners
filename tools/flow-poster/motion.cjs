/* The Infinite Flow stand-in films (site/assets/flow/motion-wide.mp4, motion-square.mp4): the scene's first seconds, as
 * the live scene draws them, 60 frames a second, shot from the embed itself (?shoot: window.__tqRenderAt(t) draws the
 * scene at the moment t). The film plays over the still (poster-*.webp, its frame 0) until the live scene is ready; the
 * live scene then starts from the film's own moment, so one hands over to the other without a jump. The words over the
 * scene (labels) and the vignette are left out, as in the stills: the page draws them over all three.
 * Run with the site served on :8772 (any static server on site/); the frames are kept, so a broken run resumes:
 *   NODE_PATH=<global node_modules with playwright> node tools/flow-poster/motion.cjs <frames dir> [seconds] [wide|square]
 *   python3 tools/flow-poster/motion.py <frames dir>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const SECONDS = +(process.argv[3] || 8), FPS = 60;
const ONLY = process.argv[4];
if (!OUT) { console.error('usage: motion.cjs <frames dir> [seconds] [wide|square]'); process.exit(1); }
(async () => {
  const b = await chromium.launch();
  // the stills' framing (shoot.cjs): the same viewports and pixel densities
  for (const [name, W, H, dpr] of [['wide', 1240, 1100, 2], ['square', 390, 800, 3]]) {
    if (ONLY && ONLY !== name) continue;
    const dir = path.join(OUT, name);
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
    await ctx.addInitScript(() => { window.__tqPaused = true; });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8772/embeds/infinite-flow.html?shoot', { waitUntil: 'load' });
    await p.waitForSelector('.if-scene.is-live', { timeout: 300000 });
    await p.waitForFunction(() => typeof window.__tqRenderAt === 'function');
    await p.addStyleTag({ content: '.if-poster, .if-motion { display: none !important; } .if-scene canvas { transition: none !important; } .if-scene > div, .if-cta, .if-head, .if-metrics { visibility: hidden !important; }' });
    const n = SECONDS * FPS, t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const f = path.join(dir, String(i).padStart(4, '0') + '.png');
      if (fs.existsSync(f)) continue;
      await p.evaluate((t) => window.__tqRenderAt(t), i / FPS);
      await p.locator('#if-scene').screenshot({ path: f + '.tmp.png' });
      fs.renameSync(f + '.tmp.png', f);
      if (i % 60 === 59) console.log(name, i + 1, '/', n, Math.round((Date.now() - t0) / 1000) + 's');
    }
    await ctx.close();
  }
  await b.close();
})();
