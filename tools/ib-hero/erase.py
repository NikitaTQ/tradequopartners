"""Erase the words from the new hero picture (src.webp), keeping the logo, the icons and VS.
Each box: a smooth tone filled in from the box's edges (harmonic fill of a blurred copy) plus the surface's fine texture
(the brushed metal's streaks, the glass's grain) taken from a clean band of the same card; blended in over 4px."""
import numpy as np
from PIL import Image

src = np.asarray(Image.open('src.webp').convert('RGB')).astype(np.float32)
H, W, _ = src.shape


def blur(a, s):
    r = int(3 * s)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2)
    k /= k.sum()
    p = np.pad(a, ((r, r), (r, r), (0, 0)), mode='reflect')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 0, p)
    p = np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 1, p)
    return p


def harmonic(ring_src, y0, y1, x0, x1, iters=900):
    """Laplace fill of [y0:y1, x0:x1] with the box's border taken from ring_src; Coons patch start, Jacobi steps."""
    b = ring_src[y0:y1, x0:x1].copy()
    h, w = b.shape[:2]
    top, bot, lef, rig = b[0], b[-1], b[:, 0], b[:, -1]
    v = np.linspace(0, 1, h)[:, None, None]
    u = np.linspace(0, 1, w)[None, :, None]
    c = ((1 - v) * top[None] + v * bot[None] + (1 - u) * lef[:, None] + u * rig[:, None]
         - ((1 - u) * (1 - v) * b[0, 0] + u * (1 - v) * b[0, -1] + (1 - u) * v * b[-1, 0] + u * v * b[-1, -1]))
    c[0], c[-1], c[:, 0], c[:, -1] = top, bot, lef, rig
    for _ in range(iters):
        c[1:-1, 1:-1] = 0.25 * (c[:-2, 1:-1] + c[2:, 1:-1] + c[1:-1, :-2] + c[1:-1, 2:])
    return c


smooth = blur(src, 3.0)
resid = src - blur(src, 5.0)
# the fine texture only: scratches, specks and the words' halos would repeat where the texture is laid, so they are clipped
sig = np.median(np.abs(resid), axis=(0, 1)) * 1.4826
resid = np.clip(resid, -2.2 * sig, 2.2 * sig)

# clean bands of each surface, for its fine texture (rows y0:y1, columns x0:x1)
PLATE_BANDS = [(256, 297, 100, 562), (932, 998, 100, 562)]
CARD_BANDS = [(196, 244, 830, 1262), (530, 560, 830, 1262), (690, 720, 830, 1262), (848, 878, 830, 1262)]


def texture(bands, h, w, seed):
    rng = np.random.default_rng(seed)
    rows = []
    for (a, c, x0, x1) in bands:
        if x1 - x0 < w:
            continue
        off = int(rng.integers(0, x1 - x0 - w + 1))
        rows.append(resid[a:c, x0 + off:x0 + off + w])
    lib = np.concatenate(rows, 0)
    out, flip = [], False
    while sum(r.shape[0] for r in out) < h:
        out.append(lib[::-1] if flip else lib)
        flip = not flip
    t = np.concatenate(out, 0)
    s = int(rng.integers(0, max(1, t.shape[0] - h)))
    return t[s:s + h]


# (y0, y1, x0, x1) of each word's line, padded: the plate's heading and its five cells (label + value), our card's "Our IB
# program" and its five rows (label, title, line under it)
PLATE = [(196, 252, 112, 542), (325, 410, 117, 316), (449, 539, 117, 387), (578, 670, 117, 405), (707, 798, 117, 513), (835, 926, 117, 566)]
CARD = [(165, 194, 735, 964), (250, 368, 827, 1171), (407, 525, 827, 1076), (565, 683, 827, 1113), (725, 842, 827, 1129), (882, 996, 826, 1237)]

out = src.copy()
FE = 7.0
for group, bands, tex_k in ((PLATE, PLATE_BANDS, 1.0), (CARD, CARD_BANDS, 1.0)):
    for i, (y0, y1, x0, x1) in enumerate(group):
        base = harmonic(smooth, y0, y1, x0, x1)
        t = texture(bands, y1 - y0, x1 - x0, seed=i * 7 + (0 if group is PLATE else 100))
        syn = base + tex_k * t
        h, w = y1 - y0, x1 - x0
        yy = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]
        xx = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
        wgt = np.clip(np.minimum(yy, xx) / FE, 0, 1)[..., None]
        out[y0:y1, x0:x1] = wgt * syn + (1 - wgt) * src[y0:y1, x0:x1]

Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save('clean.png')
print('ok')
