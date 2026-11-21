"""The creators scene without its creators (and, for the phone's lower part, without its orbit either): the holes they
leave are filled with the picture's own nebula, patch by patch (each patch taken from the nearby clean area whose edge
matches the hole's edge best, blended in over a soft edge). Used by portrait.py. numpy + Pillow only."""
import math, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1774, 887
# the creators in the design's frame (its tqHide mask): avatars (centre, radius) and plates (x, y, w, h)
CIRCLES = [(297, 435, 60), (1069, 375, 62), (1353, 539, 62), (327, 742, 58), (1093, 742, 58)]
RECTS = [(360, 404, 278, 59), (1136, 348, 251, 58), (1419, 510, 287, 58), (386, 714, 242, 58), (1153, 714, 241, 58)]
# what no patch may be taken from: the platform's icon and title, the planet and its ring
PROTECT_BOX = (500, 0, 1290, 300)
PLANET = (850, 600, 300, 175)   # centre, radii of an ellipse round the planet and its ring
ORBIT = ('M1532 684 C1523 687 1502 696 1480 702 C1458 708 1438 713 1400 720 C1362 727 1297 736 1250 742 C1203 748 1162 752 1120 757 '
         'C1078 762 1040 767 1000 771 C960 776 920 781 880 784 C840 788 800 791 760 792 C720 794 680 794 640 793 C600 792 560 790 520 788 '
         'C480 786 437 783 400 779 C363 775 330 771 300 764 C270 757 243 745 220 737 C197 729 178 723 160 714 C142 705 122 693 110 682 '
         'C98 671 91 660 88 650 C85 640 90 628 93 620 C96 612 101 607 107 600 C113 593 120 587 128 580 C137 573 143 569 158 560 '
         'C173 551 200 536 220 526 C240 516 260 510 280 502 C300 495 320 487 340 481 C360 475 370 472 400 464 C430 456 480 443 520 433 '
         'C560 423 600 413 640 405 C680 397 720 391 760 385 C800 379 840 372 880 367 C920 362 960 358 1000 353 C1040 348 1080 341 1120 338 '
         'C1160 335 1200 335 1240 335 C1280 335 1327 337 1360 339 C1393 341 1416 344 1440 347 C1465 351 1489 355 1507 360 '
         'C1525 366 1537 373 1548 380 C1559 387 1566 393 1571 400 C1576 407 1577 413 1577 420 C1577 427 1576 433 1573 440 '
         'C1570 447 1566 453 1560 460 C1554 467 1546 473 1537 480 C1528 487 1528 489 1508 500 C1489 512 1455 532 1420 549 '
         'C1385 566 1330 588 1300 600 C1270 612 1260 615 1240 622 C1220 629 1200 635 1180 641 C1160 647 1140 653 1120 658 '
         'C1100 663 1080 666 1060 671 C1040 676 1017 682 1000 686 C983 691 967 696 960 698')


def orbit_points(step=40):
    nums = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', ORBIT)]
    p0 = (nums[0], nums[1])
    pts = [p0]
    for k in range(2, len(nums), 6):
        c1, c2, p1 = (nums[k], nums[k + 1]), (nums[k + 2], nums[k + 3]), (nums[k + 4], nums[k + 5])
        for i in range(1, step + 1):
            t = i / step
            a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
            pts.append((a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]))
        p0 = p1
    return pts


def mask_creators(grow=10):
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    for x, y, r in CIRCLES:
        d.ellipse((x - r - grow, y - r - grow, x + r + grow, y + r + grow), fill=255)
    for x, y, w, h in RECTS:
        d.rounded_rectangle((x - grow, y - grow, x + w + grow, y + h + grow), radius=14, fill=255)
    return np.array(m) > 0


def mask_orbit(width=26):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).line(orbit_points(), fill=255, width=width, joint='curve')
    return np.array(m) > 0


def mask_protect():
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.rectangle(PROTECT_BOX, fill=255)
    cx, cy, rx, ry = PLANET
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    return np.array(m) > 0


def _integral(b):
    return np.pad(b.astype(np.int32).cumsum(0).cumsum(1), ((1, 0), (1, 0)))


def _box(a, r, axis):
    n = a.shape[axis]
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis)
    return (np.take(c, range(2 * r + 1, n + 2 * r + 1), axis=axis) - np.take(c, range(0, n), axis=axis)) / (2 * r + 1)


