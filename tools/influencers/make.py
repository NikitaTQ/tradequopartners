"""The /for-influencers/ hero scene, from the owner's design (hero-scene-design.png, 589 x 567, on the hero's own
background #f3f2f7): the picture itself, glass, glints, wires and all, at 2x, with the two lines that carried the word
"trade" written again (the site never uses it):
  Instagram caption  "The platform I trade on. Link in bio."  ->  "The platform I use. Link in bio."
  Telegram post      "Trade with the tools I use every day."  ->  "The tools I use every day."
Each line is wiped (every column filled from the pane just above and below it) and set again in the design's face
(Montserrat, OFL; the .ttf files here are only for this script), at the line's own size and tilt.
Writes site/assets/influencers/scene-{507,760,1014}.webp (1014 x 1040 = 2x; 507 = the design's own size).   Run:  python3 tools/influencers/make.py"""
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
K = 2                     # work at 2x the design
SS = 4                    # text is drawn 4x larger again and scaled down (smooth edges)

src = Image.open(os.path.join(HERE, 'hero-scene-design.png')).convert('RGB')
im = src.resize((src.width * K, src.height * K), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
px = im.load()

# Each line, in design px: where its old text starts and ends (x), its baseline at the start, its tilt (degrees, + = down
# to the right; wbase: the old line's baseline where it differs), the font, the old words (to find the size that gives the old width) and the new ones.
LINES = [
    dict(x0=120.5, x1=237.5, base=271.0, wbase=268.0, tilt=-2.0, font='mont-500.ttf', color=(38, 38, 44),
         old='The platform I trade on. Link in bio.', new='The platform I use. Link in bio.', up=7.5, down=5.5),
    dict(x0=290.6, x1=441.5, base=135.4, tilt=1.9, font='mont-500.ttf', color=(28, 28, 32),
         old='Trade with the tools I use every day.', new='The tools I use every day.', up=8.6, down=3.0),
]


def wipe(L):
    """fill the line's band, column by column, blending the pane's colour just above it into the colour just below"""
    t = math.tan(math.radians(L['tilt']))
    for X in range(int((L['x0'] - 2) * K), int((L['x1'] + 2.5) * K)):
        x = X / K
        b = (L.get('wbase', L['base']) + (x - L['x0']) * t) * K
        top, bot = int(b - L['up'] * K) - 1, int(b + L['down'] * K) + 2
        a, c = px[X, top - 1], px[X, bot + 1]
        for Y in range(top, bot + 1):
            f = (Y - top) / max(1, bot - top)
            px[X, Y] = tuple(round(a[i] * (1 - f) + c[i] * f) for i in range(3))


def write(L):
    """set the new words at the old words' size (the size at which the old line had its width), on the old baseline"""
    path = os.path.join(HERE, L['font'])
    width = (L['x1'] - L['x0']) * K * SS
    size = 10
    while ImageFont.truetype(path, size + 1).getlength(L['old']) <= width:
        size += 1
    font = ImageFont.truetype(path, size)
    asc, desc = font.getmetrics()
    w = int(font.getlength(L['new'])) + 8
    layer = Image.new('L', (w, asc + desc + 8), 0)
    ImageDraw.Draw(layer).text((4, 4), L['new'], font=font, fill=255)
    layer = layer.rotate(-L['tilt'], resample=Image.BICUBIC, expand=True, center=(4, 4 + asc))
    # where the baseline's start landed after the turn (rotate with expand shifts the picture)
    ang = math.radians(-L['tilt'])
    cx, cy = 4, 4 + asc
    corners = [(0, 0), (w, 0), (0, asc + desc + 8), (w, asc + desc + 8)]
    rot = [((x - cx) * math.cos(ang) + (y - cy) * math.sin(ang), -(x - cx) * math.sin(ang) + (y - cy) * math.cos(ang)) for x, y in corners]
    minx, miny = min(p[0] for p in rot), min(p[1] for p in rot)
    small = layer.resize((max(1, layer.width // SS), max(1, layer.height // SS)), Image.LANCZOS)
    ox = L['x0'] * K + minx / SS
    oy = L['base'] * K + miny / SS
    ink = Image.new('RGB', small.size, L['color'])
    im.paste(ink, (round(ox), round(oy)), small)


for L in LINES:
    wipe(L)
for L in LINES:
    write(L)

# trimmed to the scene and its glow plus a 20px margin (the rest is the plain background the hero has anyway); the
# page fades that margin out (influencers.css .inf-hero__img), so no edge of the picture ever shows
im = im.crop((20, 22, 1034, 1062))
os.makedirs(OUT, exist_ok=True)
for w in (507, 760, 1014):
    out = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    out.save(os.path.join(OUT, 'scene-%d.webp' % w), quality=90, method=6)
    print('scene-%d.webp' % w, out.size, os.path.getsize(os.path.join(OUT, 'scene-%d.webp' % w)) // 1024, 'KB')
