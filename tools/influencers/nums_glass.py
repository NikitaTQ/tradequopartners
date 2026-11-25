"""The /for-influencers/ "Three numbers" block, light glass version (owner's design, November 2026:
numbers-src/glass-design.webp, 1490 x 1056: three glass pill rows on a light card, the figures in red brushed metal).
Writes into site/assets/influencers/:
  nums-row.webp   one glass row's frame for a 9-slice border-image (influencers.css .inf-nums__row): the design's second
                  row's left cap (x 45..200, y 470..727: clear of the infinity), the same mirrored on the right, and
                  between them its last column carried on; the card's colour round it
                  brought to the page's card colour (#f9f8fd), so the frame sits on the card seamlessly
  nums-red.webp   the red brushed metal the figures are filled with (a light top, a deep foot, fine horizontal
                  brushing and a soft diagonal sheen), drawn here
Run:  python3 tools/influencers/nums_glass.py"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
CARD = np.array([243, 242, 247], float)   # the page's background (the block has no card of its own)

a = np.asarray(Image.open(os.path.join(HERE, 'numbers-src', 'glass-design.webp')).convert('RGB')).astype(float)
Y0, Y1 = 470, 727
left = a[Y0:Y1, 45:200]
# the right cap is the left one mirrored and the middle carries on the left cap's last column (clear of the infinity
# from x 200): no seams wherever the middle is stretched (pieces from two places of the design showed their joins)
mid = np.repeat(left[:, -1:], 40, 1)
row = np.concatenate([left, mid, left[:, ::-1]], 1)
# the card round the pill: its corners; scale every pixel so that colour becomes CARD (glints above it eased to white)
bg = np.median(np.concatenate([row[:6, :20].reshape(-1, 3), row[-6:, :20].reshape(-1, 3), row[:6, -20:].reshape(-1, 3), row[-6:, -20:].reshape(-1, 3)]), 0)
row = np.where(row <= bg, row * CARD / bg, CARD + (row - bg) * (255 - CARD) / np.maximum(255 - bg, 1))
Image.fromarray(np.clip(row + .5, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'nums-row.webp'), quality=92, method=6)
print('nums-row.webp', row.shape[1], 'x', row.shape[0], '(slices: 128 155 128 155)')

# red brushed metal
W, H = 1200, 400
rng = np.random.default_rng(7)
y = np.linspace(0, 1, H)[:, None]
base = np.stack([236 - 84 * y, 52 - 40 * y, 64 - 44 * y], 2) * np.ones((1, W, 1))       # #ec3440 top -> #980c14 foot
streak = rng.normal(0, 1, (H, W // 70))
streak = np.asarray(Image.fromarray(((streak - streak.min()) / (np.ptp(streak)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(float) / 255
fine = rng.normal(0, 1, (H, W)); fine = np.asarray(Image.fromarray(((fine - fine.min()) / np.ptp(fine) * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(0)).resize((W, H))).astype(float) / 255
fine = np.asarray(Image.fromarray((fine * 255).astype(np.uint8)).resize((W // 30, H)).resize((W, H), Image.BICUBIC)).astype(float) / 255
brush = (streak - .5) * 34 + (fine - .5) * 30
xx = np.linspace(0, 1, W)[None, :]
sheen = np.exp(-((xx * .8 + y * .6 - .55) / .1) ** 2) * 60                                   # a soft diagonal light
img = base + brush[..., None] * np.array([1, .45, .45]) + sheen[..., None] * np.array([1, .75, .75])
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'nums-red.webp'), quality=80, method=6)
print('nums-red.webp', W, 'x', H, os.path.getsize(os.path.join(OUT, 'nums-red.webp')) // 1024, 'KB')
