"""Run: python3 tools/ib-hero/glow.py  (numpy + Pillow; writes site/assets/ib/hero-vs-m.webp)  - after compose.py
The IB Tools hero's phone picture (the glass "Our IB program" card in front of the grey "Other programs" plate) with an
even red glow round the card (November 2026). The design's own glow was uneven: cut off by a straight line along the
card's left edge, so at its lower and upper left corners it ended in square patches (a smudge on phones). Here:
- the card itself stays as it is (its rim keeps the design's light pink tint);
- round it, the old glow's pink is taken out (green and blue brought up to red: neutral pixels, the plate and its
  shadow, are untouched);
- a new glow is laid on all round the card: the card is a rounded rectangle (outer rim x 255-846, y 52-964, corner
  radius 64, measured on the picture), the glow's strength falls off smoothly with the distance from it
  (A * exp(-(d / SIGMA)^2), the brand red), the same on every side and round the corners; the VS badge stays black.
The picture with the design's glow is hero-vs-m-glow.webp here: to go back, copy it over site/assets/ib/hero-vs-m.webp
and run python3 tools/build-i18n.py."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'ib', 'hero-vs-m.webp')
X0, Y0, X1, Y1, RAD = 255.0, 52.0, 846.0, 964.0, 64.0     # the card's outer rim
A, SIGMA = 0.15, 24.0                                    # the glow: strength at the rim, fall-off (px)
RED = np.array([231.0, 19.0, 27.0])

src = np.asarray(Image.open(os.path.join(HERE, 'hero-vs-m.png')).convert('RGB')).astype(np.float64)
H, W, _ = src.shape
yy, xx = np.mgrid[0:H, 0:W] + 0.5
cx, cy, hx, hy = (X0 + X1) / 2, (Y0 + Y1) / 2, (X1 - X0) / 2 - RAD, (Y1 - Y0) / 2 - RAD
qx, qy = np.abs(xx - cx) - hx, np.abs(yy - cy) - hy
d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - RAD   # signed distance, <0 inside

out = src.copy()
r = out[..., 0]
out[..., 1] = np.maximum(out[..., 1], np.minimum(r, 255))   # outside: no pink left (neutral pixels unchanged)
out[..., 2] = np.maximum(out[..., 2], np.minimum(r, 255))
dark = src.mean(-1) < 120                                    # the VS badge (and its edge): no glow over it
alpha = A * np.exp(-(np.maximum(d, 0) / SIGMA) ** 2)
alpha[dark] = 0
out = out * (1 - alpha[..., None]) + RED * alpha[..., None]
inside = np.clip(0.5 - d, 0, 1)[..., None]                   # the card: as it was (1.5px soft edge)
out = src * inside + out * (1 - inside)
Image.fromarray(np.clip(out, 0, 255).round().astype(np.uint8)).save(OUT, quality=90, method=6)
print('ok', OUT)
