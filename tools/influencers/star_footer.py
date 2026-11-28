"""/for-influencers/ "Next star", the page's last block (owner's design, 27 November 2026:
star-src/star-footer-design.webp, 1415 x 788): the night with the TradeQuo planet (its logo in silver), its ring, the
ship; on the left the words and a launch console. The page writes the words as real text and draws the console itself
(«Buttons» in influencers.css), so both are wiped here: each covered with the same night from just beside it (the
stars come with it), the seams feathered. Then 2x (Lanczos and a light unsharp mask) and the edges fading out (the
page's night round it is the design's own colour). Writes site/assets/influencers/star-footer-{1100,1800,2830}.webp and,
for phones, the right part (planet, ring, ship): star-footer-m-{900,1400}.webp; the console alone (its words,
rocket and logo wiped, for the page to write): star-console-680.webp."""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
im = Image.open(os.path.join(HERE, 'star-src', 'star-footer-design.webp')).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(np.float64)
a[0:5] = a[5:10]   # the design's top 5 rows are the page round the screenshot, not the scene


def patch(a, box, dy, dx=0, feather=6):
    """cover box (x0, y0, x1, y1) with the image dy/dx away, feathered at the box's edges"""
    x0, y0, x1, y1 = box
    m = np.zeros((H, W)); m[y0:y1, x0:x1] = 1
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(feather / 2))) / 255.0
    m = np.maximum(m, 0); src = np.roll(np.roll(a, -dy, 0), -dx, 1)
    return a * (1 - m[..., None]) + src * m[..., None]


# the console, as the design draws it, for the page to lay over the scene (and show under it on phones): its words,
# rocket and logo wiped off the red glass (harmonic fill), so the page writes them crisp
CB = (22, 492, 362, 706)
con = a[CB[1]:CB[3], CB[0]:CB[2]].copy()
cx0, cy0 = CB[0], CB[1]
sub = con[612 - cy0:641 - cy0, 100 - cx0:290 - cx0]
mk = (sub.min(2) > 80) | ((sub.mean(2) > 120) & (sub[..., 0] - sub[..., 1] < 110))
mk = np.asarray(Image.fromarray((mk * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
cm = np.zeros(con.shape[:2], bool); cm[611 - cy0:642 - cy0, 98 - cx0:292 - cx0] = True   # the whole band under them (their dark halos too)
yy, xx = np.nonzero(cm)
for y in np.unique(yy):
    row = cm[y]; idx = np.arange(row.size)
    for c in range(3):
        con[y, row, c] = np.interp(idx[row], idx[~row], con[y, ~row, c])
par = (yy + xx) % 2
for it in range(700):
    for p_ in (0, 1):
        s = par == p_; Y, X = yy[s], xx[s]
        con[Y, X] += 1.9 * ((con[Y - 1, X] + con[Y + 1, X] + con[Y, X - 1] + con[Y, X + 1]) / 4 - con[Y, X])
cimg = Image.fromarray(np.clip(con, 0, 255).astype(np.uint8))
cbig = cimg.resize((cimg.width * 2, cimg.height * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.6, 50, 2))

# the words: the left part from below them, the end of "SEE YOU SOON." (past the kicker) from above
a = patch(a, (18, 138, 472, 172), -105)
a = patch(a, (18, 184, 430, 254), 175)
a = patch(a, (18, 260, 560, 330), 170)
a = patch(a, (555, 260, 722, 330), -175)
# the console and its glow: from above it (the words' place, already clean)
a = patch(a, (22, 492, 362, 706), -210, feather=10)

base = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
big = base.resize((W * 2, H * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 55, 2))


def fade(img, l, r, t, b):
    w, h = img.size
    x = np.linspace(0, 1, w); y = np.linspace(0, 1, h)
    sm = lambda v: v * v * (3 - 2 * v)
    fx = np.minimum(1, np.minimum(x / l if l else 1, (1 - x) / r if r else 1)).clip(0, 1)
    fy = np.minimum(1, np.minimum(y / t if t else 1, (1 - y) / b if b else 1)).clip(0, 1)
    al = (sm(fx)[None, :] * sm(fy)[:, None] * 255).astype(np.uint8)
    o = img.convert('RGBA'); o.putalpha(Image.fromarray(al)); return o


full = fade(big, .035, .035, .05, .05)
cf = fade(cbig, .06, .06, .05, .05)
cf.save(os.path.join(OUT, 'star-console-680.webp'), quality=90, method=6)
cimg.save('/tmp/claude-0/-home-claude-repo/1eb0cc2f-95ce-5f1a-8c64-3cfa47139495/scratchpad/sf-console.png')
for w in (2830, 1800, 1100):
    o = full if w == full.width else full.resize((w, round(full.height * w / full.width)), Image.LANCZOS)
    o.save(os.path.join(OUT, 'star-footer-%d.webp' % w), quality=86, method=6)
# phones: the planet, its ring and the ship (x 520..1415 of the design)
ph = fade(big.crop((1040, 60, W * 2, H * 2 - 40)), .06, .04, .06, .08)
for w in (1400, 900):
    ph.resize((w, round(ph.height * w / ph.width)), Image.LANCZOS).save(os.path.join(OUT, 'star-footer-m-%d.webp' % w), quality=86, method=6)
base.save('/tmp/claude-0/-home-claude-repo/1eb0cc2f-95ce-5f1a-8c64-3cfa47139495/scratchpad/sf-clean.png')
print(full.size, ph.size)
