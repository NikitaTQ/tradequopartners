"""Run: python3 tools/ib-hero/unglow.py  (numpy + Pillow; writes site/assets/ib/hero-vs-m.webp)
The IB Tools hero's phone picture (the glass "Our IB program" card beside the grey "Other programs" plate) without the
pink glow round the card (November 2026, asked for: on phones it read as red smudges at the card's foot and side).
Every light pinkish pixel (red above green and blue) is made neutral at its own brightness, so the glow becomes a soft
grey shadow and the card keeps its edge; the red icons (infinity, pie, calendar dots, sparkle, the logo's dot) and a
6px margin round them are left alone. It reads compose.py's phone picture (hero-vs-m.png, lossless): run it after
compose.py. The picture with the glow, as it was on the site, is hero-vs-m-glow.webp here: to go back, copy it over
site/assets/ib/hero-vs-m.webp (or just do not run this) and run python3 tools/build-i18n.py."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'ib', 'hero-vs-m.webp')
a = np.asarray(Image.open(os.path.join(HERE, 'hero-vs-m.png')).convert('RGB')).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
red = r - np.maximum(g, b)
icons = red > 60
for _ in range(6):
    icons = icons | np.roll(icons, 1, 0) | np.roll(icons, -1, 0) | np.roll(icons, 1, 1) | np.roll(icons, -1, 1)
glow = (red > 0.5) & (np.minimum(g, b) > 140) & ~icons
lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
a[glow] = lum[glow][:, None]
Image.fromarray(np.clip(a, 0, 255).round().astype(np.uint8)).save(OUT, quality=90, method=6)
print('ok', glow.sum(), 'px made neutral')
