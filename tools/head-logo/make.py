"""The header's logo, "TRADEQUO PARTNERS" (owner's design, November 2026: design.webp, 2000 x 667, the mark, TRADEQUO in
silver and PARTNERS in red metal, on black). Cut from its black: each pixel's alpha is its brightest channel (and its
colour that divided by the alpha), so laid on the header's dark bar it looks as on the design's black; the faint noise
of the black is dropped.
Two files in site/assets/head/:
  logo-partners.webp     one line, as designed (wider screens);
  logo-partners-m.webp   phones (up to 640px, where the bar has ~130px for it): the same pieces stacked, TRADEQUO over
                         PARTNERS, the mark beside them as tall as the two lines, so its letters are as large as the
                         old logo's and 1.5px more.
Both at 3 times their size on the page (sharp on any screen).
Run:  python3 tools/head-logo/make.py"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'head')

src = np.asarray(Image.open(os.path.join(HERE, 'design.webp')).convert('RGB')).astype(float)
# PARTNERS brighter (owner's wish: the design's red read as dark wine on the bar): its red lifted on a soft shoulder
# (tanh, so its highlights do not clip: the median 126 -> 208), green and blue by the same factor a little less, so
# the metal keeps its shading and turns a clean red
R0 = 1140
part = src[:, R0:]
r = part[..., 0]
r2 = 255 * np.tanh(r * 2.2 / 255) / np.tanh(2.2)
f = r2 / np.maximum(r, 1)
part[..., 0] = r2
part[..., 1] = np.clip(part[..., 1] * f * .85, 0, 255)
part[..., 2] = np.clip(part[..., 2] * f * .85, 0, 255)
m = src.max(2)
a = np.clip((m - 7) / (255 - 7), 0, 1)                     # the black's noise (up to ~7) is not ink
rgb = np.where(a[..., None] > 0, np.clip(src / np.maximum(m, 1)[..., None] * 255, 0, 255), 0)
rgba = np.dstack([rgb, a * 255]).astype(np.uint8)
im = Image.fromarray(rgba, 'RGBA')

# the pieces (design px): the mark, TRADEQUO, PARTNERS; caps from y 274, the baseline at 362 (Q's tail to 370)
MARK, WORD1, WORD2 = (96, 242, 292, 398), (320, 266, 1114, 376), (1146, 266, 1913, 376)
PAD = 6


def save(img, name, h):
    """at 3x of h css px"""
    img = img.resize((round(img.width * h * 3 / img.height), round(h * 3)), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))   # the design is soft: crisper edges
    fn = os.path.join(OUT, name)
    img.save(fn, quality=92, alpha_quality=100, method=6)
    print(name, img.size, os.path.getsize(fn), 'bytes')


# one line: the whole lockup, cut close
x0, y0, x1, y1 = MARK[0] - PAD, MARK[1] - PAD, WORD2[2] + PAD, MARK[3] + PAD
save(im.crop((x0, y0, x1, y1)), 'logo-partners.webp', 26)   # caps 13.6px: the old logo's 12px and 1.5px more (owner's wish)

# phones: TRADEQUO over PARTNERS (a line's gap a quarter of the caps), the mark as tall as cap top to second baseline
CAP, GAP = 88, 24
w1, w2 = im.crop(WORD1), im.crop(WORD2)
text_h = (WORD1[3] - WORD1[1]) + CAP + GAP
k = (CAP + GAP + CAP) / (MARK[3] - MARK[1] - 2 * PAD)       # the mark's ink spans its box less the padding
mk = im.crop(MARK)
mk = mk.resize((round(mk.width * k), round(mk.height * k)), Image.LANCZOS)
mgap = round(36 * k)
W = mk.width + mgap + max(w1.width, w2.width)
top = 274 - WORD1[1]                                         # cap top inside a word's crop
H = max(mk.height, text_h)
st = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ty = (H - (CAP + GAP + CAP)) // 2 - top                      # the two lines' caps centred on the mark
st.alpha_composite(mk, (0, (H - mk.height) // 2))
st.alpha_composite(w1, (mk.width + mgap, ty))
st.alpha_composite(w2, (mk.width + mgap, ty + CAP + GAP))
st = st.crop(st.getbbox())
st = st.crop((-PAD, -PAD, st.width + PAD, st.height + PAD))
save(st, 'logo-partners-m.webp', 30)
