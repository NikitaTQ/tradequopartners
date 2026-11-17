"""Run: python3 tools/cta-glass/make.py  (numpy + Pillow; writes site/assets/cta/glass-dark.webp and glass-light.webp)
The glass "Become a partner" button of the designs (design-dark.webp: dark glass, for the program cards on /programs/;
design-light.webp: light glass, for the calculator's button), as a plate for the page's own words: the words and the
chevron are taken out and the glass under them filled in from the glass around (normalized convolution: a blur of the
known pixels divided by a blur of the mask, fine scales first), then the button is cut out of the black it was drawn on
(its own outline, with a soft 1px edge) and cropped. The page lays it on as a three-part border-image (partner.css /
site.css .tq-gbtn): the two ends (chamfers, red glints) keep their shape, the middle stretches with the words."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'cta')
os.makedirs(OUT, exist_ok=True)


def gblur(a, s):
    r = int(3 * s); x = np.arange(-r, r + 1); k = np.exp(-x * x / (2 * s * s)); k /= k.sum()
    out = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 1, out)


def grow(m, n):
    for _ in range(n):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m


for name, dark, words, chev in (('dark', True, (355, 245, 1620, 410), (1765, 265, 1850, 375)),
                                ('light', False, (355, 250, 1605, 410), (1750, 265, 1825, 375))):
    a = np.asarray(Image.open(os.path.join(HERE, 'design-%s.webp' % name)).convert('RGB')).astype(np.float64)
    H, W, _ = a.shape
    L = a.mean(2); sat = a.max(2) - a.min(2)
    ink = (L > 150) & (sat < 60) if dark else (L < 120)
    box = np.zeros((H, W), bool)
    for (x0, y0, x1, y1) in (words, chev):
        box[y0:y1, x0:x1] = True
    hole = grow(ink & box, 6) & grow(box, 6)
    known = (~hole).astype(float)
    # fill each region from the glass round it, fine scales first (the glass's facets change across the button)
    X0, Y0, X1, Y1 = 300, 190, 1900, 470
    win = a[Y0:Y1, X0:X1]; kn = known[Y0:Y1, X0:X1]; hw = hole[Y0:Y1, X0:X1]
    acc = np.zeros(win.shape[:2]); res = np.zeros_like(win)
    for s in (6, 14, 30, 60):
        m = gblur(kn, s)
        f = np.stack([gblur(win[..., c] * kn, s) for c in range(3)], -1) / np.maximum(m, 1e-6)[..., None]
        w = np.clip(m * 3, 0, 1) * (1 - acc)
        res += f * w[..., None]; acc += w
    res = res / np.maximum(acc, 1e-6)[..., None]
    a[Y0:Y1, X0:X1][hw] = res[hw]
    rng = np.random.default_rng(3)
    a[hole] += rng.normal(0, 0.8, (hole.sum(), 1))   # the glass's grain over the filled strokes
    # the button's outline: everything that is not the black it was drawn on (holes filled), a 1px soft edge
    inside = a.max(2) > 7
    rows = np.nonzero(inside.any(1))[0]; cols = np.nonzero(inside.any(0))[0]
    filled = np.zeros_like(inside)
    for y in rows:
        xs = np.nonzero(inside[y])[0]; filled[y, xs.min():xs.max() + 1] = True
    shrink = ~grow(~filled, 1)
    alpha = np.clip(gblur(shrink.astype(float), 0.7) * 1.15, 0, 1)
    y0, y1, x0, x1 = rows.min() - 2, rows.max() + 3, cols.min() - 2, cols.max() + 3
    rgba = np.dstack([np.clip(a, 0, 255), alpha * 255])[y0:y1, x0:x1]
    img = Image.fromarray(rgba.round().astype(np.uint8), 'RGBA')
    img.save(os.path.join(OUT, 'glass-%s.webp' % name), quality=90, method=6, alpha_quality=100)
    print(name, img.size, os.path.getsize(os.path.join(OUT, 'glass-%s.webp' % name)), 'bytes')
