"""Run: python3 tools/who-metal/make.py  (numpy + Pillow; writes site/assets/programs/brushed.webp)
The brushed-metal grain of the Who it's for card on /programs/ (the owner's design: design.webp, November 2026): fine
vertical streaks, as a tile that repeats without seams (the noise is filtered in the frequency domain, so it wraps
round). Light streaks are white, dark ones a cool grey, each with a small alpha: over the card's light steel they move
its brightness by about one level either way, as on the design (measured there: 1-2 levels, the card's shading included). partner.css (.pf-dr)
lays it over the steel gradient."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'programs', 'brushed.webp')
W, H = 320, 160
rng = np.random.default_rng(11)
n = rng.normal(0, 1, (H, W))
fy = np.fft.fftfreq(H)[:, None]; fx = np.fft.fftfreq(W)[None, :]
SX, SY = 0.5, 70.0                                    # streaks: a hair wide, long down the card
g = np.exp(-2 * (np.pi ** 2) * ((fx * SX) ** 2 + (fy * SY) ** 2))
s = np.real(np.fft.ifft2(np.fft.fft2(n) * g))
s /= s.std()
LEVELS = 1.25                                         # one standard deviation, in brightness levels over the steel
light = np.clip(s, 0, None) * LEVELS / (255 - 232)    # white over ~232
dark = np.clip(-s, 0, None) * LEVELS / (232 - 70)     # #464a52 over ~232
a = np.where(s > 0, light, dark).clip(0, 1)
rgb = np.where(s[..., None] > 0, np.array([255, 255, 255]), np.array([70, 74, 82])).astype(np.uint8)
img = Image.fromarray(np.dstack([rgb, (a * 255).round().astype(np.uint8)]), 'RGBA')
img.save(OUT, quality=88, method=6, alpha_quality=70)
print(img.size, os.path.getsize(OUT), 'bytes')
