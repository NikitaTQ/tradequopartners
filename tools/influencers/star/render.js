// The "Next star" block's red carpet (owner's design "Next Star Upsell", its 3D scene carpet-mini in star-stages.js,
// three.js), drawn once into pictures: the scene never moves, so the page shows a picture, not three.js (~600 KB).
// To draw it again: copy render.html and star-stages.js into site/_tmp/, serve site/ on :8772, run this with Playwright
// (NODE_PATH to it), then make the webp files (1600 x 600 wide, 900 x 644 phones) into site/assets/influencers/
// star-carpet{,-m}.webp, and remove site/_tmp/.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [n, w, h] of [['wide', 800, 300], ['narrow', 400, 286]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    p.on('console', (m) => console.log(n, m.type(), m.text().slice(0, 200))); p.on('pageerror', (e) => console.log(n, 'ERR', e.message));
    await p.goto(`http://localhost:8772/_tmp/render.html?w=${w}&h=${h}`); await p.waitForTimeout(8000);
    const url = await p.evaluate(() => { const c = document.querySelector('canvas'); return c ? c.width + 'x' + c.height + '|' + c.toDataURL('image/png') : 'none'; });
    const [dim, data] = url.split('|'); console.log(n, dim);
    if (data) require('fs').writeFileSync('carpet-' + n + '.png', Buffer.from(data.split(',')[1], 'base64'));
    await p.close();
  }
  await b.close();
})();
