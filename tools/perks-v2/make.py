"""Run: python3 tools/perks-v2/make.py  (numpy + Pillow)
The pictures of the six perk cards of the owner's design (design.webp, November 2026: Revenue share "Up to 87%",
Unlimited levels "∞", Daily payouts "calendar", PartnerShield "shield", Premium access "TradingView PREMIUM",
Incentive trips "suitcase"), cut out of the design and stood upright: each card of the fan is turned by its angle
(-21, -12.6, -4.2, 4.2, 12.6, 21°), so its picture is turned back by it (the TradingView logo a little more: in the
design it leans on its own). Two versions:
  site/assets/perks2/<key>.webp     the home page's fan (the "Everything you need to grow" block): the picture on
                                    black (the card's glass taken out), laid on the dark card with mix-blend-mode:
                                    lighten; the revenue one without "Up to" (the page writes it, in each language);
  the film (site/embeds/tradequo-film.html, -mobile.html): JPEG data URIs in its picture map, keys
                                    film/perk-<key>.png, the picture on the card's own glass (the film fades its edges).
Everything outside the picture's box is the card's glass (the neighbouring cards and the captions are left out)."""
import base64
import io
import json
import os
import re
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(ROOT, 'site', 'assets', 'perks2')
os.makedirs(OUT, exist_ok=True)
R = 170                                   # a 340px square round each picture's centre in the design
# key, the card's angle, the picture's centre in the design, its own extra lean, its box in the upright square
# (x0, y0, x1, y1), and for the page: the top of the box (the revenue picture: below "Up to")
ICONS = [
    ('revenue', -21.0, 352, 512, 0.0, (64, 86, 276, 240), 134),
    ('levels', -12.6, 605, 452, 0.0, (60, 104, 280, 228), None),
    ('payouts', -4.2, 852, 413, 0.0, (72, 86, 270, 252), None),
    ('shield', 4.2, 1126, 432, 0.0, (40, 62, 290, 280), None),
    ('premium', 12.6, 1392, 462, -7.7, (58, 66, 280, 268), None),
    ('trips', 21.0, 1642, 517, 0.0, (96, 56, 252, 272), None),
]
design = Image.open(os.path.join(HERE, 'design.webp')).convert('RGB')


def soft_box(h, w, box, feather=7.0):
    """1 inside the box, easing to 0 over `feather` px outside it"""
    x0, y0, x1, y1 = box
    yy, xx = np.mgrid[0:h, 0:w]
    dx = np.maximum(np.maximum(x0 - xx, xx - x1), 0)
    dy = np.maximum(np.maximum(y0 - yy, yy - y1), 0)
    d = np.sqrt(dx * dx + dy * dy)
    return np.clip(1 - d / feather, 0, 1)


film = {}
for key, F, cx, cy, lean, box, top in ICONS:
    sq = design.crop((cx - R, cy - R, cx + R, cy + R)).rotate(F + lean, resample=Image.BICUBIC, fillcolor=(18, 18, 20))
    a = np.asarray(sq).astype(np.float64)
    x0, y0, x1, y1 = box
    ring = np.ones(a.shape[:2], bool); ring[y0:y1, x0:x1] = False
    dark = ring & (a.mean(2) < 40)
    bg = np.median(a[dark], axis=0)                     # the card's glass round the picture
    # the film: the picture on the glass; outside its box, the glass
    m = soft_box(*a.shape[:2], box)[..., None]
    fa = a * m + bg * (1 - m)
    side = max(x1 - x0, y1 - y0) + 36
    cxb, cyb = (x0 + x1) // 2, (y0 + y1) // 2
    if key == 'revenue':   # the film sets the picture at the card's foot, where the next card covers the "%": a larger square, the words in its upper middle
        side = int(side * 1.3); cyb += side // 7
    crop = (cxb - side // 2, cyb - side // 2, cxb - side // 2 + side, cyb - side // 2 + side)
    fa = np.pad(fa, ((80, 80), (80, 80), (0, 0)), mode='constant')
    fa[:80, :] = bg; fa[-80:, :] = bg; fa[:, :80] = bg; fa[:, -80:] = bg
    crop = tuple(c + 80 for c in crop)
    fim = Image.fromarray(np.clip(fa, 0, 255).round().astype(np.uint8)).crop(crop)
    buf = io.BytesIO(); fim.save(buf, 'JPEG', quality=90)
    film['film/perk-%s.png' % key] = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    # the page: the picture on black (the glass level taken away), its box only
    sbox = (x0, top if top is not None else y0, x1, y1)
    ms = soft_box(*a.shape[:2], sbox, 5.0)[..., None]
    lift = np.clip((a - bg) * 255 / (255 - bg), 0, 255) * ms
    scx, scy = (sbox[0] + sbox[2]) // 2, (sbox[1] + sbox[3]) // 2
    sside = max(sbox[2] - sbox[0], sbox[3] - sbox[1]) + 24
    scrop = (scx - sside // 2, scy - sside // 2, scx - sside // 2 + sside, scy - sside // 2 + sside)
    sim = Image.fromarray(lift.round().astype(np.uint8)).crop(scrop)
    path = os.path.join(OUT, key + '.webp')
    sim.save(path, quality=88, method=6)
    print('%-8s page %s %5d B   film %s %5d B   glass %s' % (key, sim.size, os.path.getsize(path), fim.size, len(buf.getvalue()), bg.round().astype(int).tolist()))

# the film's picture map: the six new pictures in place of the old six
OLD = ['tv', 'analysis', 'creatives', 'academy', 'brokerage', 'trips']
for name in ('tradequo-film.html', 'tradequo-film-mobile.html'):
    p = os.path.join(ROOT, 'site', 'embeds', name)
    s = open(p, encoding='utf-8').read()
    for k in OLD:
        s, n = re.subn(r'"film/perk-%s\.png":"data:image/[a-z]+;base64,[^"]+",?' % k, '', s)
    # put the new ones right before film/bill.png
    add = ''.join('%s:%s,' % (json.dumps(k), json.dumps(v)) for k, v in film.items())
    i = s.index('"film/bill.png"')
    s = s[:i] + add + s[i:]
    open(p, 'w', encoding='utf-8').write(s)
    print(name, 'pictures:', re.findall(r'"(film/perk-[a-z]+\.png)"', s))
