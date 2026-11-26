"""The /for-influencers/ closing picture (owner's design, November 2026, star-src/star-planet-design.webp, 1585 x 992):
the TradeQuo planet with its ring on the right, a silver ship flying in from the left, open night sky on the left
for the words. The page sets the words as real text (sharper), so here they are wiped from the sky: "WANT TO BE OUR
NEXT STAR?" (x 93..637, y 271..289), "INVITED." and "SEE YOU SOON." (x 96..735, y 329..371 and 395..437): each box
filled smoothly from the sky round it (a harmonic fill), the sky's fine grain put back. The design's light haze at
its top and bottom is cropped off (y 60..932) and the picture's edges are faded out in alpha (top and bottom more), so
it dissolves into the page's night band (influencers.css .inf-star). Enlarged to 2400 wide with Lanczos and a light
unsharp mask, so it stays crisp on a 2x screen.
Run:  python3 tools/influencers/star_planet.py   ->  site/assets/influencers/star-planet-{2400,1600,1000}.webp"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
a = np.asarray(Image.open(os.path.join(HERE, 'star-src', 'star-planet-design.webp')).convert('RGB')).astype(float)
H, W = a.shape[:2]
rng = np.random.default_rng(11)

mask = np.zeros((H, W), bool)
for x0, y0, x1, y1 in ((82, 260, 650, 300), (84, 318, 500, 382), (84, 384, 746, 448)):
    mask[y0:y1, x0:x1] = True
Y0, Y1, X0, X1 = 250, 458, 72, 756
win, mw = a[Y0:Y1, X0:X1].copy(), mask[Y0:Y1, X0:X1]
iy, ix = np.mgrid[0:Y1 - Y0, 0:X1 - X0]
for it in range(1500):                                               # red-black over-relaxation
    for par in (0, 1):
        pad = np.pad(win, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]) / 4
        sel = mw & (((iy + ix) % 2) == par)
        win[sel] += 1.9 * (avg[sel] - win[sel])
a[Y0:Y1, X0:X1] = win
noise = np.asarray(Image.fromarray((128 + rng.normal(0, 40, (H, W))).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))).astype(float) - 128
a[mask] += (noise[mask] / noise.std() * 1.1)[:, None]
for k in rng.choice(np.flatnonzero(mask), 26, replace=False):       # a few faint stars, as the sky round it has
    y, x = divmod(k, W)
    a[y, x] = np.minimum(255, a[y, x] + rng.uniform(40, 120) * np.array([.85, .92, 1]))

CY0, CY1 = 60, 932
a = a[CY0:CY1]
H2 = a.shape[0]
yy, xx = np.mgrid[0:H2, 0:W].astype(float)
ease = lambda t: t * t * (3 - 2 * t)
# a soft rounded falloff: wide at the sides and top and bottom, rounder at the corners (no rectangle shows on the band)
ex = np.clip(np.minimum(xx, W - 1 - xx) / (W * .17), 0, 1)
ey = np.clip(np.minimum(yy, H2 - 1 - yy) / (H2 * .27), 0, 1)
d = 1 - np.clip(np.hypot(1 - ex, 1 - ey), 0, 1)
alpha = ease(d) ** 1.2 * 255
out = Image.fromarray(np.dstack([np.clip(a, 0, 255), alpha]).astype(np.uint8), 'RGBA')
print('crop y', CY0, CY1, 'size', W, H2)
for w in (2400, 1600, 1000):
    p = out.resize((w, round(H2 * w / W)), Image.LANCZOS)
    if w > W:
        rgb = p.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
        p = Image.merge('RGBA', (*rgb.split(), p.split()[3]))
    fn = os.path.join(OUT, 'star-planet-%d.webp' % w)
    p.save(fn, quality=88, alpha_quality=90, method=6)
    print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
