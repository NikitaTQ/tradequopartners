"""Run: python3 tools/who-slab/erase.py  (numpy + Pillow; writes site/assets/programs/who-slab.webp)
The Who it's for slab from the design (Who_Its_For_Glass): its words, chips, rule and button taken out, the glass under
them filled in from the glass around (normalized convolution: a blur of the known pixels divided by a blur of the mask)."""
import numpy as np
from PIL import Image
import os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'programs', 'who-slab.webp')
src = np.asarray(Image.open(os.path.join(HERE, 'design.webp')).convert('RGB')).astype(np.float64)
H, W, _ = src.shape
# the content, in design px (x0, y0, x1, y1), a little wider than the marks and their shadows
BOXES = [
    (168, 214, 812, 256),     # dot + eyebrow
    (840, 196, 1550, 274),    # chips (with their shadows)
    (168, 306, 1300, 518),    # the two drum lines (and the faint shade under them)
    (166, 551, 1514, 566),    # the rule
    (166, 588, 436, 616),     # WITH TRADEQUO · 01/05
    (166, 622, 958, 706),     # the gain, two lines
    (1018, 598, 1506, 742),   # the button and its shadow (not the grey facet under it: FACET below)
]
def gblur(a, s):
    r = int(3 * s); x = np.arange(-r, r + 1); k = np.exp(-x * x / (2 * s * s)); k /= k.sum()
    out = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 1, out)
out = src.copy()
yy, xx = np.mgrid[0:H, 0:W]
FACET = (xx > 1255) & (yy > 810 - (xx - 1260) * 0.3676 - 3)   # the grey facet in the bottom right corner stays as it is
HOLE = np.zeros((H, W), bool)
for (x0, y0, x1, y1) in BOXES: HOLE[y0:y1, x0:x1] = True
HOLE &= ~FACET
# the fill learns only from plain glass: light and neutral (not the red glints, the rim's whites or the grey facets)
r, g, b = src[..., 0], src[..., 1], src[..., 2]
PLAIN = (r >= 225) & (g >= 225) & (b >= 228) & (abs(r - g) < 6) & (b - g < 12) & (r < 252)
KNOWN = (~HOLE & PLAIN).astype(float)
for (x0, y0, x1, y1) in BOXES:
    pad = 90
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    win = src[Y0:Y1, X0:X1]; known = KNOWN[Y0:Y1, X0:X1]; holeW = HOLE[Y0:Y1, X0:X1]
    acc = np.zeros(win.shape[:2]); res = np.zeros_like(win)
    for s_ in (12, 28, min(y1 - y0, x1 - x0) * 0.7 + 10):       # fine first: near the edges the local shading wins
        m = gblur(known, s_)
        f = np.stack([gblur(win[..., c] * known, s_) for c in range(3)], -1) / np.maximum(m, 1e-6)[..., None]
        w = np.clip(m * 4, 0, 1) * (1 - acc)
        res += f * w[..., None]; acc += w
    res = res / np.maximum(acc, 1e-6)[..., None]
    out[Y0:Y1, X0:X1][holeW] = res[holeW]
# a whisper of the glass's grain over the filled areas, so they do not read flatter than the rest
rng = np.random.default_rng(7); mask = np.zeros((H, W), bool)
mask = HOLE
out[mask] += rng.normal(0, 0.7, (mask.sum(), 1))
img = Image.fromarray(np.clip(out, 0, 255).round().astype(np.uint8))
img.save(OUT, quality=92, method=6)
print('ok', img.size)
