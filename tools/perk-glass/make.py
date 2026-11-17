"""Run: python3 tools/perk-glass/make.py  (numpy + Pillow; writes site/assets/perks/perk-glass.webp)
The perk card of the owner's design (design.webp: six dark glass cards, chrome rim, chamfers at the top right and the
bottom left, red glints at the other two corners; November 2026) as a plate for the page's own icon and words: the
first card (Incentive Trips) is taken, its suitcase and words are taken out and the glass under them filled in from the
glass around (normalized convolution: a blur of the known pixels divided by a blur of the mask, fine scales first),
then the card is cut out of the light page it was drawn on along its dark outer line (a soft 1px edge) and cropped.
partner.css (.tp-perk--glass) lays it on as a nine-part border-image: the corners (chamfers, glints) keep their
shape, the rims and the middle stretch with the card."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'perks')
os.makedirs(OUT, exist_ok=True)


def gblur(a, s):
    r = int(3 * s); x = np.arange(-r, r + 1); k = np.exp(-x * x / (2 * s * s)); k /= k.sum()
    out = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 1, out)


def grow(m, n):
    for _ in range(n):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m


img = np.asarray(Image.open(os.path.join(HERE, 'design.webp')).convert('RGB')).astype(np.float64)
X0, Y0, X1, Y1 = 28, 92, 658, 332                 # the first card with a margin of the page round it
a = img[Y0:Y1, X0:X1].copy()
H, W, _ = a.shape
L = a.mean(2)

# ---- the outline: row by row, the card is everything that is not the light page (darker, or coloured); the rows run
#      from the card's top line to its bottom line (the shadow under the card is left out), so the chamfers come out
#      as they are drawn
TOP, BOT = 101 - Y0, 322 - Y0
sat = a.max(2) - a.min(2)
ink = (L < 205) | (sat > 40)
ink[H // 2:] = ((L < 150) | (sat > 40))[H // 2:]   # the lower half: stricter, the shadow under the card is greyer there
card = np.zeros((H, W), bool)
for y in range(TOP, BOT + 1):
    xs = np.nonzero(ink[y])[0]
    if len(xs): card[y, xs.min():xs.max() + 1] = True

# ---- the content: the suitcase (with its shade on the glass) and the words, inside the rim. The glass under them is
#      filled from the dark glass round them only (not the chrome rim, not the red glints), with a soft seam
hole = np.zeros((H, W), bool)
hole[150 - Y0:302 - Y0, 66 - X0:232 - X0] = True                      # the suitcase's body and its shade
hole[124 - Y0:150 - Y0, 118 - X0:204 - X0] = True                     # its handle (the red glint of the corner stays)
words = np.zeros((H, W), bool); words[150 - Y0:272 - Y0, 244 - X0:612 - X0] = True
hole |= grow(words & (L > 30), 6) & grow(words, 6)                     # the words' strokes (white and grey on the dark)
inner = ~grow(~card, 14)                                               # inside the rim
glass = inner & ~hole & (L < 70) & (sat < 30)
known = glass.astype(float)
res = np.zeros_like(a); acc = np.zeros((H, W))
for s in (8, 18, 36, 70):
    m = gblur(known, s)
    f = np.stack([gblur(a[..., c] * known, s) for c in range(3)], -1) / np.maximum(m, 1e-6)[..., None]
    w = np.clip(m * 3, 0, 1) * (1 - acc)
    res += f * w[..., None]; acc += w
res = res / np.maximum(acc, 1e-6)[..., None]
soft = np.clip(gblur(grow(hole, 3).astype(float), 3) * 1.6, 0, 1)[..., None] * inner[..., None]
a = a * (1 - soft) + res * soft
rng = np.random.default_rng(5)
a[hole] += rng.normal(0, 0.6, (hole.sum(), 1))   # the glass's grain over the filled place

# ---- cut out (a 1px soft edge) and crop
alpha = np.clip(gblur(card.astype(float), 0.6) * 1.12, 0, 1)
ys, xs = np.nonzero(card)
y0, y1, x0, x1 = ys.min() - 1, ys.max() + 2, xs.min() - 1, xs.max() + 2
rgba = np.dstack([np.clip(a, 0, 255), alpha * 255])[y0:y1, x0:x1]
out = Image.fromarray(rgba.round().astype(np.uint8), 'RGBA')
path = os.path.join(OUT, 'perk-glass.webp')
out.save(path, quality=90, method=6, alpha_quality=100)
print(out.size, os.path.getsize(path), 'bytes')
