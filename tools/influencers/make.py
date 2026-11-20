"""The /for-influencers/ hero scene, from the owner's design (hero-scene-design.png, 589 x 567, on the hero's own
background #f3f2f7): the picture itself (glass, glints, wires, tilt and all) at 2x, with every text and both TradeQuo
wordmarks drawn again at full resolution, so they are sharp where an enlarged 589px picture would be soft:
  - each text is found in the design (its ink inside a box: extent and baseline), wiped (each column filled from the
    pane just above and below it) and set again in the design's face (Montserrat, OFL; the .ttf files here are only
    for this script) at the size that gives the old width, on the old baseline, at its card's tilt;
  - the wordmarks are the site's own logo file (assets/logo-wordmark-light.png), at the old width and tilt;
  - two lines carried the word "trade" (the site never uses it) and get new words:
      Instagram caption  "The platform I trade on. Link in bio."  ->  "The platform I use. Link in bio."
      Telegram post      "Trade with the tools I use every day."  ->  "The tools I use every day."
The glass itself stays the design's (soft by nature); a larger export of the design, put in place of
hero-scene-design.png, sharpens it too (the boxes below are in the design's px: scale them with it).
Writes site/assets/influencers/scene-{507,760,1014}.webp (1014 x 1040 = 2x; 507 = the design's own size).
Run:  python3 tools/influencers/make.py   (CHECK=/path/file.png also saves the full picture for a look)"""
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(ROOT, 'site', 'assets', 'influencers')
K = 2                     # work at 2x the design
SS = 4                    # text is drawn 4x larger again and scaled down (smooth edges)
TILT = {'ig': -2.0, 'tg': 1.9, 'c': 0.4}   # each card's turn in the design (degrees, + = down to the right)

