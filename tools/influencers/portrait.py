"""The phone version of the creators scene (owner's sketch, November 2026): a tall card, 1036 x 1340. On top the
design's scene, closer (x 418..1281 of the 1774 picture, 1.2 times), without its creators; the five creators set
again along its orbit, each an avatar (cut from the picture, a white ring) with a light name plate under it;
under the scene a nebula of its own (nebula.py: its drawing new, its colours the scene's), flowing out of the scene's
foot. The orbit where a creator used to hide it is drawn in again. One picture per platform:
site/assets/influencers/orbit-{instagram,telegram,youtube}-m.webp. Run:  python3 tools/influencers/portrait.py
(about a minute: the creators' places are filled patch by patch; CHECK=dir also saves PNGs there)."""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import clean, nebula   # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
CX0, CX1, K = 418, 1281, 1.2          # the scene's part shown and its scale
CW, CH = 1036, 1340                   # the card (short enough that the block, its heading over it, fits one phone screen)
SCENE_H = round(887 * K)              # 1064
BLEND = 170                           # the nebula fades in over the scene's last rows
SS = 4
FONT = ImageFont.truetype(os.path.join(HERE, 'raleway-700.ttf'), 32 * SS)
D = 150                               # an avatar's diameter on the card

# the creators on the card: name, avatar centre on the card, where its face is in the picture (centre, radius)
# (along the orbit, apart from each other and from the planet: not in two columns)
CREATORS = [
    ('Pablo', (835, 405), (1067, 356), 33),
    ('Catalyst', (285, 480), (297, 435), 50),
    ('Kingdom', (900, 680), (1353, 521), 32),
    ('Dominguero', (180, 820), (327, 742), 50),
    ('Milionário', (680, 990), (1093, 742), 50),
]
NAMES = {'Milionário': 'O Milionário'}
# YouTube's avatars carry no caption: each shown whole (the others' Pablo and Kingdom are their upper part, closer)
FACES = {'youtube': {'Pablo': ((1069, 375), 50), 'Kingdom': ((1353, 539), 50)}}
SEEDS = {'instagram': 3, 'telegram': 5, 'tiktok': 8, 'youtube': 11}


def to_card(x, y):
    return ((x - CX0) * K, y * K)


def label_box(name, c):
    """the plate under an avatar: its box on the card"""
    text = NAMES.get(name, name)
    bb = FONT.getbbox(text)
    tw = (bb[2] - bb[0]) / SS
    w, h = tw + 26 + 24 + 30, 60   # padding, the arrow, padding
    x0 = c[0] - w / 2
    y0 = c[1] + D / 2 + 12
    return (x0, y0, x0 + w, y0 + h), text


def repair_orbit(img, holes):
    """the orbit where the creators covered it, drawn in again: its line through the filled places only, in the colour
    of the orbit's own brightest pixels, with a glow"""
    a = np.asarray(img, dtype=np.float32)
    pts = clean.orbit_points(60)
    # the orbit's colour: its brightest pixels along the parts nobody covered
    samples = []
    for x, y in pts[::3]:
        xi, yi = int(x), int(y)
        if 3 <= xi < clean.W - 3 and 3 <= yi < clean.H - 3 and not holes[yi, xi]:
            win = a[yi - 3:yi + 4, xi - 3:xi + 4].reshape(-1, 3)
            samples.append(win[win.sum(1).argmax()])
    core = np.median(np.array(samples), 0)
    big = Image.new('L', (clean.W * 2, clean.H * 2), 0)
    ImageDraw.Draw(big).line([(x * 2, y * 2) for x, y in pts], fill=255, width=5, joint='curve')
    line = np.array(big.resize((clean.W, clean.H), Image.LANCZOS), dtype=np.float32) / 255
    glow = clean._blur(line, 3) * 1.6 + clean._blur(line, 9) * 1.2
    g = np.clip(line + glow * .55, 0, 1)
    where = Image.fromarray((holes * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4))
    where = np.array(where, dtype=np.float32)[..., None] / 255
    lay = g[..., None] * where
    out = a + (core[None, None, :] - a).clip(0, None) * lay   # lighten toward the orbit's colour
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def avatar(src, centre, r):
    """a round avatar D across: the picture's circle (centre, radius r) and a white ring, with a soft shadow"""
    x, y = centre
    face = src.crop((x - r, y - r, x + r, y + r)).resize((D * SS, D * SS), Image.LANCZOS)
    m = Image.new('L', (D * SS, D * SS), 0)
    ImageDraw.Draw(m).ellipse((0, 0, D * SS - 1, D * SS - 1), fill=255)
    lay = Image.new('RGBA', (D * SS, D * SS), (0, 0, 0, 0))
    lay.paste(face, (0, 0), m)
    ring = Image.new('L', (D * SS, D * SS), 0)
    d = ImageDraw.Draw(ring)
    d.ellipse((0, 0, D * SS - 1, D * SS - 1), outline=255, width=5 * SS)
    lay.paste(Image.new('RGBA', lay.size, (250, 248, 252, 255)), (0, 0), ring)
    return lay.resize((D, D), Image.LANCZOS)


