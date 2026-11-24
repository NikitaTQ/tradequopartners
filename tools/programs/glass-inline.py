"""/programs/: the three cards' glass textures (site/assets/programs/glass-1..3.webp, ~6 KB each) written into the
cards' inline script (tools/i18n/partials/prog-cards.html, between the markers TQ-GLASS) as data URIs, so the glass is
drawn with the page's first paint (as files it came a moment later: the cards showed plain grey first).
Run after changing a texture:  python3 tools/programs/glass-inline.py && python3 tools/build-i18n.py"""
import base64, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
uris = ["'data:image/webp;base64,%s'" % base64.b64encode(open(os.path.join(ROOT, 'site', 'assets', 'programs', 'glass-%d.webp' % i), 'rb').read()).decode() for i in (1, 2, 3)]
p = os.path.join(ROOT, 'tools', 'i18n', 'partials', 'prog-cards.html')
s = open(p, encoding='utf-8').read()
s, n = re.subn(r'/\*TQ-GLASS\*/.*?/\*/TQ-GLASS\*/', lambda m: '/*TQ-GLASS*/[' + ', '.join(uris) + ']/*/TQ-GLASS*/', s, flags=re.S)
assert n == 1
open(p, 'w', encoding='utf-8').write(s)
print('inlined', sum(len(u) for u in uris), 'bytes')
