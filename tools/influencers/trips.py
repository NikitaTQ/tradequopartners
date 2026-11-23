"""The /for-influencers/ "Incentive trips" block, owner's second design (November 2026, trips-design.webp, 1763 x 892: the
text on the left, on the right three stories of a partner trip in Dubai in glass phones: arrivals, on the water, a
sunset dinner). The phones are the design's own picture: cut out with a margin, their background (about #eae7f9, a
little darker at the edges) brought to the page's flat #f3f2f7 (the design's background measured round the phones, a
smooth surface; every pixel scaled by it: up to it, above it eased to white), so the picture's edge does not show; its
edges fade on the page too (influencers.css). The text is the page's own (live, translatable).
Writes site/assets/influencers/trips-{520,780,1040}.webp.
Run:  python3 tools/influencers/trips.py   (CHECK=/path/file.png also saves the picture for a look)"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
CROP = (730, 40, 1763, 892)                       # the phones, their glow and some air
TO = np.array([243, 242, 247])

a = np.asarray(Image.open(os.path.join(HERE, 'trips-design.webp')).convert('RGB')).astype(float)
H, W = a.shape[:2]
x0, y0, x1, y1 = CROP
yy, xx = np.mgrid[0:H, 0:W]
inside = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
band = inside & ~((xx >= x0 + 40) & (xx < x1 - 40) & (yy >= y0 + 40) & (yy < y1 - 30))
band |= (xx >= 700) & (xx < 760) & (yy >= 20)     # the clear strip left of the phones
band &= np.abs(a - np.array([234, 231, 249])).max(2) < 8
u, v = (xx - W / 2) / W, (yy - H / 2) / H
basis = lambda m: np.stack([np.ones(m.sum()), u[m], v[m], u[m] ** 2, v[m] ** 2, u[m] * v[m]], 1)
allm = np.ones((H, W), bool)
bg = np.stack([(basis(allm) @ np.linalg.lstsq(basis(band), a[..., c][band], rcond=None)[0]).reshape(H, W) for c in range(3)], 2)
out = np.where(a <= bg, a * TO / bg, TO + (a - bg) * (255 - TO) / np.maximum(255 - bg, 1))
pic = Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8)).crop(CROP)
if os.environ.get('CHECK'):
    pic.save(os.environ['CHECK'])
for w in (520, 780, 1040):
    p = pic.resize((w, round(pic.height * w / pic.width)), Image.LANCZOS)
    fn = os.path.join(OUT, 'trips-%d.webp' % w)
    p.save(fn, quality=84, method=6)
    print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
