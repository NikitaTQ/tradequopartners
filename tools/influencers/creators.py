"""The /for-influencers/ "creators on Instagram / Telegram / TikTok" scene (owner's design, Creator Platforms Scene):
three pictures, 1774 x 887, one per platform (creators-src/*.webp, as the design exported them), made ready for the site:
  - the word the site never uses is taken out of three creators' names on their plates: each plate's name and arrow are
    wiped (every row filled from the plate's own clean edges, left to right) and set again without it, in the design's
    face (Raleway SemiBold, OFL; the .ttf files here are only for this script), the design's arrow drawn again after
    it, the pair centred on the plate;
  - two avatars carry the word as a caption over the photo: the circle is filled again with its upper part (the face),
    a little closer, so the caption falls outside it;
  - the picture's rounded corners (white in the export) are filled with the scene, so the block can run edge to edge.
Writes site/assets/influencers/orbit-{instagram,telegram,tiktok}-{1100,1774}.webp.
Run:  python3 tools/influencers/creators.py"""
import math, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
SS = 4
FONT = ImageFont.truetype(os.path.join(HERE, 'raleway-600.ttf'), round(26.6 * SS))

# plates whose name changes: plate box, the old ink (name x0..x1, arrow x0..x1, rows), the new name
PLATES = [
    dict(box=(365, 410, 632, 457), name=(382, 578), arrow=(591, 613), rows=(420, 450), new='Catalyst'),
    dict(box=(1141, 354, 1381, 400), name=(1159, 1326), arrow=(1339, 1362), rows=(364, 394), new='Pablo'),
    dict(box=(1424, 516, 1699, 562), name=(1441, 1647), arrow=(1658, 1681), rows=(526, 556), new='Kingdom'),
]
# avatars whose caption goes: the circle (centre, radius of the photo inside its ring) and the part of it to show
AVATARS = [
    dict(c=(1069, 375), r=50, src=(1067, 356), sr=33),
    dict(c=(1353, 539), r=50, src=(1353, 521), sr=32),
]


def plate(im, p):
    px = im.load()
    x0, y0, x1, y1 = p['box']
    ry0, ry1 = p['rows']
    # the arrow's place and size (its ink), to draw it again after the new name
    dark = lambda x, y: sum(px[x, y]) < 3 * 120
    apts = [(x, y) for x in range(*p['arrow']) for y in range(ry0, ry1) if dark(x, y)]
    ax0, ax1 = min(q[0] for q in apts), max(q[0] for q in apts) + 1
    ay0, ay1 = min(q[1] for q in apts), max(q[1] for q in apts) + 1
    # the ink's colour: the darkest pixels of the old name
    ink = sorted((px[x, y] for x in range(p['name'][0], p['name'][1]) for y in range(ry0, ry1)), key=sum)[:60]
    colour = tuple(sum(c[i] for c in ink) // len(ink) for i in range(3))
    top = min(y for y in range(ry0, ry1) for x in range(p['name'][0], p['name'][1]) if sum(px[x, y]) < sum(colour) + 120)
    # wipe: each row from the plate's clean strips left of the name and right of the arrow
    lx, rx = (x0 + 6, p['name'][0] - 3), (p['arrow'][1] + 3, x1 - 6)
    for y in range(ry0, ry1):
        L = [px[x, y] for x in range(*lx)]
        R = [px[x, y] for x in range(*rx)]
        a = tuple(sum(c[i] for c in L) / len(L) for i in range(3))
        b = tuple(sum(c[i] for c in R) / len(R) for i in range(3))
        for x in range(lx[1], rx[0]):
            k = (x - lx[1]) / max(1, rx[0] - lx[1])
            px[x, y] = tuple(round(a[i] * (1 - k) + b[i] * k) for i in range(3))
    # the new name and the old arrow, centred on the plate, the name's top where the old one's was
    bb = FONT.getbbox(p['new'])
    tw = (bb[2] - bb[0]) / SS
    gap = ax0 - p['name'][1]
    total = tw + gap + (ax1 - ax0)
    sx = (x0 + x1) / 2 - total / 2
    layer = Image.new('L', (bb[2] - bb[0] + 16 * SS, bb[3] - bb[1] + 16 * SS), 0)
    ImageDraw.Draw(layer).text((8 * SS - bb[0], 8 * SS - bb[1]), p['new'], font=FONT, fill=255)
    small = layer.resize((round(layer.width / SS), round(layer.height / SS)), Image.LANCZOS)
    im.paste(Image.new('RGB', small.size, colour), (round(sx - 8), round(top - 8)), small)
    # the arrow (the design's: a diagonal with a corner at its head, strokes ~2.3px), drawn at 4x and brought down
    aw, ah = ax1 - ax0, ay1 - ay0
    m = 3 * SS
    al = Image.new('L', (aw * SS + 2 * m, ah * SS + 2 * m), 0)
    d = ImageDraw.Draw(al)
    st = round(2.3 * SS)
    tip = (m + aw * SS - st / 2, m + st / 2)
    d.line([(m + st / 2, m + ah * SS - st / 2), tip], fill=255, width=st)
    d.line([(m + aw * SS * .2, m + st / 2), tip, (m + aw * SS - st / 2, m + ah * SS * .9)], fill=255, width=st, joint='curve')
    al = al.resize((round(al.width / SS), round(al.height / SS)), Image.LANCZOS)
    im.paste(Image.new('RGB', al.size, colour), (round(sx + tw + gap - 3), ay0 - 3), al)


def avatar(im, a):
    cx, cy = a['c']
    sx, sy = a['src']
    r, sr = a['r'], a['sr']
    part = im.crop((sx - sr, sy - sr, sx + sr, sy + sr)).resize((2 * r * SS, 2 * r * SS), Image.LANCZOS)
    mask = Image.new('L', part.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, part.width - 1, part.height - 1), fill=255)
    part = part.resize((2 * r, 2 * r), Image.LANCZOS)
    mask = mask.resize((2 * r, 2 * r), Image.LANCZOS)
    im.paste(part, (cx - r, cy - r), mask)


def corners(im, rad=44):
    """the export's rounded corners are white: each corner pixel outside the curve takes the scene's pixel on the curve"""
    px = im.load()
    w, h = im.size
    for (ox, oy, dx, dy) in ((0, 0, 1, 1), (w - 1, 0, -1, 1), (0, h - 1, 1, -1), (w - 1, h - 1, -1, -1)):
        ccx, ccy = ox + dx * rad, oy + dy * rad
        for i in range(rad):
            for j in range(rad):
                x, y = ox + dx * i, oy + dy * j
                d = math.hypot(x - ccx, y - ccy)
                if d > rad - 6:
                    k = (rad - 8) / d
                    px[x, y] = px[round(ccx + (x - ccx) * k), round(ccy + (y - ccy) * k)]


os.makedirs(OUT, exist_ok=True)
for name in ('instagram', 'telegram', 'tiktok'):
    im = Image.open(os.path.join(HERE, 'creators-src', name + '.webp')).convert('RGB')
    for a in AVATARS:
        avatar(im, a)
    for p in PLATES:
        plate(im, p)
    corners(im)
    if os.environ.get('CHECK'):
        im.save(os.path.join(os.environ['CHECK'], name + '.png'))
    for w in (1100, 1774):
        out = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        path = os.path.join(OUT, 'orbit-%s-%d.webp' % (name, w))
        out.save(path, quality=84, method=6)
        print(os.path.basename(path), out.size, os.path.getsize(path) // 1024, 'KB')
