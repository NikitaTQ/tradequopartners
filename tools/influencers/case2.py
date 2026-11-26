"""The /for-influencers/ second earnings calculator (owner's design, November 2026: a metal briefcase with a glass lid,
numbers-src/case2-open.webp and case2-closed.webp, 1536 x 1024: the same case open, notes inside, and closed; on its
front face the controls). The page plays the lid opening when the block comes into view; this makes its pictures, all
on the open picture's frame, cropped to the case (x 95..1441, y 80..985: 1346 x 905), background the page's #f3f2f7:
  case2-base.webp     the open case without its lid (the heading and the standing lid wiped to the background; the
                      hinges stay), its front face's controls wiped (each row carried across from the clean metal
                      either side, x 186..198 / 1318..1330), so the page's live controls lie on it
  case2-lid.webp      the standing lid with its stays (transparent round it): it unfolds up from the hinge line
  case2-shut.webp     the closed lid, from the closed picture, set by a perspective warp onto the open case's tray
                      (its corners: 198,329 / 1338,329 / 1440,612 / 96,612 -> 247,506 / 1290,506 / 1400,716 / 136,716)
Run:  python3 tools/influencers/case2.py"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'numbers-src')
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
TO = np.array([243, 242, 247.])
CROP = (95, 80, 1441, 985)


def flat(a, band):
    """the design's background (lavender, uneven) brought to the page's flat colour: a smooth surface fitted to it in
    `band`, every pixel scaled by it (above it eased to white)"""
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    u, v = (xx - W / 2) / W, (yy - H / 2) / H
    m = band & (np.abs(a - np.median(a[band], 0)).max(2) < 12)
    B = lambda k: np.stack([np.ones(k.sum()), u[k], v[k], u[k] ** 2, v[k] ** 2, u[k] * v[k]], 1)
    allm = np.ones((H, W), bool)
    bg = np.stack([(B(allm) @ np.linalg.lstsq(B(m), a[..., c][m], rcond=None)[0]).reshape(H, W) for c in range(3)], 2)
    # only what is (near) background is moved to the page's colour: the case's metal keeps its own (a scale of every
    # pixel tinted the steel)
    w = np.clip(1 - np.abs(a - bg).max(2) / 34, 0, 1)[..., None]
    return a + (TO - bg) * w, bg


o = np.asarray(Image.open(os.path.join(SRC, 'case2-open.webp')).convert('RGB')).astype(float)
c = np.asarray(Image.open(os.path.join(SRC, 'case2-closed.webp')).convert('RGB')).astype(float)
H, W = o.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
o, bgo = flat(o, (xx < 110) | (xx > 1430) | ((yy > 960) & ((xx < 280) | (xx > 1320))))
c, _ = flat(c, (xx < 80) | (xx > 1460) | (yy > 920) | ((yy > 220) & (yy < 300)))

# the standing lid: its frame and glass (a quad) and what differs from the background above the hinge line (its
# stays), out of the hinges' boxes
quad = Image.new('L', (W, H), 0)
ImageDraw.Draw(quad).polygon([(226, 90), (1311, 90), (1262, 506), (272, 506)], fill=255)
lidm = ((np.abs(o - TO).max(2) > 9) | (np.asarray(quad) > 0)) & (yy < 507) & (yy > 84)
for x0, x1 in ((398, 522), (1020, 1144)):
    lidm &= ~((xx >= x0) & (xx < x1) & (yy >= 470))
lidm = np.asarray(Image.fromarray((lidm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1))).astype(float) / 255
lid = np.dstack([o, lidm * 255])
base = o.copy()
hinge = np.zeros((H, W), bool)
for x0, x1 in ((398, 522), (1020, 1144)):
    hinge |= (xx >= x0) & (xx < x1) & (yy >= 470)
base[(yy < 507) & ~hinge] = TO                                       # the heading and the lid: the page's background

# the front face: its controls wiped
FX0, FX1, FY0, FY1 = 199, 1317, 741, 887
l, r = o[FY0:FY1, 186:198].mean(1), o[FY0:FY1, 1318:1330].mean(1)
t = np.linspace(0, 1, FX1 - FX0)[None, :, None]
face = l[:, None] * (1 - t) + r[:, None] * t
rng = np.random.default_rng(5)
face += rng.normal(0, 1.4, (FY1 - FY0, FX1 - FX0, 1)) * np.array([1, 1, 1])
mm = Image.new('L', (W, H), 0)
ImageDraw.Draw(mm).rectangle((FX0, FY0, FX1 - 1, FY1 - 1), fill=255)
mm = np.asarray(mm.filter(ImageFilter.GaussianBlur(2))).astype(float)[FY0:FY1, FX0:FX1, None] / 255
base[FY0:FY1, FX0:FX1] = base[FY0:FY1, FX0:FX1] * (1 - mm) + face * mm
# the latches' tops reach up into that band: the original back over them
for x0, x1 in ((280, 370), (1140, 1235)):
    base[870:FY1, x0:x1] = o[870:FY1, x0:x1]

# the closed lid onto the tray
src = [(198, 329), (1338, 329), (1440, 612), (96, 612)]
dst = [(247, 506), (1290, 506), (1400, 716), (136, 716)]


def coeffs(pa, pb):   # PIL's perspective: maps output (pa) to input (pb)
    A = []
    for (x, y), (X, Y) in zip(pa, pb):
        A += [[x, y, 1, 0, 0, 0, -X * x, -X * y], [0, 0, 0, x, y, 1, -Y * x, -Y * y]]
    return np.linalg.solve(np.array(A, float), np.array([v for p in pb for v in p], float))


ci = Image.fromarray(np.clip(c + .5, 0, 255).astype(np.uint8))
shut = ci.transform((W, H), Image.PERSPECTIVE, tuple(coeffs(dst, src)), Image.BICUBIC)
sm = Image.new('L', (W, H), 0)
ImageDraw.Draw(sm).polygon(dst, fill=255)
sm = sm.filter(ImageFilter.GaussianBlur(.8))
shut = np.dstack([np.asarray(shut).astype(float), np.asarray(sm).astype(float)])

x0, y0, x1, y1 = CROP
for name, arr, mode in (('case2-base', base, 'RGB'), ('case2-lid', lid, 'RGBA'), ('case2-shut', shut, 'RGBA')):
    im = Image.fromarray(np.clip(arr + .5, 0, 255).astype(np.uint8), mode).crop(CROP)
    for w in (1346, 900):
        p = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        fn = os.path.join(OUT, '%s-%d.webp' % (name, w))
        p.save(fn, quality=86, alpha_quality=95, method=6)
        print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
print('lid box (%% of the crop): top %.3f bottom %.3f; hinge line y %.3f' % ((84 - y0) / (y1 - y0) * 100, (507 - y0) / (y1 - y0) * 100, (507 - y0) / (y1 - y0) * 100))
print('shut top %.3f; front face plate: left %.3f top %.3f width %.3f height %.3f' % ((506 - y0) / (y1 - y0) * 100, (FX0 - x0) / (x1 - x0) * 100, (FY0 - y0) / (y1 - y0) * 100, (FX1 - FX0) / (x1 - x0) * 100, (FY1 - FY0) / (y1 - y0) * 100))
