"""The "Accept invitation" button of /for-influencers/ (owner's design, November 2026: btn-src/accept-design.webp, a
rose-quartz crystal bar with a silver four-point star): the crystal cut out of its dark backdrop (a soft-edged
polygon, so the page shows round it), its words wiped (the bar's own dark glass filled in, harmonic fill) so the page
writes them as real text. Writes site/assets/influencers/btn-accept-{700,1270}.webp."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
im = Image.open(os.path.join(HERE, 'btn-src', 'accept-design.webp')).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(np.float64)

# the words: bright, nearly grey pixels in their band, grown a little
lum = a.mean(2); sat = a.max(2) - a.min(2)
m = np.zeros((H, W), bool)
y0, y1, x0, x1 = 100, 186, 135, 1045
band = lum[y0:y1, x0:x1]
m[y0:y1, x0:x1] = (band > 95) & (sat[y0:y1, x0:x1] < 70)
mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
m = np.asarray(mi) > 0
m[:, :x0 - 6] = False; m[:, x1 + 6:] = False

# harmonic fill (red-black over-relaxation) of the masked pixels from their surroundings
ys, xs = np.nonzero(m)
f = a.copy()
for c in range(3):
    ch = f[..., c]
    ch[m] = ch[~m].mean() if False else ch[m]
yy0, yy1, xx0, xx1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
sub = f[yy0:yy1, xx0:xx1]; sm = m[yy0:yy1, xx0:xx1]
# start from row-wise linear interpolation
for y in range(sub.shape[0]):
    row = sm[y]
    if row.any():
        idx = np.arange(row.size)
        for c in range(3):
            sub[y, row, c] = np.interp(idx[row], idx[~row], sub[y, ~row, c])
yy, xx = np.nonzero(sm)
par = (yy + xx) % 2
for it in range(900):
    for p in (0, 1):
        sel = par == p
        Y, X = yy[sel], xx[sel]
        nb = (sub[Y - 1, X] + sub[Y + 1, X] + sub[Y, X - 1] + sub[Y, X + 1]) / 4
        sub[Y, X] += 1.9 * (nb - sub[Y, X])
f[yy0:yy1, xx0:xx1] = sub
# a touch of the glass's grain back over the fill
rng = np.random.default_rng(3)
f[m] += rng.normal(0, 1.2, (m.sum(), 1))
f = np.clip(f, 0, 255)

# the crystal's outline, soft-edged
poly = [(111, 37), (1096, 37), (1261, 135), (1086, 275), (11, 275), (1, 251), (39, 128)]
S = 4
mk = Image.new('L', (W * S, H * S), 0)
ImageDraw.Draw(mk).polygon([(x * S, y * S) for x, y in poly], fill=255)
mk = mk.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.7))
out = Image.fromarray(f.astype(np.uint8)).convert('RGBA'); out.putalpha(mk)
out = out.crop((0, 33, W, 280))
for w in (1270, 700):
    o = out if w == W else out.resize((w, round(out.height * w / W)), Image.LANCZOS)
    o.save(os.path.join(OUT, 'btn-accept-%d.webp' % w), quality=90, method=6)
print(out.size, m.sum())
