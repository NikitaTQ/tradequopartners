"""The /for-influencers/ hero scene since November 2026 (owner's design: hero-youtube-design.webp, 1219 x 1290):
Instagram, Telegram and YouTube posts of "your channel" in glass, wired to the dark "Your commissions" panel (its rows:
Instagram, Telegram, YouTube referrals). Its words need no change (none of the words the site never uses). Made ready:
  - its background (about #eceaf6, a shade darker at the edges) brought to the hero's flat #f3f2f7: the design's own
    background measured round the scene (a smooth surface fitted to the margin), every pixel's channels scaled by it
    (up to it; above it eased to white, so no glint clips): the picture's edge does not show on the page, the shadows
    and glows under the cards stay as drawn;
  - cut to the scene with a margin for the glows, and 36px of the flat background added at each side (the left card's
    glow comes within 12px of the design's edge; the page fades the picture's edges, influencers.css).
Writes site/assets/influencers/scene-yt-{646,968,1291}.webp (1291 = the design's own pixels and the margins).
Run:  python3 tools/influencers/hero_youtube.py   (CHECK=/path/file.png also saves the picture for a look)"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
CROP = (0, 112, 1219, 1215)
PAD = 36
BG, TO = np.array([237, 236, 247]), np.array([243, 242, 247])   # the design's background (about), the hero's

a = np.asarray(Image.open(os.path.join(HERE, 'hero-youtube-design.webp')).convert('RGB')).astype(float)
H, W = a.shape[:2]
x0, y0, x1, y1 = CROP
yy, xx = np.mgrid[0:H, 0:W]
band = ((yy < y0 + 60) | (yy > y1 - 50) | (xx < 10) | (xx > W - 10)) & (yy >= y0) & (yy < y1)
band &= np.abs(a - BG).max(2) < 7
u, v = (xx - W / 2) / W, (yy - H / 2) / H
basis = lambda m: np.stack([np.ones(m.sum()), u[m], v[m], u[m] ** 2, v[m] ** 2, u[m] * v[m]], 1)
allm = np.ones((H, W), bool)
bg = np.stack([(basis(allm) @ np.linalg.lstsq(basis(band), a[..., c][band], rcond=None)[0]).reshape(H, W) for c in range(3)], 2)
out = np.where(a <= bg, a * TO / bg, TO + (a - bg) * (255 - TO) / np.maximum(255 - bg, 1))
pic = Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8)).crop(CROP)
full = Image.new('RGB', (pic.width + 2 * PAD, pic.height), tuple(int(c) for c in TO))
full.paste(pic, (PAD, 0))
if os.environ.get('CHECK'):
    full.save(os.environ['CHECK'])
for w in (646, 968, 1291):
    p = full if w == full.width else full.resize((w, round(full.height * w / full.width)), Image.LANCZOS)
    fn = os.path.join(OUT, 'scene-yt-%d.webp' % w)
    p.save(fn, quality=86, method=6)
    print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
