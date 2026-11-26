"""The /for-influencers/ closing picture (owner's design, November 2026, star-src/star-window-design.webp, 1672 x 941):
a spaceship's window on the TradeQuo planet. The page sets its words as real text (sharper than the picture's), so here
they are wiped from the sky: "WANT TO BE OUR NEXT STAR?" (x 476..1197, y 74..97) and "INVITED. / SEE YOU SOON."
(612..1076 x 134..187, 435..1252 x 211..267) -> each box filled smoothly from the sky round it (a harmonic fill), the
sky's grain and a few faint stars put back. The window's surroundings are made fully transparent (the block under it
is the night sky now). Then sharpened: enlarged to 2200 wide with Lanczos and a light unsharp mask, so it stays crisp
on a 2x screen at its largest (1100 CSS px).
Run:  python3 tools/influencers/star_window.py   ->  site/assets/influencers/star-window-{2200,1400,900}.webp"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
im = Image.open(os.path.join(HERE, 'star-src', 'star-window-design.webp')).convert('RGB')
a = np.asarray(im).astype(float)
H, W = a.shape[:2]
rng = np.random.default_rng(7)

# the words' boxes (with their shadows and glow), one mask
mask = np.zeros((H, W), bool)
for x0, y0, x1, y1 in ((456, 56, 1217, 116), (592, 116, 1098, 199), (414, 193, 1274, 288)):
    mask[y0:y1, x0:x1] = True
# the sky's grain, from the clean sky beside them
ref = a[130:190, 330:400]
grain = np.median(np.abs(ref - np.asarray(Image.fromarray(ref.astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(float))) * 1.25
# harmonic fill (red-black over-relaxation) from the sky round the boxes
Y0, Y1, X0, X1 = 48, 296, 404, 1284
win, mw = a[Y0:Y1, X0:X1].copy(), mask[Y0:Y1, X0:X1]
iy, ix = np.mgrid[0:Y1 - Y0, 0:X1 - X0]
for it in range(1200):
    for par in (0, 1):
        pad = np.pad(win, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]) / 4
        sel = mw & (((iy + ix) % 2) == par)
        win[sel] += 1.9 * (avg[sel] - win[sel])
a[Y0:Y1, X0:X1] = win
noise = np.asarray(Image.fromarray((128 + rng.normal(0, 40, (H, W))).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))).astype(float) - 128
noise *= grain / max(noise.std(), 1e-6)
a[mask] += noise[mask][:, None]
print('sky grain', round(float(grain), 2))
# a few faint stars in the wiped sky, as the sky round it has
ys, xs = np.where(mask)
for k in rng.choice(len(ys), 46, replace=False):
    y, x = ys[k], xs[k]
    b = rng.uniform(40, 150)
    r = 1 if b < 110 else 2
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            f = max(0, 1 - (dy * dy + dx * dx) ** .5 / (r + .4))
            a[y + dy, x + dx] = np.minimum(255, a[y + dy, x + dx] + b * f * np.array([.85, .92, 1]))

# no glass frame (owner's wish: the view alone, at one with the night band round it): cropped inside the frame's rim,
# its edges faded out (a soft rounded vignette in alpha), so the cockpit's view dissolves into the page's night
CX0, CY0, CX1, CY1 = 50, 42, W - 50, H - 46
a = a[CY0:CY1, CX0:CX1]
H2, W2 = a.shape[:2]
yy, xx = np.mgrid[0:H2, 0:W2].astype(float)
FX, FY = W2 * .075, H2 * .11
dx = np.clip(np.minimum(xx, W2 - 1 - xx) / FX, 0, 1)
dy = np.clip(np.minimum(yy, H2 - 1 - yy) / FY, 0, 1)
ease = lambda t: t * t * (3 - 2 * t)
alpha = ease(dx) * ease(dy)
# the frame's glass glare (a light band across the top left corner) and, for balance, the top right corner: both top
# corners fade further, round each corner
for cx in (0, W2 - 1):
    r = np.hypot(xx - cx, yy * 1.25) / 330
    alpha *= ease(np.clip((r - .25) / .75, 0, 1))
alpha *= 255
print('crop', (CX0, CY0, CX1, CY1), 'size', W2, H2)
out = Image.fromarray(np.dstack([np.clip(a, 0, 255), alpha]).astype(np.uint8), 'RGBA')
H, W = H2, W2
for w in (2200, 1400, 900):
    p = out.resize((w, round(H * w / W)), Image.LANCZOS)
    if w > W:
        rgb = p.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
        p = Image.merge('RGBA', (*rgb.split(), p.split()[3]))
    fn = os.path.join(OUT, 'star-window-%d.webp' % w)
    p.save(fn, quality=88, alpha_quality=90, method=6)
    print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