def plate(text, box):
    """a light pill with the name and the design's arrow"""
    x0, y0, x1, y1 = box
    w, h = round(x1 - x0), round(y1 - y0)
    big = Image.new('RGBA', (w * SS, h * SS), (0, 0, 0, 0))
    m = Image.new('L', big.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), radius=14 * SS, fill=255)
    grad = np.linspace(0, 1, h * SS)[:, None, None]
    top, bot = np.array([255, 255, 255]), np.array([226, 224, 232])
    fill = (top * (1 - grad) + bot * grad) * np.ones((1, w * SS, 1))
    big.paste(Image.fromarray(fill.astype(np.uint8)).convert('RGBA'), (0, 0), m)
    d = ImageDraw.Draw(big)
    d.rounded_rectangle((SS, SS, w * SS - 1 - SS, h * SS - 1 - SS), radius=13 * SS, outline=(255, 255, 255, 200), width=SS)
    bb = FONT.getbbox(text)
    ink = (26, 22, 34, 255)
    tx = 26 * SS - bb[0]
    d.text((tx, (h * SS - (bb[3] - bb[1])) / 2 - bb[1]), text, font=FONT, fill=ink)
    ax = 26 * SS + (bb[2] - bb[0]) + 12 * SS
    s, st = 17 * SS, round(3.2 * SS)
    ay = (h * SS - s) / 2
    d.line([(ax, ay + s), (ax + s, ay)], fill=ink, width=st)
    d.line([(ax + s * .25, ay), (ax + s, ay), (ax + s, ay + s * .75)], fill=ink, width=st, joint='curve')
    return big.resize((w, h), Image.LANCZOS)


def shadow(size, box, radius, blur, alpha):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=alpha)
    return m.filter(ImageFilter.GaussianBlur(blur))


def build(name):
    src = Image.open(os.path.join(HERE, 'creators-src', name + '.webp')).convert('RGB')
    holes = clean.mask_creators()
    scene = clean.clean(src, False)
    scene = repair_orbit(scene, holes)
    part = scene.crop((CX0, 0, CX1, 887)).resize((CW, SCENE_H), Image.LANCZOS)
    card = Image.new('RGB', (CW, CH))
    neb = nebula.render(src, SEEDS[name], CW, CH - SCENE_H + BLEND, (600, 887), CX0 / 1774, CX1 / 1774)
    card.paste(neb, (0, SCENE_H - BLEND))
    t = np.linspace(0, 1, BLEND)
    ramp = (1 - t * t * (3 - 2 * t))   # the scene over the nebula, fading out (smoothstep)
    m = np.ones((SCENE_H, CW), np.float32)
    m[-BLEND:] = ramp[:, None]
    card.paste(part, (0, 0), Image.fromarray((m * 255).astype(np.uint8)))
    # the creators: a soft shadow, the avatar, the plate
    sh = Image.new('L', (CW, CH), 0)
    boxes = []
    for nm, c, fc, fr in CREATORS:
        box, text = label_box(nm, c)
        boxes.append((nm, c, fc, fr, box, text))
        d = ImageDraw.Draw(sh)
        d.ellipse((c[0] - D / 2, c[1] - D / 2 + 8, c[0] + D / 2, c[1] + D / 2 + 8), fill=120)
        d.rounded_rectangle((box[0], box[1] + 8, box[2], box[3] + 8), radius=14, fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(12))
    card.paste(Image.new('RGB', card.size, (8, 4, 12)), (0, 0), sh)
    for nm, c, fc, fr, box, text in boxes:
        fc, fr = FACES.get(name, {}).get(nm, (fc, fr))
        av = avatar(src, fc, fr)
        card.paste(av, (round(c[0] - D / 2), round(c[1] - D / 2)), av)
        pl = plate(text, box)
        card.paste(pl, (round(box[0]), round(box[1])), pl)
    return card, boxes


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name in ('instagram', 'telegram', 'youtube'):   # TikTok's place is YouTube's since November 2026
        card, boxes = build(name)
        if os.environ.get('CHECK'):
            card.save(os.path.join(os.environ['CHECK'], 'm-' + name + '.png'))
        path = os.path.join(OUT, 'orbit-%s-m.webp' % name)
        card.save(path, quality=86, method=6)
        print(os.path.basename(path), card.size, os.path.getsize(path) // 1024, 'KB')
    # where the plates are (for the page's light across them and the orbit's mask), in % of the card
    for nm, c, fc, fr, box, text in boxes:
        x0, y0, x1, y1 = box
        print('%-11s avatar %.2f%% %.2f%% r %.2f%%  plate left %.2f%% top %.2f%% width %.2f%% height %.2f%%' % (
            nm, c[0] / CW * 100, c[1] / CH * 100, D / 2 / CW * 100, x0 / CW * 100, y0 / CH * 100, (x1 - x0) / CW * 100, (y1 - y0) / CH * 100))
    import json
    json.dump({'CX0': CX0, 'K': K, 'CW': CW, 'CH': CH, 'D': D, 'creators': [[nm, list(c)] for nm, c, *_ in boxes],
               'plates': [[nm] + [round(v, 1) for v in box] for nm, c, fc, fr, box, text in boxes]},
              open(os.path.join(HERE, 'portrait.json'), 'w'), indent=1)
