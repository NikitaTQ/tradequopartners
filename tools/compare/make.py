"""Run: python3 tools/compare/make.py  (numpy + Pillow; writes site/assets/compare/<key>.webp)
The six small icons of the TradeQuo column of the comparison block (the owner's design: design.webp, phone:
design-phone.png; November 2026): cut out of the design round their centres, the card's lilac glass divided out so
the background is white (the page lays them on with mix-blend-mode: multiply, so only the icon shows)."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'compare')
os.makedirs(OUT, exist_ok=True)
im = np.asarray(Image.open(os.path.join(HERE, 'design.webp')).convert('RGB')).astype(np.float64)
BG = np.array([242.0, 235.0, 247.0])
H = 34                                     # half the square
for key, cx, cy in [('tiers', 925, 266), ('share', 926, 355), ('shield', 925, 445), ('daily', 927, 530), ('tv', 930, 617), ('trips', 927, 717)]:
    a = im[cy - H:cy + H, cx - H:cx + H]
    w = np.clip(a * 255.0 / BG, 0, 255)
    Image.fromarray(w.round().astype(np.uint8)).save(os.path.join(OUT, key + '.webp'), quality=92, method=6)
    print(key, os.path.getsize(os.path.join(OUT, key + '.webp')))

# ---- the TradeQuo card itself (the design's glass card: chrome rim, chamfered corners, red glints at the top left and
#      bottom right), as a plate for the page's own content: its logo, rows and button taken out and the glass under
#      them filled in from the glass round them (normalized convolution, fine scales first), cut out along its outline
#      (chamfers: 17px at the top left and bottom right, ~46px at the top right and bottom left) with a soft 1px edge.
#      site.css lays it on as a nine-part border-image (.tq-cmp__card): the corners keep their shape and glints.
def gblur(a, s):
    r = int(3 * s); x = np.arange(-r, r + 1); k = np.exp(-x * x / (2 * s * s)); k /= k.sum()
    out = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 1, out)


def grow(m, n):
    for _ in range(n):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m


X0, Y0, X1, Y1 = 838, 108, 1327, 938                       # the card's outer edge in the design
a = im[Y0:Y1, X0:X1].copy(); H2, W2, _ = a.shape
L = a.mean(2); sat = a.max(2) - a.min(2)
yy, xx = np.mgrid[0:H2, 0:W2]
TLc, TRc, BLc, BRc = 17, 47, 45, 17
card = (xx + yy >= TLc) & ((W2 - 1 - xx) + yy >= TRc) & (xx + (H2 - 1 - yy) >= BLc) & ((W2 - 1 - xx) + (H2 - 1 - yy) >= BRc)
hole = np.zeros((H2, W2), bool)
def box(x0, y0, x1, y1): b = np.zeros((H2, W2), bool); b[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = True; return b
hole |= box(898, 148, 1130, 218) & (L < 150)                                   # the logo and "OUR PROGRAM"
hole |= box(890, 232, 1295, 768) & ((L < 214) | (sat > 34))                    # the rows: icons and words
hole |= box(888, 792, 1290, 872)                                               # the button and its shadow
hole = grow(hole, 5) & card
inner = ~grow(~card, 22)
known = (inner & ~hole).astype(float)
res = np.zeros_like(a); acc = np.zeros((H2, W2))
for s in (6, 14, 30, 64):
    m = gblur(known, s)
    f = np.stack([gblur(a[..., c] * known, s) for c in range(3)], -1) / np.maximum(m, 1e-6)[..., None]
    w = np.clip(m * 3, 0, 1) * (1 - acc)
    res += f * w[..., None]; acc += w
res = res / np.maximum(acc, 1e-6)[..., None]
soft = np.clip(gblur(grow(hole, 2).astype(float), 2) * 1.5, 0, 1)[..., None]
a = a * (1 - soft) + res * soft
alpha = np.clip(gblur(card.astype(float), 0.6) * 1.12, 0, 1)
plate = Image.fromarray(np.dstack([np.clip(a, 0, 255), alpha * 255]).round().astype(np.uint8), 'RGBA')
plate.save(os.path.join(OUT, 'card.webp'), quality=90, method=6, alpha_quality=100)
print('card', plate.size, os.path.getsize(os.path.join(OUT, 'card.webp')))
