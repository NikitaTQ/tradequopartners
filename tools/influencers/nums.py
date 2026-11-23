"""The /for-influencers/ "Three numbers" block (owner's design "Cut From The Sky", variant 6c Titanium): its pictures.
The figures 87%, infinity and 365 are cut from three nebula photos (the design's own, numbers-src/tex-*.jpg,
1600 x 800): on the page each is the background of its figure, clipped to the letters (influencers.css .inf-nums).
Writes site/assets/influencers/nums-{87,inf,365}-{w}.webp — a large file for desktops, a small one for phones
(each wide enough for its figure on a 2x screen) — and nums-mark.webp, the white TradeQuo mark in the card's corner.
Run:  python3 tools/influencers/nums.py   (not "numbers.py": that name would hide Python's own numbers module)"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'numbers-src')
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
SIZES = {'87': (1600, 760), 'inf': (720, 600), '365': (960, 640)}   # desktop, phone (px wide)

for key, widths in SIZES.items():
    im = Image.open(os.path.join(SRC, 'tex-%s.jpg' % key)).convert('RGB')
    for w in widths:
        p = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        fn = os.path.join(OUT, 'nums-%s-%d.webp' % (key, w))
        p.save(fn, quality=80, method=6)
        print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
m = Image.open(os.path.join(SRC, 'mark.png')).convert('RGBA')
m = m.crop(m.getbbox())
m = m.resize((round(m.width * 84 / m.height), 84), Image.LANCZOS)   # 28px tall at 3x
fn = os.path.join(OUT, 'nums-mark.webp')
m.save(fn, quality=90, method=6)
print(os.path.basename(fn), m.size, os.path.getsize(fn), 'bytes')
