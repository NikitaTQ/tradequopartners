"""IB Tools hero: light copies of the comparison picture (assets/ib/hero-vs.webp, its phone version hero-vs-m.webp),
800 / 520px wide, ~8 / 5 KB, written into partner.css as data URIs (between the markers TQ-VS-LQ): drawn under the
picture's place from the first paint, so the comparison (picture and the words over it) is there at once; the full
picture, preloaded, takes over when it is in (the class .is-in, set by the script in ibtools.html).
Run after changing the picture:  python3 tools/ib-hero/inline-vs.py && python3 tools/build-i18n.py"""
import base64, io, os, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')


def uri(name, w):
    im = Image.open(os.path.join(ROOT, 'site', 'assets', 'ib', name))
    b = io.BytesIO()
    im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(b, 'WEBP', quality=60, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


css = (".tq-ibvs::before { content: ''; position: absolute; inset: 0; pointer-events: none; mix-blend-mode: multiply; "
       "background: url(%s) 0 0 / 100%% 100%% no-repeat; }\n"
       "@media (max-width: 640px) { .tq-ibvs::before { background-image: url(%s); } }\n"
       ".tq-ibvs.is-in::before { display: none; }") % (uri('hero-vs.webp', 800), uri('hero-vs-m.webp', 520))
p = os.path.join(ROOT, 'site', 'assets', 'css', 'partner.css')
s = open(p, encoding='utf-8').read()
s, n = re.subn(r'/\*TQ-VS-LQ\*/.*?/\*/TQ-VS-LQ\*/', lambda m: '/*TQ-VS-LQ*/\n' + css + '\n/*/TQ-VS-LQ*/', s, flags=re.S)
assert n == 1, 'markers TQ-VS-LQ not found'
open(p, 'w', encoding='utf-8').write(s)
print('written', len(css), 'bytes')