def _blur(a, r):
    """about a gaussian of radius r: three box blurs each way (numpy)"""
    k = max(1, int(round(r * 0.9)))
    for _ in range(3):
        a = _box(_box(a, k, 0), k, 1)
    return a.astype(np.float32)


def pushpull(img, hole):
    """a smooth fill of the hole: the known colours pulled down a pyramid and pushed back up into it"""
    w = (~hole).astype(np.float32)
    levels = []
    a, m = img * w[..., None], w
    while min(m.shape) > 4:
        levels.append((a, m))
        h2, w2 = m.shape[0] // 2 * 2, m.shape[1] // 2 * 2
        a = a[:h2, :w2].reshape(h2 // 2, 2, w2 // 2, 2, 3).sum((1, 3))
        m = m[:h2, :w2].reshape(h2 // 2, 2, w2 // 2, 2).sum((1, 3))
    col = a / np.maximum(m, 1e-6)[..., None]
    for a, m in reversed(levels):
        up = np.stack([np.array(Image.fromarray(col[..., c].astype(np.float32), 'F').resize((m.shape[1], m.shape[0]), Image.BILINEAR)) for c in range(3)], -1)
        known = a / np.maximum(m, 1e-6)[..., None]
        k = np.clip(m, 0, 1)[..., None]
        col = known * k + up * (1 - k)
    return col


def fill(img, hole, avoid, tile=48, reach=360, step=8):
    """fill `hole` (bool HxW) in img (float HxWx3): a smooth base (push-pull) plus the nebula's own grain, taken in
    overlapping, softly weighted tiles from clean places nearby whose grain at the hole's edge matches best"""
    base = pushpull(img, hole)
    low = _blur(img, 5)
    detail = img - low
    forbidden = hole | avoid
    I = _integral(forbidden)
    acc = np.zeros_like(img)
    wsum = np.zeros(hole.shape, np.float32)
    win = np.outer(np.hanning(tile + 2)[1:-1], np.hanning(tile + 2)[1:-1]).astype(np.float32) + 1e-3
    offs = [(dx, dy) for dy in range(-reach // 3, reach // 3 + 1, step) for dx in range(-reach, reach + 1, step)
            if abs(dx) >= tile or abs(dy) >= tile]
    grown = np.array(Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    ys, xs = np.where(grown)
    if not len(ys):
        return img
    half = tile // 2
    for ty in range(max(0, ys.min() - half), min(H - tile, ys.max()) + 1, half):
        for tx in range(max(0, xs.min() - half), min(W - tile, xs.max()) + 1, half):
            if not grown[ty:ty + tile, tx:tx + tile].any():
                continue
            tgt = detail[ty:ty + tile, tx:tx + tile]
            known = ~hole[ty:ty + tile, tx:tx + tile]
            lowt = base[ty:ty + tile, tx:tx + tile]
            best, bc = None, 1e18
            for dx, dy in offs:
                sx, sy = tx + dx, ty + dy
                if sx < 0 or sy < 0 or sx + tile > W or sy + tile > H:
                    continue
                if I[sy + tile, sx + tile] - I[sy, sx + tile] - I[sy + tile, sx] + I[sy, sx]:
                    continue
                c = 0.0
                if known.any():
                    c += float(np.abs(detail[sy:sy + tile, sx:sx + tile] - tgt)[known].mean())
                c += 0.35 * float(np.abs(low[sy:sy + tile, sx:sx + tile] - lowt).mean())   # a donor of like brightness
                c += 0.004 * (abs(dx) + abs(dy))
                if c < bc:
                    bc, best = c, (dx, dy)
            if best is None:
                continue
            dx, dy = best
            acc[ty:ty + tile, tx:tx + tile] += detail[ty + dy:ty + dy + tile, tx + dx:tx + dx + tile] * win[..., None]
            wsum[ty:ty + tile, tx:tx + tile] += win
    tex = acc / np.maximum(wsum, 1e-6)[..., None]
    filled = base + tex
    a = Image.fromarray((hole * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3))
    a = np.maximum(np.array(a, dtype=np.float32) / 255, hole.astype(np.float32))[..., None]
    return img * (1 - a) + filled * a


def clean(im, orbit_too):
    """im: the design's picture (RGB). Without its creators; with orbit_too, without its orbit as well."""
    a = np.asarray(im, dtype=np.float32)
    creators = mask_creators()
    protect = mask_protect()
    hole = creators.copy()
    if orbit_too:
        hole |= mask_orbit()
    out = fill(a, hole, protect | mask_orbit(34) | creators)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
