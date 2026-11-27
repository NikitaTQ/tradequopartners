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
low = np.asarray(Image.fromarray(src.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18))).astype(float)
# only the detail's brightness, as a ratio on the fill: the fill keeps its own hue (an added colour difference left
# a brownish smudge on the dark blue)
sl, ll = src.mean(2), low.mean(2)
ratio = np.clip(1 + (sl - ll) / (ll + 18), .45, 2.4)
win = win * ratio[..., None]
a[P0:P1, Q0:Q1] = a[P0:P1, Q0:Q1] * (1 - lm[P0:P1, Q0:Q1]) + win * lm[P0:P1, Q0:Q1]

# the planet round (owner's wish: it read as an egg). Its lit limb, measured on the design along rays from (1200, 560)
# where it is clear of the ring and the ship, is fitted with a circle: centre (1217, 541), radius 463. Where the limb
# strays from it (by up to 15px) the planet is pulled to it radially (the measured points below, interpolated, eased to
# no pull away from them); from the circle outwards the pull eases off over 140px, so the ring and the ship stay put.
# Then the whole disc is lit and given an atmosphere (below), so its round outline reads also on the night side.
PCX, PCY, PR = 1217., 541., 463.
angs = np.array([83, 86, 89, 92, 95, 98, 101, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135, 138, 141, 144, 181, 184, 191, 194, 197], float)
rads = np.array([473, 469, 466, 463, 462, 461, 460, 458, 459, 458, 458, 457, 458, 458, 460, 461, 463, 465, 466, 468, 469, 475, 474, 461, 458, 448], float)
yy0, xx0 = np.mgrid[0:H, 0:W].astype(float)
rr = np.hypot(xx0 - PCX, yy0 - PCY)
th = np.degrees(np.arctan2(-(yy0 - PCY), xx0 - PCX)) % 360
# the limb's radius in every direction: measured ones smoothed, outside them easing to PR (no pull)
grid = np.arange(0, 360)
prof = np.interp(grid, angs, rads)
prof = np.convolve(np.r_[prof[-6:], prof, prof[:6]], np.ones(7) / 7, mode='same')[6:-6]
w_meas = np.clip(np.minimum(grid - (angs[0] - 20), (angs[-1] + 20) - grid) / 20, 0, 1)
prof = PR + (prof - PR) * w_meas
rho = np.interp(th, grid, prof) / PR
ease = lambda t: t * t * (3 - 2 * t)
band = ease(np.clip((rr - PR) / 140, 0, 1))
scale = rho + (1 - rho) * band
sx_, sy_ = PCX + (xx0 - PCX) * scale, PCY + (yy0 - PCY) * scale
x0i = np.clip(np.floor(sx_).astype(int), 0, W - 2); y0i = np.clip(np.floor(sy_).astype(int), 0, H - 2)
fx = (sx_ - x0i)[..., None]; fy = (sy_ - y0i)[..., None]
a = (a[y0i, x0i] * (1 - fx) + a[y0i, x0i + 1] * fx) * (1 - fy) + (a[y0i + 1, x0i] * (1 - fx) + a[y0i + 1, x0i + 1] * fx) * fy

