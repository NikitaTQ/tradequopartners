"""Run: python3 tools/compare/make.py  (numpy + Pillow; writes site/assets/compare/<key>.webp)
The six small icons of the TradeQuo column of the comparison block (the owner's design: design.webp, phone:
design-phone.png; November 2026): cut out of the design round their centres, the card's lilac glass divided out so
the background is white (the page lays them on with mix-blend-mode: multiply, so only the icon shows)."""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'compare')
os.makedirs(OUT, exist_ok=True)
im = np.asarray(Image.open(os.path.join(HERE, 'design.webp')).convert('RGB')).astype(np.float64)
BG = np.array([242.0, 235.0, 247.0])
H = 34                                     # half the square
for key, cx, cy in [('tiers', 925, 266), ('share', 926, 355), ('shield', 925, 445), ('daily', 927, 530), ('tv', 930, 617), ('trips', 927, 717)]:
    a = im[cy - H:cy + H, cx - H:cx + H]
    w = np.clip(a * 255.0 / BG, 0, 255)
    Image.fromarray(w.round().astype(np.uint8)).save(os.path.join(OUT, key + '.webp'), quality=92, method=6)
    print(key, os.path.getsize(os.path.join(OUT, key + '.webp')))
