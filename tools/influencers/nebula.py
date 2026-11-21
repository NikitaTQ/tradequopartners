"""A nebula of its own for the phone card's lower part, in a platform's colours: domain-warped fractal noise drawn as
soft clouds with bright filament edges (as the design's), coloured by the design's own picture (for each brightness and
each part across, the colour its lower band has there), with a field of stars. numpy + Pillow."""
import numpy as np
from PIL import Image


def _resize(a, w, h):
    return np.array(Image.fromarray(a.astype(np.float32), 'F').resize((w, h), Image.BICUBIC), dtype=np.float32)


def fbm(rng, w, h, cells=3, octaves=6, gain=.52):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cw, ch = cells * 2 ** o + 1, max(2, round(cells * 2 ** o * h / w) + 1)
        out += amp * _resize(rng.random((ch, cw)), w, h)
        tot += amp
        amp *= gain
    return out / tot


def _sample(a, x, y):
    h, w = a.shape
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0, y0 = x.astype(int), y.astype(int)
    fx, fy = x - x0, y - y0
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)


def field(seed, w, h):
    """brightness 0..1: clouds and their lit filaments"""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    q1, q2 = fbm(rng, w, h, 2, 5), fbm(rng, w, h, 2, 5)
    warp = 0.22 * w
    n = fbm(rng, w, h, 3, 7)
    n = _sample(n, xx + (q1 - .5) * warp, yy + (q2 - .5) * warp * .6)
    # streaks along a diagonal, like the design's clouds (they run from lower left to upper right)
    n = 0.75 * n + 0.25 * _sample(fbm(rng, w, h, 2, 6), xx * .55 + yy * .35, yy * .5)
    n = (n - n.min()) / (n.max() - n.min())
    cloud = np.clip((n - .42) / .4, 0, 1) ** 1.6
    ridge = 1 - np.abs(2 * fbm(rng, w, h, 5, 6) - 1)
    ridge = _sample(ridge, xx + (q2 - .5) * warp * .5, yy + (q1 - .5) * warp * .5)
    fil = (ridge ** 9) * np.clip((n - .38) / .3, 0, 1)
    edge = np.clip(1 - np.abs(n - .55) / .08, 0, 1) ** 2 * .5      # the bright rim where a cloud ends
    haze = fbm(rng, w, h, 4, 6)   # the dark sky is never flat: a faint haze under the clouds (and no ties to rank)
    return np.clip(cloud * .55 + fil * .9 + edge * cloud.clip(0, 1) * .6, 0, 1) + .14 * n + .06 * haze


def stars(seed, w, h, count):
    rng = np.random.default_rng(seed + 99)
    s = np.zeros((h, w), np.float32)
    xs, ys = rng.integers(0, w, count), rng.integers(0, h, count)
    br = rng.random(count) ** 4
    s[ys, xs] = np.maximum(s[ys, xs], br)
    big = br > .55
    for x, y, b in zip(xs[big], ys[big], br[big]):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= x + dx < w and 0 <= y + dy < h:
                s[y + dy, x + dx] = max(s[y + dy, x + dx], b * .45)
    return s


def palette_lut(src, band, columns=12, bins=40):
    """for each of `columns` parts across and each brightness bin, the mean colour of the picture's band there
    (sparse bins taken from their neighbours, then smoothed both ways); also the band's brightness quantiles"""
    a = np.asarray(src, dtype=np.float32)[band[0]:band[1]]
    lum = a @ np.array([.3, .55, .15], np.float32)
    lo, hi = float(np.percentile(lum, .5)), float(np.percentile(lum, 99.8))
    sums = np.zeros((columns, bins, 3), np.float64)
    cnt = np.zeros((columns, bins), np.float64)
    w = a.shape[1]
    for c in range(columns):
        sl = slice(int(c * w / columns), int((c + 1) * w / columns))
        L, A = lum[:, sl].ravel(), a[:, sl].reshape(-1, 3)
        idx = np.clip(((L - lo) / (hi - lo) * (bins - 1)).astype(int), 0, bins - 1)
        np.add.at(sums[c], idx, A)
        np.add.at(cnt[c], idx, 1)
    # pool sparse bins with the whole band's, so a bin of a few pixels does not bring in a stray colour
    gs, gc = sums.sum(0), cnt.sum(0)
    k = 400.0
    lut = (sums + gs[None] * (k / np.maximum(gc, 1))[None, :, None]) / (cnt + k)[..., None]
    for b in range(bins):   # bins nobody used: from the brightness scale itself
        if gc[b] == 0:
            lut[:, b] = (lo + (hi - lo) * b / (bins - 1))
    for _ in range(3):
        lut[:, 1:-1] = (lut[:, :-2] + 2 * lut[:, 1:-1] + lut[:, 2:]) / 4
        lut[1:-1] = (lut[:-2] + 2 * lut[1:-1] + lut[2:]) / 4
    q = np.percentile(lum, np.linspace(0, 100, 101))
    return lut.astype(np.float32), lo, hi, q


def render(src, seed, w, h, band, x_from=0.0, x_to=1.0):
    """the nebula, w x h, coloured by `src`'s rows band[0]..band[1], columns x_from..x_to of it mapped across;
    its brightness follows the band's (the same share of dark sky, clouds and bright edges)"""
    lut, lo, hi, q = palette_lut(src, band)
    cols, bins = lut.shape[0], lut.shape[1]
    pad = 80
    f = field(seed, w + 2 * pad, h + 2 * pad)[pad:pad + h, pad:pad + w]
    ranks = np.argsort(np.argsort(f.ravel())).reshape(f.shape) / (f.size - 1)
    L = np.interp(ranks * 100, np.linspace(0, 100, 101), q)
    L = np.clip(L + stars(seed, w, h, int(w * h / 700)) * 170, 0, 255)
    cx = np.clip(((x_from + (x_to - x_from) * (np.arange(w) + .5) / w) * cols - .5), 0, cols - 1.001)
    c0 = cx.astype(int)
    fc = (cx - c0)[None, :, None]
    bi = np.clip((L - lo) / (hi - lo) * (bins - 1), 0, bins - 1.001)
    b0 = bi.astype(int)
    fb = (bi - b0)[..., None]
    C0 = np.broadcast_to(c0[None, :], f.shape)
    v = lambda c, b: lut[c, b]
    col = ((v(C0, b0) * (1 - fb) + v(C0, b0 + 1) * fb) * (1 - fc) + (v(C0 + 1, b0) * (1 - fb) + v(C0 + 1, b0 + 1) * fb) * fc)
    # above the band's brightest, toward white (the stars, the brightest edges)
    over = np.clip((L - hi) / 60, 0, 1)[..., None]
    col = col * (1 - over) + 255 * over
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))