# the disc read as a ball: lit from the upper left as the design's limb is, its night side (lower right) darkened, and
# a thin atmosphere glowing all round its edge (bright where lit, faint on the night side), so its round outline shows
# even where the design let it fade into the sky
rr = np.hypot(xx0 - PCX, yy0 - PCY)
nxs, nys = (xx0 - PCX) / PR, (yy0 - PCY) / PR
nzs = np.sqrt(np.clip(1 - nxs ** 2 - nys ** 2, 0, 1))
Ls = np.array([-.62, -.55, .56]); Ls /= np.linalg.norm(Ls)
lam = nxs * Ls[0] + nys * Ls[1] + nzs * Ls[2]
disc = ease(np.clip((PR + 2 - rr) / 6, 0, 1))
shade = np.clip(.3 + .95 * lam, .16, 1.12)
a = a * (1 - disc[..., None]) + a * shade[..., None] * disc[..., None]
litr = np.clip(.5 + .5 * (-(nxs * .74 + nys * .67) / np.maximum(np.hypot(nxs, nys), 1e-6)), 0, 1)
rim = np.exp(-((rr - PR) / 9) ** 2) * (.18 + .82 * litr ** 1.6) + np.exp(-((rr - PR - 6) / 26) ** 2) * (.07 + .3 * litr ** 2)
a = a + rim[..., None] * np.array([110., 175, 255]) * .9

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
    """the real mark (star-src/logo-mark.png: tick, stem, dot) as a brushed-steel inlay set into the planet (owner's
    wish: at one with it, not pasted on): laid on the sphere (each pixel of the planet's disc mapped to the sphere's
    surface and from there to the mark's plane, so the mark bends with the planet), lit as the planet is (from the
    upper left), its edge a bevel facing that light, the clouds faintly reflected in it, a thin dark groove round it
    and the planet's haze over it; drawn on `big` (the 2400-wide picture, RGB float)"""
    S = big.shape[1] / W
    cx, cy, R = PCX * S, (PCY - CY0) * S, PR * S
    Hb, Wb = big.shape[:2]
    mk = np.asarray(Image.open(os.path.join(HERE, 'star-src', 'logo-mark.png')).convert('RGBA')).astype(float)[..., 3] / 255
    mk = mk[60:453, 11:502]                                           # the mark's box: 491 x 393
    up = 4
    hi = Image.fromarray((mk * 255).astype(np.uint8)).resize((mk.shape[1] * up, mk.shape[0] * up), Image.BICUBIC)
    hi = hi.filter(ImageFilter.GaussianBlur(up * .7)).point(lambda v: 255 if v > 127 else 0)
    MK = np.asarray(hi).astype(float) / 255                           # 1964 x 1572, crisp
    mh, mw = MK.shape
    # the mark's bevel: a height field from it (a few px of the mark's own scale), its slope
    HT = np.asarray(hi.filter(ImageFilter.GaussianBlur(up * 5))).astype(float) / 255
    gyM, gxM = np.gradient(HT)
    # the mark's centre on the planet: where the design had it (x 1133, y 413 of the design), its width there 300px
    LCX, LCY, LW = 1133 * S, (413 - CY0) * S, 300 * S
    c = np.array([(LCX - cx) / R, (LCY - cy) / R, 0.])
    c[2] = np.sqrt(max(0, 1 - c[0] ** 2 - c[1] ** 2))
    # a rotation taking c to (0, 0, 1), keeping "up" up as near as can be
    zc = c / np.linalg.norm(c)
    xc = np.cross([0, 1., 0], zc); xc /= np.linalg.norm(xc); xc = -xc if xc[0] < 0 else xc
    yc = np.cross(zc, xc)
    Rm = np.stack([xc, yc, zc])
    pad = int(LW * .75)
    X0, X1 = int(LCX - pad), int(LCX + pad); Y0_, Y1_ = int(LCY - pad), int(LCY + pad)
    yy_, xx_ = np.mgrid[Y0_:Y1_, X0:X1].astype(float)
    nx, ny = (xx_ - cx) / R, (yy_ - cy) / R
    inside = nx * nx + ny * ny < .995
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    N = np.stack([nx, ny, nz], -1)
    P = N @ Rm.T                                                      # in the mark's frame
    pz = np.clip(P[..., 2], 1e-3, None)
    u, v = P[..., 0] / pz * R, P[..., 1] / pz * R                     # on the mark's tangent plane, in px
    k = mw / LW                                                       # mark px per picture px
    mu, mv = u * k + mw / 2, v * k + mh / 2
    valid = inside & (P[..., 2] > .2) & (mu >= 1) & (mu < mw - 2) & (mv >= 1) & (mv < mh - 2)
    mui, mvi = np.clip(mu.astype(int), 0, mw - 1), np.clip(mv.astype(int), 0, mh - 1)
    # the mark, anti-aliased: sampled at 3x3 sub-pixels
    cov = np.zeros_like(u)
    for oy in (-1 / 3, 0, 1 / 3):
        for ox in (-1 / 3, 0, 1 / 3):
            su = np.clip(((u + ox * 1) * k + mw / 2).astype(int), 0, mw - 1); sv = np.clip(((v + oy * 1) * k + mh / 2).astype(int), 0, mh - 1)
            cov += MK[sv, su]
    cov = cov / 9 * valid
    # the surface normal: the sphere's, tilted by the bevel (in the mark's frame, then back)
    bx, by = gxM[mvi, mui] * 38, gyM[mvi, mui] * 38
    Nl = P.copy(); Nl[..., 0] -= bx; Nl[..., 1] -= by
    Nw = Nl @ Rm                                                      # back to the picture's frame
    Nw /= np.linalg.norm(Nw, axis=-1, keepdims=True)
    Lt = np.array([-.55, -.62, .56]); Lt /= np.linalg.norm(Lt)       # the planet's light: upper left, in front
    Vw = np.array([0, 0, 1.])
    Hh = (Lt + Vw) / np.linalg.norm(Lt + Vw)
    dif = np.clip((Nw * Lt).sum(-1), 0, 1)
    spec = np.clip((Nw * Hh).sum(-1), 0, 1) ** 38
    sheen = np.clip((Nw * Hh).sum(-1), 0, 1) ** 6
    # the mark raised out of the planet's own surface: its clouds run on across it, frosted to a pale ice-silver and
    # lit by the bevel (a bright edge toward the light, a dark one away), a soft sheen; round it a narrow shadow and a
    # faint glow where it meets the clouds
    reg = big[Y0_:Y1_, X0:X1]
    tex = reg.copy()
    tl = tex.mean(-1, keepdims=True)
    ice = np.array([196., 214, 236])
    frost = tex * .6 + ice * .42 * (0.5 + tl / 255)                   # the clouds still show through the frost
    lightk = .55 + .75 * dif[..., None]
    col = frost * lightk + sheen[..., None] * np.array([34., 42, 54]) + spec[..., None] * np.array([150., 160, 175])
    lam2 = (N * np.array([-.62, -.55, .56]) / np.linalg.norm([-.62, -.55, .56])).sum(-1)
    col *= np.clip(.55 + .6 * lam2, .38, 1.06)[..., None]
    haze = (1 - nz)[..., None] ** 1.2 * .45
    col = col * (1 - haze) + np.array([70., 130, 200]) * haze
    ring = np.asarray(Image.fromarray((cov * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(float) / 255
    sh = np.roll(np.roll(ring, 6, 0), 4, 1)                            # cast down and right, away from the light
    reg *= (1 - np.clip(sh - cov, 0, 1) * .55)[..., None]
    glow = np.clip(np.asarray(Image.fromarray((cov * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(float) / 255 - cov, 0, 1)
    reg += (glow * .35)[..., None] * np.array([90., 150, 230])
    reg[:] = reg * (1 - cov[..., None]) + col.clip(0, 255) * cov[..., None]
    print('logo inlaid at', int(LCX), int(LCY), 'sphere centre', int(cx), int(cy), 'radius', int(R))


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
