"""The /for-influencers/ closing picture (owner's design, November 2026, star-src/star-planet-design.webp, 1585 x 992):
the TradeQuo planet with its ring on the right, a silver ship flying in from the left, open night sky on the left
for the words. The page sets the words as real text (sharper), so here they are wiped from the sky: "WANT TO BE OUR
NEXT STAR?" (x 93..637, y 271..289), "INVITED." and "SEE YOU SOON." (x 96..735, y 329..371 and 395..437): each box
filled smoothly from the sky round it (a harmonic fill), the sky's fine grain put back. The design's light haze at
its top and bottom is cropped off (y 60..932) and the picture's edges are faded out in alpha (top and bottom more), so
it dissolves into the page's night band (influencers.css .inf-star). Enlarged to 2400 wide with Lanczos and a light
unsharp mask, so it stays crisp on a 2x screen.
The logo on the planet is redrawn from the real mark (star-src/logo-mark.png) in brushed steel: metal_logo().
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

# the design's logo on the planet is the wrong shape (its tick and stem redrawn loosely): wiped here and drawn again
# from the real mark below. The wipe (x 975..1295, y 285..538, soft edged): a smooth fill from the planet round it
# (harmonic) plus the fine detail of the planet's clouds from below the ring (x 1100..1420, y 612..865, high-pass)
LX0, LY0, LX1, LY1 = 975, 285, 1295, 538
lm = Image.new('L', (W, H), 0)
from PIL import ImageDraw
ImageDraw.Draw(lm).rounded_rectangle((LX0 + 6, LY0 + 6, LX1 - 6, LY1 - 6), radius=30, fill=255)
lm = np.asarray(lm.filter(ImageFilter.GaussianBlur(5))).astype(float)[..., None] / 255
hard = lm[..., 0] > 0.01
P0, P1, Q0, Q1 = LY0 - 14, LY1 + 14, LX0 - 14, LX1 + 14
win, mw = a[P0:P1, Q0:Q1].copy(), hard[P0:P1, Q0:Q1]
iy2, ix2 = np.mgrid[0:P1 - P0, 0:Q1 - Q0]
for it in range(2500):
    for par in (0, 1):
        pad = np.pad(win, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]) / 4
        sel = mw & (((iy2 + ix2) % 2) == par)
        win[sel] += 1.9 * (avg[sel] - win[sel])
src = a[612:612 + (P1 - P0), 1100:1100 + (Q1 - Q0)]
low = np.asarray(Image.fromarray(src.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))).astype(float)
# only the detail's brightness, as a ratio on the fill: the fill keeps its own hue (an added colour difference left
# a brownish smudge on the dark blue)
sl, ll = src.mean(2), low.mean(2)
ratio = np.clip(1 + (sl - ll) / (ll + 25), .55, 1.9)
win = win * ratio[..., None]
a[P0:P1, Q0:Q1] = a[P0:P1, Q0:Q1] * (1 - lm[P0:P1, Q0:Q1]) + win * lm[P0:P1, Q0:Q1]

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


def metal_logo(big):
    """the real mark (star-src/logo-mark.png: tick, stem, dot) in brushed blue-silver steel, as the design's: a bevelled
    edge lit from the top left, fine diagonal brushing, a soft sheen across it, a shadow cast on the planet; drawn on
    `big` (RGB float, the 2400-wide picture), its box where the design's logo was (x 986..1280 of 1585, y 297..530)"""
    S = big.shape[1] / W
    bx0, by0, bw = 986 * S, (297 - CY0) * S, 296 * S
    mk = np.asarray(Image.open(os.path.join(HERE, 'star-src', 'logo-mark.png')).convert('RGBA')).astype(float)[..., 3] / 255
    mk = mk[60:453, 11:502]                                           # the mark's box: 491 x 393
    k = bw / mk.shape[1]
    up = 4
    hi = Image.fromarray((mk * 255).astype(np.uint8)).resize((round(mk.shape[1] * k * up), round(mk.shape[0] * k * up)), Image.BICUBIC)
    hi = hi.filter(ImageFilter.GaussianBlur(up * .6)).point(lambda v: 255 if v > 127 else 0)
    M = np.asarray(hi.resize((round(mk.shape[1] * k), round(mk.shape[0] * k)), Image.LANCZOS)).astype(float) / 255
    h, w = M.shape
    ox, oy = int(round(bx0)), int(round(by0))
    pad = 40
    Hh, Ww = h + 2 * pad, w + 2 * pad
    Mp = np.zeros((Hh, Ww)); Mp[pad:pad + h, pad:pad + w] = M
    rng2 = np.random.default_rng(3)
    # the shadow on the planet, down and right
    sh = np.asarray(Image.fromarray((Mp * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))).astype(float) / 255
    sh = np.roll(np.roll(sh, 16, 0), 10, 1)
    # the bevel: a height field from the mask, its slope lit from the top left
    hgt = np.asarray(Image.fromarray((Mp * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4.2))).astype(float) / 255
    gy, gx = np.gradient(hgt)
    lit = np.clip(-(gx + gy) * 9, -1, 1)                              # + facing the light, - away
    # brushing: noise streaked along a diagonal (down and to the right, as the design's)
    nz = rng2.normal(0, 1, (Hh * 2, Ww * 2))
    nzi = Image.fromarray(((nz * 30) + 128).clip(0, 255).astype(np.uint8)).rotate(-62, resample=Image.BICUBIC)
    nzi = nzi.filter(ImageFilter.BoxBlur(0)).resize((Ww * 2, Hh * 2))
    arr = np.asarray(nzi).astype(float)
    # streak: blur strongly along one axis after rotating, then rotate back
    st = Image.fromarray(arr.astype(np.uint8)).resize((Ww * 2, max(1, Hh * 2 // 24)), Image.BILINEAR).resize((Ww * 2, Hh * 2), Image.BICUBIC)
    st = np.asarray(st.rotate(62, resample=Image.BICUBIC)).astype(float)
    cy, cx = st.shape[0] // 2, st.shape[1] // 2
    st = st[cy - Hh // 2:cy - Hh // 2 + Hh, cx - Ww // 2:cx - Ww // 2 + Ww]
    brush = (st - st.mean()) / max(st.std(), 1e-6)
    fine = rng2.normal(0, 1, (Hh, Ww))
    # the base: lighter at the top left, deeper blue-steel to the bottom right; a sheen band across the middle
    yy2, xx2 = np.mgrid[0:Hh, 0:Ww].astype(float)
    t = np.clip(((xx2 - pad) / w * .45 + (yy2 - pad) / h * .55), 0, 1)
    top, bot = np.array([226., 236, 250]), np.array([92., 122, 162])
    base = top * (1 - t[..., None]) + bot * t[..., None]
    band = np.exp(-(((xx2 - pad) / w * .8 - (yy2 - pad) / h * .55 - .18) / .12) ** 2)
    # polished: two soft reflections across it (as a mirror-like steel catches the sky)
    refl = np.exp(-(((yy2 - pad) / h - .30) / .05) ** 2) * .5 + np.exp(-(((yy2 - pad) / h * .7 + (xx2 - pad) / w * .3 - .72) / .07) ** 2) * .35
    col = base + band[..., None] * np.array([40., 44, 48]) + refl[..., None] * np.array([30., 36, 44]) + brush[..., None] * 5 + fine[..., None] * 2.5
    col += (np.clip(lit, 0, 1) * 110)[..., None] - (np.clip(-lit, 0, 1) * 95)[..., None] * np.array([1, .92, .8])
    # a thin bright rim on the lit edges, a dark one on the others
    edge = np.clip(Mp - np.asarray(Image.fromarray((Mp * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(float) / 255, 0, 1)
    col += (edge * np.clip(lit * 3, -1, 1) * 60)[..., None]
    # a few fine scratches
    for _ in range(40):
        x0_, y0_ = rng2.uniform(pad, pad + w), rng2.uniform(pad, pad + h)
        L_, ang = rng2.uniform(6, 30), rng2.uniform(0, np.pi)
        im_s = Image.new('L', (Ww, Hh), 0)
        ImageDraw.Draw(im_s).line((x0_, y0_, x0_ + L_ * np.cos(ang), y0_ + L_ * np.sin(ang)), fill=int(rng2.uniform(60, 140)), width=1)
        col += (np.asarray(im_s).astype(float) / 255 * 50)[..., None]
    col = col.clip(0, 255)
    Y0b, X0b = oy - pad, ox - pad
    reg = big[Y0b:Y0b + Hh, X0b:X0b + Ww]
    reg *= (1 - sh * .62)[..., None]
    # the thickness: the mark's side, a few px down and right, dark steel lit a little at its top
    for d in range(9, 0, -1):
        Md = np.roll(np.roll(Mp, d, 0), int(round(d * .55)), 1)
        c_ = np.array([28., 40, 58]) + (9 - d) * np.array([5., 6, 8])
        reg[:] = reg * (1 - Md[..., None]) + c_ * Md[..., None]
    reg[:] = reg * (1 - Mp[..., None]) + col * Mp[..., None]
    print('logo at', ox, oy, 'size', w, h)


H3 = round(H2 * 2400 / W)
big_rgba = out.resize((2400, H3), Image.LANCZOS)
rgb = big_rgba.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
bigf = np.asarray(rgb).astype(float)
metal_logo(bigf)
out = Image.merge('RGBA', (*Image.fromarray(bigf.clip(0, 255).astype(np.uint8)).split(), big_rgba.split()[3]))
for w in (2400, 1600, 1000):
    p = out if w == 2400 else out.resize((w, round(H3 * w / 2400)), Image.LANCZOS)
    fn = os.path.join(OUT, 'star-planet-%d.webp' % w)
    p.save(fn, quality=88, alpha_quality=90, method=6)
    print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
