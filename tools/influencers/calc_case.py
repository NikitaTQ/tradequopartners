"""The /for-influencers/ earnings calculator (owner's design, November 2026: numbers-src/case-design.webp, 1672 x 941:
"HOW MUCH COULD YOU EARN?" over a glass briefcase with a dark metal plate on its lid: clients you refer (a counter and
a slider), the earnings and a Day / Month / Year switch; two stacks of notes inside). The page draws the heading and
everything on the plate live (influencers.css .inf-calc, orbit.js); this makes the pictures:
  calc-case-{1600,1100}.webp   the briefcase (the heading cut off), its plate wiped clean (every row of the plate
                               carried across from a clean strip of it, x 912..948, shaded left to right as the plate
                               is), so the live controls lie on it
  calc-body-800.webp           phones: the case's glass body under the plate (the controls stand over it in a card)
Run:  python3 tools/influencers/calc_case.py"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
a = np.asarray(Image.open(os.path.join(HERE, 'numbers-src', 'case-design.webp')).convert('RGB')).astype(float)
X0, X1, Y0, Y1, R = 199, 1478, 336, 511, 26        # the plate's face (inside its rim)

prof = a[Y0:Y1, 912:948].mean(1)                   # per row, a clean strip
mid = prof.mean(0)
# its shading left to right: the plate's mean colour in clean columns, as a ratio to the strip's
cols = [(205, 225), (912, 948), (1455, 1472)]
xs = [np.mean(c) for c in cols]
ks = [a[470:505, c0:c1].mean((0, 1)) / a[470:505, 912:948].mean((0, 1)) for c0, c1 in cols]
xx = np.arange(X0, X1)
shade = np.stack([np.interp(xx, xs, [k[i] for k in ks]) for i in range(3)], 1)
rng = np.random.default_rng(3)
grain = rng.normal(0, 1.6, (Y1 - Y0, X1 - X0))
grain = np.asarray(Image.fromarray(np.clip(grain * 20 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(0))).astype(float)
grain = (grain - 128) / 20
face = prof[:, None, :] * shade[None, :, :] + grain[..., None] * 1.2
m = Image.new('L', (a.shape[1], a.shape[0]), 0)
ImageDraw.Draw(m).rounded_rectangle((X0, Y0, X1 - 1, Y1 - 1), radius=R, fill=255)
m = np.asarray(m.filter(ImageFilter.GaussianBlur(1))).astype(float)[Y0:Y1, X0:X1, None] / 255
a[Y0:Y1, X0:X1] = a[Y0:Y1, X0:X1] * (1 - m) + face * m
# the design's background (lavender, a shade darker at the edges) brought to the page's flat #f3f2f7: measured round the
# case (a smooth surface fitted to the margin), every pixel scaled by it (above it eased to white), so no edge shows
TO = np.array([243, 242, 247.])
H_, W_ = a.shape[:2]
yy, xx = np.mgrid[0:H_, 0:W_]
band = ((xx < 50) | (xx > W_ - 50) | (yy > H_ - 22) | ((yy > 100) & (yy < 140))) & (np.abs(a - a[930, 800]).max(2) < 10)
u, v = (xx - W_ / 2) / W_, (yy - H_ / 2) / H_
basis = lambda m: np.stack([np.ones(m.sum()), u[m], v[m], u[m] ** 2, v[m] ** 2, u[m] * v[m]], 1)
allm = np.ones((H_, W_), bool)
bg = np.stack([(basis(allm) @ np.linalg.lstsq(basis(band), a[..., c][band], rcond=None)[0]).reshape(H_, W_) for c in range(3)], 2)
a = np.where(a <= bg, a * TO / bg, TO + (a - bg) * (255 - TO) / np.maximum(255 - bg, 1))
img = Image.fromarray(np.clip(a + .5, 0, 255).astype(np.uint8))
case = img.crop((30, 128, 1642, 941))
for w in (1600, 1100):
    p = case.resize((w, round(case.height * w / case.width)), Image.LANCZOS)
    p.save(os.path.join(OUT, 'calc-case-%d.webp' % w), quality=86, method=6)
    print('calc-case-%d.webp' % w, p.size, os.path.getsize(os.path.join(OUT, 'calc-case-%d.webp' % w)) // 1024, 'KB')
body = img.crop((120, 520, 1552, 941))
body = body.resize((800, round(body.height * 800 / body.width)), Image.LANCZOS)
body.save(os.path.join(OUT, 'calc-body-800.webp'), quality=86, method=6)
print('calc-body-800.webp', body.size)
print('plate in the case crop (%%): left %.3f top %.3f width %.3f height %.3f' % ((X0 - 30) / 1612 * 100, (Y0 - 128) / 813 * 100, (X1 - X0) / 1612 * 100, (Y1 - Y0) / 813 * 100))
