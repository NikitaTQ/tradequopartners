"""The /for-influencers/ closing picture (owner's design, November 2026, star-src/star-window-design.webp, 1672 x 941):
a spaceship's window on the TradeQuo planet, "WANT TO BE OUR NEXT STAR? / INVITED. SEE YOU SOON." Its rounded glass
frame and all inside it are kept as drawn; the light background round the frame is made transparent (its soft shadow
kept, as a translucent shade), so the window lies on whatever the page puts under it (a gradient into the footer).
Run:  python3 tools/influencers/star_window.py   ->  site/assets/influencers/star-window-{1600,1000,700}.webp"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'influencers')
im = Image.open(os.path.join(HERE, 'star-src', 'star-window-design.webp')).convert('RGB')
a = np.asarray(im).astype(float)
H, W = a.shape[:2]
# the background: a smooth surface fitted to the picture's outer band (light, a little blue)
yy, xx = np.mgrid[0:H, 0:W]
band = (xx < 10) | (xx > W - 11) | (yy < 6) | (yy > H - 7)
u, v = (xx - W / 2) / W, (yy - H / 2) / H
B = lambda k: np.stack([np.ones(k.sum()), u[k], v[k], u[k] ** 2, v[k] ** 2, u[k] * v[k]], 1)
allm = np.ones((H, W), bool)
bg = np.stack([(B(allm) @ np.linalg.lstsq(B(band), a[..., c][band], rcond=None)[0]).reshape(H, W) for c in range(3)], 2)
# the frame: a rounded rectangle (its outer edge, found on the picture), all of it opaque
inside = Image.new('L', (W, H), 0)
ImageDraw.Draw(inside).rounded_rectangle((19, 12, W - 19, H - 17), radius=58, fill=255)
inside = np.asarray(inside.filter(ImageFilter.GaussianBlur(1.2))).astype(float) / 255
# outside it: as transparent as it is close to the background; what is darker (the shadow) a translucent shade of it
dark = np.clip((bg - a).max(2), 0, None)
diff = np.abs(a - bg).max(2)
alpha_out = np.clip((diff - 7) / 40, 0, 1)
alpha = np.maximum(inside, alpha_out)
rgb = a.copy()
# a translucent pixel over the page should look like the picture over its background: un-premultiply against bg
m = (alpha > 0.02) & (inside < 0.99)
al = alpha[..., None]
rgb[m] = np.clip((a[m] - bg[m] * (1 - al[m])) / al[m], 0, 255)
out = Image.fromarray(np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
for w in (1600, 1000, 700):
    p = out.resize((w, round(H * w / W)), Image.LANCZOS)
    fn = os.path.join(OUT, 'star-window-%d.webp' % w)
    p.save(fn, quality=86, alpha_quality=90, method=6)
    print(os.path.basename(fn), p.size, os.path.getsize(fn) // 1024, 'KB')
