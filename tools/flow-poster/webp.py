"""The stills shot by shoot.cjs, to webp for the site (site/assets/flow/)."""
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'flow')
for name in ('wide', 'square'):
    im = Image.open(os.path.join(HERE, name + '.png')).convert('RGB')
    im.save(os.path.join(OUT, 'poster-%s.webp' % name), quality=82, method=6)
    print(name, im.size, os.path.getsize(os.path.join(OUT, 'poster-%s.webp' % name)))