src = Image.open(os.path.join(HERE, 'hero-scene-design.png')).convert('RGB')
srcL = src.convert('L')
im = src.resize((src.width * K, src.height * K), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
px = im.load()

# what to set again: card, box around the old ink (design px), ink ('d' dark on light, 'l' light on dark, 'r' red, 'b' blue),
# font weight (or 'logo'), colour, the old words (their width gives the size), the new ones (None = the same) and, where
# the box takes in more than the text (an icon, a glow, the line below), its real extent / band round the baseline
ITEMS = [
    ('ig', (84, 56, 160, 78), 'd', 600, (18, 18, 20), 'yourchannel', None, dict(top=-8.8, bot=2.6)),
    ('ig', (64, 256, 120, 274), 'd', 700, (30, 30, 34), 'yourchannel', None, dict(top=-6.8, bot=2.4)),
    ('ig', (119, 254, 240, 272), 'd', 500, (38, 38, 44), 'The platform I trade on. Link in bio.', 'The platform I use. Link in bio.', dict(top=-6.6, bot=2.4)),
    ('ig', (133, 210, 183, 221), 'r', 700, (226, 18, 28), 'YOUR LINK', None, dict(x0=135, x1=182, top=-7.4, bot=.9)),
    ('ig', (86, 144, 216, 170), 'l', 'logo', None, None, None),
    ('tg', (305, 76, 388, 98), 'd', 600, (18, 18, 20), 'Your Channel', None),
    ('tg', (285, 108, 358, 126), 'b', 700, (28, 160, 236), 'Your Channel', None),
    ('tg', (287, 124, 446, 142), 'd', 500, (28, 28, 32), 'Trade with the tools I use every day.', 'The tools I use every day.'),
    ('tg', (320, 153, 432, 178), 'l', 'logo', None, None, None),
    ('tg', (321, 214, 417, 233), 'l', 600, (246, 247, 249), 'Open TradeQuo', None),
    ('c', (160, 320, 314, 347), 'l', 600, (248, 248, 248), 'Your commissions', None, dict(top=-10.5, bot=1.2)),
    ('c', (160, 344, 294, 360), 'l', 500, (150, 150, 152), 'Recent account activity', None, dict(top=-7, bot=2.4)),
    ('c', (160, 367, 282, 384), 'l', 700, (240, 240, 240), 'Commission credited', None, dict(top=-7.6, bot=1)),
    ('c', (179, 381, 308, 395), 'l', 500, (200, 200, 202), 'From your Instagram referrals', None, dict(top=-6, bot=2.2)),
    ('c', (388, 364, 416, 379), 'l', 500, (190, 190, 190), 'now', None, dict(top=-4.6, bot=1)),
    ('c', (160, 408, 282, 425), 'l', 700, (240, 240, 240), 'Commission credited', None, dict(top=-7.6, bot=1)),
    ('c', (179, 421, 304, 436), 'l', 500, (196, 196, 198), 'From your Telegram referrals', None, dict(top=-6, bot=2.2)),
    ('c', (380, 405, 418, 421), 'l', 500, (182, 182, 184), '2m ago', None, dict(top=-6, bot=2.2)),
]


def find(box, mode, tilt):
    """the old ink in the box: x extent, baseline at its start (median lower edge, the tilt taken out), top and bottom"""
    x0, y0, x1, y1 = box
    vals = sorted(srcL.getpixel((x, y)) for x in range(x0, x1) for y in range(y0, y1))
    bg = vals[len(vals) // 2] if mode != 'l' else vals[len(vals) // 4]

    def is_ink(x, y):
        r, g, b = src.getpixel((x, y))
        l = srcL.getpixel((x, y))
        return {'d': l < bg - 55, 'l': l > bg + 60, 'r': r > 150 and g < 120 and b < 130, 'b': b > 150 and r < 130}[mode]
    t = math.tan(math.radians(tilt))
    pts = [(x, y - (x - x0) * t) for x in range(x0, x1) for y in range(y0, y1) if is_ink(x, y)]
    bottoms = {}
    for x, y in pts:
        bottoms[x] = max(bottoms.get(x, -1e9), y)
    b = sorted(bottoms.values())
    base = b[len(b) // 2] + .5
    xs = [p[0] for p in pts]
    return dict(x0=min(xs), x1=max(xs) + 1, base=base, top=min(p[1] for p in pts) - base, bot=max(p[1] for p in pts) + 1 - base)


def wipe(f, tilt, pad=1.2):
    """fill the old ink's band, column by column, blending the colour just above it into the colour just below"""
    t = math.tan(math.radians(tilt))
    for X in range(int((f['x0'] - pad) * K), int((f['x1'] + pad) * K) + 1):
        x = X / K
        b = (f['base'] + (x - f['x0']) * t) * K
        top, bot = int(b + (f['top'] - pad) * K), int(b + (f['bot'] + pad) * K) + 1
        a, c = px[X, top - 1], px[X, bot + 1]
        for Y in range(top, bot + 1):
            k = (Y - top) / max(1, bot - top)
            px[X, Y] = tuple(round(a[i] * (1 - k) + c[i] * k) for i in range(3))


def turned(layer, tilt, ax, ay):
    """the layer turned by the tilt about (ax, ay); returns it and where (ax, ay) went"""
    ang = math.radians(-tilt)
    w, h = layer.size
    corners = [(0, 0), (w, 0), (0, h), (w, h)]
    rot = [((x - ax) * math.cos(ang) + (y - ay) * math.sin(ang), -(x - ax) * math.sin(ang) + (y - ay) * math.cos(ang)) for x, y in corners]
    out = layer.rotate(-tilt, resample=Image.BICUBIC, expand=True, center=(ax, ay))
    return out, (-min(p[0] for p in rot), -min(p[1] for p in rot))


def write(f, tilt, weight, colour, old, new):
    path = os.path.join(HERE, 'mont-%d.ttf' % weight)
    width = (f['x1'] - f['x0']) * K * SS
    size = 8
    while True:
        bb = ImageFont.truetype(path, size + 1).getbbox(old)
        if bb[2] - bb[0] > width:
            break
        size += 1
    font = ImageFont.truetype(path, size)
    text = new or old
    asc, desc = font.getmetrics()
    lb = font.getbbox(text)[0]
    w = int(font.getlength(text)) + 16
    layer = Image.new('L', (w, asc + desc + 16), 0)
    ImageDraw.Draw(layer).text((8 - lb, 8), text, font=font, fill=255)
    layer, (ax, ay) = turned(layer, tilt, 8, 8 + asc)
    small = layer.resize((max(1, round(layer.width / SS)), max(1, round(layer.height / SS))), Image.LANCZOS)
    x, y = f['x0'] * K - ax / SS, f['base'] * K - ay / SS
    im.paste(Image.new('RGB', small.size, colour), (round(x), round(y)), small)


LOGO = Image.open(os.path.join(ROOT, 'site', 'assets', 'logo-wordmark-light.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())


def logo(f, tilt):
    """the site's wordmark at the old one's width, its middle on the old one's middle, turned with the card"""
    w = (f['x1'] - f['x0']) * K * SS
    lg = LOGO.resize((round(w), round(LOGO.height * w / LOGO.width)), Image.LANCZOS)
    pad = 8 * SS
    layer = Image.new('RGBA', (lg.width + 2 * pad, lg.height + 2 * pad), (0, 0, 0, 0))
    layer.alpha_composite(lg, (pad, pad))
    layer, (ax, ay) = turned(layer, tilt, layer.width / 2, layer.height / 2)
    layer = layer.resize((round(layer.width / SS), round(layer.height / SS)), Image.LANCZOS)
    t = math.tan(math.radians(tilt))
    mx = (f['x0'] + f['x1']) / 2
    my = f['base'] + (f['top'] + f['bot']) / 2 + (mx - f['x0']) * t
    im.paste(layer, (round(mx * K - ax / SS), round(my * K - ay / SS)), layer)


found = []
for it in ITEMS:
    f = find(it[1], it[2], TILT[it[0]])
    if len(it) > 7:
        f.update(it[7])
    found.append((it, f))
for it, f in found:
    wipe(f, TILT[it[0]], pad=1.6 if it[3] == 'logo' else 1.2)
for it, f in found:
    if it[3] == 'logo':
        logo(f, TILT[it[0]])
    else:
        write(f, TILT[it[0]], it[3], it[4], it[5], it[6])

# trimmed to the scene and its glow plus a 20px margin (the rest is the plain background the hero has anyway); the
# page fades that margin out (influencers.css .inf-hero__img), so no edge of the picture ever shows
im = im.crop((20, 22, 1034, 1062))
os.makedirs(OUT, exist_ok=True)
if os.environ.get('CHECK'):
    im.save(os.environ['CHECK'])
for w in (507, 760, 1014):
    out = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    out.save(os.path.join(OUT, 'scene-%d.webp' % w), quality=92, method=6)
    print('scene-%d.webp' % w, out.size, os.path.getsize(os.path.join(OUT, 'scene-%d.webp' % w)) // 1024, 'KB')
