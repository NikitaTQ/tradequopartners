"""Run from tools/ib-hero after erase.py:  python3 erase.py && python3 compose.py  (then python3 tools/build-i18n.py for the stamps)
The IB Tools hero pictures from the new design (src.webp, its words erased in clean.png):
- hero-vs.webp, 1292x1217: the same frame as before (the cards where the old ones were: x ~71-1199, y ~133-1037);
- hero-vs-m.webp, 923x1080: the phone's: our card in front (moved -350,-70), the plate behind at .7 (then -14,+89), VS on
  our card's left edge at .75 (the CSS moves the words the same way);
- words-desk.png / words-m.png: the same with the design's words, to check the HTML words against;
- lines.json: each word line of the design, in the desktop frame: left, cap top, baseline, right.
Colours are divided by the page white of the design (254) so the margins are pure white: the picture lies on the hero
with mix-blend-mode multiply."""
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 0.91
CX, CY, TX, TY = 696.0, 563.0, 635.0, 585.0      # src point (CX, CY) lands on (TX, TY)
BG = 254.0


def to_frame(img_path):
    im = Image.open(img_path).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    # the design's page white (251-254) to pure white, so the picture's edge does not show on the hero: values up to 243
    # stay, 243-251 ease up to 255 (a smooth step), above that white
    t = np.clip((a - 243.0) / 8.0, 0, 1)
    a = a + (255.0 - a) * (t * t * (3 - 2 * t))
    im = Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8))
    w, h = im.size
    big = im.resize((round(w * S), round(h * S)), Image.LANCZOS)
    ox, oy = round(TX - CX * S), round(TY - CY * S)
    frame = Image.new('RGB', (1292, 1217), (255, 255, 255))
    frame.paste(big, (ox, oy))
    return frame


def X(x): return TX + (x - CX) * S
def Y(y): return TY + (y - CY) * S


desk = to_frame('clean.png')
desk.save('hero-vs.png')
words = to_frame('src.webp')
words.save('words-desk.png')

# ---- the phone's picture
PW, PH = 923, 1080


def phone(frame):
    f = np.asarray(frame).astype(np.float32) / 255.0
    out = np.ones((PH, PW, 3), np.float32)
    # the plate (with its shadow) at .7, then moved
    plate = frame.crop((40, 160, 600, 1060))                       # frame px: the plate, its shadow, white round it
    pw, ph = plate.size
    ps = plate.resize((round(pw * 0.7), round(ph * 0.7)), Image.LANCZOS)
    px, py = round(40 * 0.7 - 14), round(160 * 0.7 + 89)
    pa = np.asarray(ps).astype(np.float32) / 255.0
    out[py:py + pa.shape[0], px:px + pa.shape[1]] *= pa
    # our card in front: its body replaces what is under it, its glow and shadow darken it (multiply)
    x0, y0, x1, y1 = 585, 95, 1240, 1090                           # frame px: the card with its glow
    card = f[y0:y1, x0:x1].copy()
    # not the desktop VS disc (it overlaps the card's left edge): left of the card's rim white, the rim itself from 6px in
    rim = int(round(X(662))) - x0
    card[:, :rim] = 1.0
    vy0, vy1 = int(Y(569) - 40 * S) - y0, int(Y(569) + 40 * S) - y0
    card[vy0:vy1, rim:rim + 4] = card[vy0:vy1, rim + 6:rim + 10]
    cx0, cy0 = x0 - 350, y0 - 70
    body = Image.new('L', (x1 - x0, y1 - y0), 0)
    bx0, by0, bx1, by1 = X(662) + 2 - x0, Y(66) + 2 - y0, X(1316) - 2 - x0, Y(1060) - 2 - y0
    ImageDraw.Draw(body).rounded_rectangle((bx0, by0, bx1, by1), radius=round(66 * S), fill=255)
    body = np.asarray(body.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)[..., None] / 255.0
    region = out[cy0:cy0 + card.shape[0], cx0:cx0 + card.shape[1]]
    region[:] = body * card + (1 - body) * region * card
    # VS: the disc from the desktop frame at .75, centred on our card's left edge, its shadow multiplied
    vx, vy, vr = X(625), Y(569), 38 * S
    k = 0.75
    pad = 1.9
    box = (round(vx - vr * pad), round(vy - vr * pad), round(vx + vr * pad), round(vy + vr * pad))
    disc = frame.crop(box)
    dw = round(disc.size[0] * k)
    disc = np.asarray(disc.resize((dw, dw), Image.LANCZOS)).astype(np.float32) / 255.0
    ccx, ccy = X(662) - 350, 515                                    # phone px: on our card's left edge, about its middle
    dx0, dy0 = round(ccx - dw / 2), round(ccy - dw / 2)
    yy, xx = np.mgrid[0:dw, 0:dw]
    rr = np.hypot(xx - (dw - 1) / 2, yy - (dw - 1) / 2)
    R = vr * k
    m = np.clip((R + 0.8 - rr) / 1.6, 0, 1)[..., None]             # the disc itself, anti-aliased
    # under it, its own soft shadow (not the crop round it: that holds the desktop plate's and card's edges)
    rs = np.hypot(xx - (dw - 1) / 2, yy - (dw - 1) / 2 - 0.16 * R)
    sh = 1.0 - 0.32 * np.exp(-np.clip(rs - 0.78 * R, 0, None) ** 2 / (2 * (0.2 * R) ** 2))
    reg = out[dy0:dy0 + dw, dx0:dx0 + dw]
    reg[:] = m * disc + (1 - m) * reg * sh[..., None]
    return Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8))


