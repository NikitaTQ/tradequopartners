"""The /for-influencers/ creators scene on YouTube (owner's design, November 2026: creators-src/youtube-design.webp,
1692 x 930, the card as the design exported it: the scene in red, "ON YOUTUBE", the platform switch drawn at its foot).
Made into the scene's own frame, as the other platforms' pictures are (creators-src/<platform>.webp 1774 x 887 and
<platform>-ext.webp 1774 x 88, the strip under it):
  - set on the frame: x 1.0728 and y 1.081 times, moved -23.8 / -9.3 (worked out from three creators' faces matched
    in both pictures; the orbit, the avatars and the plates then lie where the page's orbit, mask and plate lights are);
  - the switch drawn at the design's foot: the nebula's grain mirrored in from either side, on a smooth base from round
    it; the comet's still light on the orbit: each row across it drawn from either side; the design's light margin
    and rounded corners round the card: filled with the picture's own nebula (clean.fill);
then creators.py writes it out (orbit-youtube-*.webp) and portrait.py makes its phone card.
Run:  python3 tools/influencers/youtube.py && python3 tools/influencers/creators.py && python3 tools/influencers/portrait.py"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import clean   # noqa: E402

SX, SY, OX, OY = 1.0728, 1.081, -23.8, -9.3
W, H = 1774, 975                     # the scene (887) and the strip under it (88)

d = Image.open(os.path.join(HERE, 'creators-src', 'youtube-design.webp')).convert('RGB')
im = d.transform((W, H), Image.AFFINE, (1 / SX, 0, -OX / SX, 0, 1 / SY, -OY / SY), resample=Image.BICUBIC)
a = np.asarray(im, dtype=np.float32)

# outside the design's card (its light margin and rounded corners; the card in the design: x 15..1676, y 13..911,
# corners of radius 46, inside its thin light rim): those pixels of the frame are filled
xd, yd = (np.mgrid[0:H, 0:W][1] - OX) / SX, (np.mgrid[0:H, 0:W][0] - OY) / SY
CX0, CY0, CX1, CY1, R = 15, 13, 1676, 911, 46
qx = np.clip(xd, CX0 + R, CX1 - R)
qy = np.clip(yd, CY0 + R, CY1 - R)
outside = (xd < CX0) | (xd > CX1) | (yd < CY0) | (yd > CY1) | ((xd - qx) ** 2 + (yd - qy) ** 2 > R * R)
outside = np.array(Image.fromarray((outside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0

# the comet's still light on the orbit (x 822..844, y 777..799; the orbit runs nearly level there): each row across it
# drawn from the columns on either side
for y in range(774, 803):
    l, r = a[y, 819].copy(), a[y, 847].copy()
    for x in range(820, 847):
        k = (x - 819) / 28
        a[y, x] = l * (1 - k) + r * k

# the switch drawn at the design's foot (with its glow): the nebula's grain mirrored in from either side of it (left
# half from the left, right half from the right), on a smooth base drawn from round it, over a soft edge
BAR = (548, 872, 1222, 966)
bar = Image.new('L', (W, H), 0)
ImageDraw.Draw(bar).rounded_rectangle(BAR, radius=46, fill=255)
bar = np.array(bar) > 0
# what no grain may be taken from: the icon and title, the planet, the orbit, the creators
avoid = Image.new('L', (W, H), 0)
da = ImageDraw.Draw(avoid)
da.rectangle((500, 0, 1290, 300), fill=255)
da.ellipse((850 - 300, 600 - 175, 850 + 300, 600 + 175), fill=255)
da.line(clean.orbit_points(10), fill=255, width=34)
for cx, cy, r in clean.CIRCLES:
    da.ellipse((cx - r - 10, cy - r - 10, cx + r + 10, cy + r + 10), fill=255)
for x, y, w, h in clean.RECTS:
    da.rectangle((x - 10, y - 10, x + w + 10, y + h + 10), fill=255)
avoid = np.array(avoid) > 0

clean.W, clean.H = W, H
base = clean.pushpull(a, bar)
grain = a - clean._blur(a, 6)
don = np.zeros_like(a)
mid = (BAR[0] + BAR[2]) // 2
for x in range(BAR[0] - 20, BAR[2] + 21):
    sx = 2 * BAR[0] - x if x < mid else 2 * BAR[2] - x
    don[:, x] = grain[:, min(max(sx, 0), W - 1)]
soft = Image.fromarray((bar * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(8))
k = np.maximum(np.array(soft, np.float32) / 255, bar)[..., None]
a = a * (1 - k) + (base + don) * k
# then the margin and corners, small: the usual fill
out = clean.fill(a, outside, avoid)
out = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
out.crop((0, 0, W, 887)).save(os.path.join(HERE, 'creators-src', 'youtube.webp'), quality=92, method=6)
out.crop((0, 887, W, H)).save(os.path.join(HERE, 'creators-src', 'youtube-ext.webp'), quality=92, method=6)
if os.environ.get('CHECK'):
    out.save(os.environ['CHECK'])
print('youtube.webp, youtube-ext.webp')
