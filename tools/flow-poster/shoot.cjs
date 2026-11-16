/* The Infinite Flow stills (site/assets/flow/poster-wide.webp, poster-square.webp): the scene's first frame, as the live
 * scene draws it, shot from the embed itself. Run with the site served on :8772 (any static server on site/):
 *   NODE_PATH=<global node_modules with playwright> node tools/flow-poster/shoot.cjs && python3 tools/flow-poster/webp.py
 * The embed is held still (__tqPaused), so its start-up draws exactly one frame, at t = 0: the frame the live scene
 * starts from when it fades in over the still. The words over the scene (labels) are left out. */
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname);
(async () => {
  const b = await chromium.launch();
  for (const [name, W, H, dpr] of [['wide', 1240, 1100, 2], ['square', 390, 800, 3]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
    await ctx.addInitScript(() => { window.__tqPaused = true; });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8772/embeds/infinite-flow.html', { waitUntil: 'load' });
    await p.waitForSelector('.if-scene.is-live', { timeout: 120000 });
    await p.addStyleTag({ content: '.if-poster { display: none !important; } .if-scene canvas { transition: none !important; } .if-scene > div:not(.if-poster), .if-cta, .if-head, .if-metrics { visibility: hidden !important; }' });
    await p.waitForTimeout(500);
    await p.locator('#if-scene').screenshot({ path: path.join(OUT, name + '.png') });
    console.log(name, 'ok');
    await ctx.close();
  }
  await b.close();
})();