phone(desk).save('hero-vs-m.png')
phone(words).save('words-m.png')
# the page's pictures
Image.open('hero-vs.png').save('../../site/assets/ib/hero-vs.webp', 'WEBP', quality=90, method=6)
Image.open('hero-vs-m.png').save('../../site/assets/ib/hero-vs-m.webp', 'WEBP', quality=90, method=6)

# ---- the word lines: left, cap top, baseline, right (frame px), measured on the design
src = np.asarray(Image.open('src.webp').convert('RGB')).astype(np.float32)
lum = src @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
ink = (lum < 115) | ((src[..., 0] > 160) & (src[..., 1] < 100) & (src[..., 2] < 100))
LINES = {
    'th': (205, 241, 120, 540), 'tl1': (333, 352, 125, 320), 'tv1': (368, 399, 125, 320), 'tl2': (457, 477, 125, 390),
    'tv2': (489, 528, 125, 390), 'tl3': (586, 606, 125, 400), 'tv3': (621, 659, 125, 400), 'tl4': (715, 735, 125, 510),
    'tv4': (750, 787, 125, 510), 'tl5': (843, 863, 125, 560), 'tv5': (872, 915, 125, 560),
    'uh': (169, 189, 735, 964),
    'ul1': (255, 272, 830, 1240), 'ut1': (278, 315, 830, 1240), 'us1': (338, 363, 830, 1240),
    'ul2': (412, 429, 830, 1240), 'ut2': (436, 479, 830, 1240), 'us2': (494, 520, 830, 1240),
    'ul3': (570, 587, 830, 1240), 'ut3': (595, 638, 830, 1240), 'us3': (653, 678, 830, 1240),
    'ul4': (730, 747, 830, 1240), 'ut4': (753, 797, 830, 1240), 'us4': (811, 837, 830, 1240),
    'ul5': (887, 904, 830, 1240), 'ut5': (919, 944, 830, 1240), 'us5': (966, 991, 830, 1240),
}
res = {}
for k, (y0, y1, x0, x1) in LINES.items():
    m = ink[y0:y1, x0:x1]
    rows = m.sum(1)
    mx = rows.max()
    top = int(np.argmax(rows >= 0.15 * mx))
    base = int(np.where(rows >= 0.35 * mx)[0].max())
    cols = np.where(m.any(0))[0]
    res[k] = {'x': round(X(x0 + cols.min()), 1), 'top': round(Y(y0 + top), 1), 'b': round(Y(y0 + base + 1), 1),
              'r': round(X(x0 + cols.max() + 1), 1), 'cap': round((base + 1 - top) * S, 1)}
json.dump(res, open('lines.json', 'w'), indent=1)
for k, v in res.items():
    print(k, v)
