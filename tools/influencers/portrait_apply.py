"""Write the phone card's geometry (tools/influencers/portrait.json, from portrait.py) into the page: the plates' places
(--ml/--mt/--mw/--mh in the template), the orbit's mask and view on phones (#tqHideM, data-view-m), the phone block of
influencers.css (.inf-orbit, the masks and centres of the layers) and GEO.phone in orbit.js.
Run after portrait.py:  python3 tools/influencers/portrait_apply.py"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
g = json.load(open(os.path.join(HERE, 'portrait.json'), encoding='utf-8'))
CX0, K, CW, CH, D = g['CX0'], g['K'], g['CW'], g['CH'], g['D']
X = lambda x: (x - CX0) * K / CW * 100          # x in the design's 1774 picture -> % across the card
Y = lambda y: y * K / CH * 100
SX = lambda w: w * K / CW * 100                  # a width in the picture -> % of the card
SY = lambda h: h * K / CH * 100
f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
PX, PY = X(850), Y(600)                          # the planet
plates = {p[0]: p[1:] for p in g['plates']}


def rw(path, fn):
    p = os.path.join(ROOT, path)
    s = open(p, encoding='utf-8').read()
    t = fn(s)
    if t == s:
        print('unchanged:', path)
    open(p, 'w', encoding='utf-8').write(t)


def one(pattern, repl, s, flags=0):
    t, n = re.subn(pattern, repl, s, flags=flags)
    if n != 1:
        sys.exit('%d x %s' % (n, pattern[:70]))
    return t


# ---- template ----
ORDER = ['Catalyst', 'Pablo', 'Kingdom', 'Dominguero', 'Milionário']   # the plates' order in the template (the design's)


def tpl(s):
    spans = list(re.finditer(r'(class="inf-orbit__plate" style="--l: [^;]+; --t: [^;]+; --w: [^;]+; --h: [^;]+; )--ml: [^;]+; --mt: [^;]+; --mw: [^;]+; --mh: [^;]+;"', s))
    assert len(spans) == 5
    out, last = [], 0
    for m, name in zip(spans, ORDER):
        x0, y0, x1, y1 = plates[name]
        out.append(s[last:m.start()])
        out.append(m.group(1) + '--ml: %s%%; --mt: %s%%; --mw: %s%%; --mh: %s%%;"' % (f(x0 / CW * 100), f(y0 / CH * 100), f((x1 - x0) / CW * 100), f((y1 - y0) / CH * 100)))
        last = m.end()
    s = ''.join(out) + s[last:]
    s = one(r'data-view-m="[^"]*"', 'data-view-m="%d 0 %s %s"' % (CX0, f(CW / K), f(CH / K)), s)
    shapes = ['<circle cx="%s" cy="%s" r="%s"/>' % (f(CX0 + c[0] / K), f(c[1] / K), f((D / 2 + 6) / K)) for _, c in g['creators']]
    shapes += ['<rect x="%s" y="%s" width="%s" height="%s" rx="10"/>' % (f(CX0 + (x0 - 6) / K), f((y0 - 6) / K), f((x1 - x0 + 12) / K), f((y1 - y0 + 12) / K))
               for _, x0, y0, x1, y1 in g['plates']]
    s = one(r'(<mask id="tqHideM"[^>]*>.*?<g fill="#000">).*?(</g></mask>)', lambda m: m.group(1) + ''.join(shapes) + m.group(2), s, re.S)
    return s


rw('tools/i18n/influencers.html', tpl)

# ---- CSS: the phone block of the creators section ----
css_block = '''/* phones: the tall card (tools/influencers/portrait.py, %(cw)d x %(ch)d): the scene closer, the creators along its orbit,
   a nebula of its own under it; one picture per platform. The layers' masks and centres in its frame (the planet at
   %(px)s%% %(py)s%%); the switch over its foot, a size up. Written by tools/influencers/portrait_apply.py. */
@media (max-width: 640px) {
  .inf-orbit__stage { aspect-ratio: %(cw)d / %(ch)d; }
  .inf-orbit__spacer, .inf-orbit__group img.inf-orbit__ext { display: none; }
  .inf-orbit__group { height: 100%%; }
  .inf-orbit__group img { height: 100%%; }
  .inf-orbit__drift, .inf-orbit__planet { transform-origin: %(px)s%% %(py)s%%; }
  .inf-orbit__icon { -webkit-mask-image: radial-gradient(ellipse %(irx)s%% %(iry)s%% at %(ix)s%% %(iy)s%%, #000 72%%, transparent 100%%); mask-image: radial-gradient(ellipse %(irx)s%% %(iry)s%% at %(ix)s%% %(iy)s%%, #000 72%%, transparent 100%%); }
  .inf-orbit__planet { -webkit-mask-image: radial-gradient(ellipse %(prx)s%% %(pry)s%% at %(px)s%% %(py)s%%, #000 60%%, transparent 100%%); mask-image: radial-gradient(ellipse %(prx)s%% %(pry)s%% at %(px)s%% %(py)s%%, #000 60%%, transparent 100%%); }
  .inf-orbit__edge { -webkit-mask-image: radial-gradient(circle at %(px)s%% %(py)s%%, transparent calc(var(--r) - 280px), #000 calc(var(--r) - 110px), transparent var(--r));
    mask-image: radial-gradient(circle at %(px)s%% %(py)s%%, transparent calc(var(--r) - 280px), #000 calc(var(--r) - 110px), transparent var(--r)); }
  .inf-orbit__flash { background: radial-gradient(circle at %(px)s%% %(py)s%%, rgba(255,255,255,.95) 0%%, rgba(255,255,255,.35) 14%%, rgba(255,255,255,0) 38%%); }
  .inf-orbit__streak { left: %(sl)s%%; top: %(st)s%%; width: %(sw)s%%; height: %(sh)s%%; }
  .inf-orbit__plate { left: var(--ml); top: var(--mt); width: var(--mw); height: var(--mh); border-radius: 5px; }
  .inf-orbit__bar { bottom: 14px; }
  .inf-orbit__bar button { height: 36px; padding: 0 16px; font-size: 13px; }
}
''' % dict(cw=CW, ch=CH, px=f(PX), py=f(PY), irx=f(SX(443.5)), iry=f(SY(239.5)), ix=f(X(885.2)), iy=f(Y(141.9)),
           prx=f(SX(266.1)), pry=f(SY(186.3)), sl=f(X(629.8)), st=f(Y(204)), sw=f(SX(8)), sh=f(SY(84.3)))
rw('site/assets/css/influencers.css', lambda s: one(r'/\* phones: the tall card .*?\n\}\n', lambda m: css_block, s, re.S))

# ---- JS ----
js = ("    phone: { hole: 'ellipse %s%% %s%% at %s%% %s%%', planet: [%.4f, %.4f], reveal: '%s%% %s%%', reach: 1,\n"
      "      title: ['inset(%s%% %s%% %s%% %s%%)', 'inset(%s%% %s%% %s%% %s%%)'], streak: ['%s%%', '%s%%'] },"
      % (f(SX(443.5)), f(SY(239.5)), f(X(885.2)), f(Y(141.9)), PX / 100, PY / 100, f(PX), f(PY),
         f(Y(214.65)), f(100 - X(629.77)), f(100 - Y(276.74)), f(X(629.77)),
         f(Y(214.65)), f(100 - X(1140.7)), f(100 - Y(276.74)), f(X(629.77)), f(X(629.77)), f(X(1140.7))))
rw('site/assets/js/orbit.js', lambda s: one(r"    phone: \{ hole: .*?streak: \[[^\]]*\] \},", lambda m: js, s, re.S))
rw('site/assets/js/orbit.js', lambda s: re.sub(r"phones the tall card's \(tools/influencers/portrait\.py: the picture's x \d+\.\.\d+\n     at [\d.]+ times, on a card of \d+ x \d+\)",
                                             "phones the tall card's (tools/influencers/portrait.py: the picture's x %d..%d\n     at %s times, on a card of %d x %d)" % (CX0, round(CX0 + CW / K), f(K), CW, CH), s))
print('ok: planet %s%% %s%%' % (f(PX), f(PY)))
