"""The /for-influencers/ hero scene for desktops (owner's design, November 2026: Instagram, Telegram and TikTok posts of
"your channel" in glass, wired to a dark "Your commissions" panel; hero-desktop-design.webp, 1254 x 1254). Its own
picture, with:
  - two lines that carried the word "trade" (the site never uses it) set again in the design's face (Inter), at the
    size that gives the old width, on the old baseline, at the card's tilt (the old ink wiped first, each column
    filled from the card just above and below it):
      Instagram caption  "The platform I trade on. Link in bio."  ->  "The platform I use. Link in bio."
                         (the TikTok caption of the same design already says so)
      Telegram post      "Trade with the tools I use every day."  ->  "The tools I use every day."
  - its background (about #eeecf6, a shade darker at the corners) brought to the hero's flat #f3f2f7: the design's own
    background is measured round the scene (a smooth surface fitted to the margin), and each pixel's channels are
    scaled by it (up to the background; above it eased to white, so no glint clips): the picture's edge is then
    invisible on the page, the shadows and glows under the cards stay as drawn;
  - cut to the scene with a margin for the shadows.
Writes site/assets/influencers/scene-wide-{491,737,982}.webp (982 x 996 = the design's own pixels).
Run:  python3 tools/influencers/hero_desktop.py   (CHECK=/path/file.png also saves the full picture for a look)"""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(ROOT, 'site', 'assets', 'influencers')
FONT = '/usr/share/fonts/opentype/inter/Inter-{}.otf'   # Inter (OFL); only this script reads it
SS = 6                                                   # text drawn 6x larger and scaled down (smooth edges)
CROP = (124, 112, 1106, 1108)
BG, TO = np.array([238, 236, 246]), np.array([243, 242, 247])   # the design's background (about), the hero's

im = Image.open(os.path.join(HERE, 'hero-desktop-design.webp')).convert('RGB')
a = np.asarray(im).astype(float)
L = np.asarray(im.convert('L')).astype(float)

# card, old ink box (x0, x1, top at x0, baseline at x0), tilt (degrees, - = rising to the right), weight, old words, new
LINES = [
    dict(box=(295, 457, 529.5, 537.6), tilt=-0.95, w='Medium', old='The platform I trade on. Link in bio.', new='The platform I use. Link in bio.'),
    dict(box=(524, 742, 345.6, 356.0), tilt=0.0, w='Medium', old='Trade with the tools I use every day.', new='The tools I use every day.'),
]


def wipe(x0, x1, top, base, tilt, up=3, down=5):
    """each column of the band round the old ink: the card's colour just above it blended into the colour just below"""
    t = math.tan(math.radians(tilt))
    for x in range(x0 - 2, x1 + 3):
        dy = (x - x0) * t
        ya, yb = int(math.floor(top + dy - up)), int(math.ceil(base + dy + down))
        ca, cb = a[ya - 2:ya, x].mean(0), a[yb + 1:yb + 3, x].mean(0)
        for y in range(ya, yb + 1):
            f = (y - ya) / (yb - ya)
            a[y, x] = ca * (1 - f) + cb * f


def ink_colour(x0, x1, y0, y1):
    """the old ink's own colour: its darkest pixels (the strokes' cores)"""
    s = a[y0:y1, x0:x1].reshape(-1, 3)
    l = s.mean(1)
    return tuple(int(v) for v in s[l <= np.percentile(l, 3)].mean(0))


for d in LINES:
    x0, x1, top, base = d['box']
    col = ink_colour(x0, x1, int(top), int(base) + 1)
    wipe(x0, x1, top, base, d['tilt'])
    # the size that gives the old words the old width
    probe = ImageFont.truetype(FONT.format(d['w']), 100 * SS)
    w_old = probe.getlength(d['old']) / (100 * SS)
    size = (x1 - x0) / w_old
    font = ImageFont.truetype(FONT.format(d['w']), round(size * SS))
    W = int(font.getlength(d['new'])) + 8 * SS
    H = int(size * 2 * SS)
    lay = Image.new('L', (W, H), 0)
    asc = font.getmetrics()[0]
    by = int(size * 1.2 * SS)                      # baseline in the layer
    ImageDraw.Draw(lay).text((4 * SS, by - asc), d['new'], font=font, fill=255)
    lay = lay.rotate(-d['tilt'], resample=Image.BICUBIC, center=(4 * SS, by))
    # place: the layer's origin (4*SS, by) on (x0, base)
    ox, oy = x0 - 4, base - by / SS
    fx, fy = ox - math.floor(ox), oy - math.floor(oy)
    lay = lay.transform((W, H), Image.AFFINE, (1, 0, -fx * SS, 0, 1, -fy * SS), resample=Image.BILINEAR)
    m = np.asarray(lay.resize((W // SS, H // SS), Image.LANCZOS)).astype(float) / 255
    X, Y = math.floor(ox), math.floor(oy)
    reg = a[Y:Y + m.shape[0], X:X + m.shape[1]]
    reg[:] = reg * (1 - m[..., None]) + np.array(col) * m[..., None]
    print(d['new'], 'size %.2fpx' % size, 'ink', col)

# the background to the hero's: the design's background, a quadratic surface per channel fitted to the margin round the
# scene (the crop's outer 48px, the pixels near the background's colour), then every pixel scaled by it
x0, y0, x1, y1 = CROP
H, W = a.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
band = ((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)) & ~((xx >= x0 + 48) & (xx < x1 - 48) & (yy >= y0 + 48) & (yy < y1 - 48))
band &= np.abs(a - BG).max(2) < 6
u, v = (xx - W / 2) / W, (yy - H / 2) / H
basis = lambda m: np.stack([np.ones(m.sum()), u[m], v[m], u[m] ** 2, v[m] ** 2, u[m] * v[m]], 1)
allm = np.ones((H, W), bool)
bgmap = np.stack([(basis(allm) @ np.linalg.lstsq(basis(band), a[..., c][band], rcond=None)[0]).reshape(H, W) for c in range(3)], 2)
out = np.where(a <= bgmap, a * TO / bgmap, TO + (a - bgmap) * (255 - TO) / (255 - bgmap))
pic = Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8)).crop(CROP)
if os.environ.get('CHECK'):
    pic.save(os.environ['CHECK'])
for w in (491, 737, 982):
    p = pic if w == pic.width else pic.resize((w, round(pic.height * w / pic.width)), Image.LANCZOS)
    p.save(os.path.join(OUT, 'scene-wide-%d.webp' % w), quality=86, method=6)
    print('scene-wide-%d.webp' % w, p.size, os.path.getsize(os.path.join(OUT, 'scene-wide-%d.webp' % w)) // 1024, 'KB')
