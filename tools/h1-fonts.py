#!/usr/bin/env python3
"""Display faces for the headings (the site's font scheme: Syncopate 700 for the H1 and the section headings,
Inter for the rest).

Syncopate has Latin letters only, and no Romanian Ș, so the other languages get a look-alike wide display face.
Every file is a Google Fonts subset holding only the characters of the headings (the `text=` parameter, capitals
where the CSS sets capitals). Two files per face, both in site/assets/fonts/h1/:
  <face>.woff2      the H1s (class tq-h1) — small, preloaded on every page;
  <face>-h2.woff2   the section headings (class tq-h2) — loaded when one is drawn.
The headings are found in the templates (tools/i18n/*.html, partials, site/404.html) by their class; their text is
the strings of each language (English where a translation is missing) plus any literal text in the markup.
Run this again whenever a heading changes in any language: it fetches the subsets anew and stops if a face lacks
a letter.

    python3 tools/h1-fonts.py

Needs network access and fontTools (pip install fonttools). All faces are SIL Open Font License.
"""
import glob, html, json, os, re, subprocess, sys, tempfile, urllib.parse

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, 'tools', 'i18n')
OUT = os.path.join(ROOT, 'site', 'assets', 'fonts', 'h1')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

# file stem: (Google family, weight, languages, capitals?) — keep in step with the html:lang() rules in site.css
FACES = {
    'syncopate':       ('Syncopate', 700, ['en', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'tr', 'id'], True),
    'unbounded':       ('Unbounded', 700, ['uk', 'vi', 'ro'], True),
    'reem-kufi':       ('Reem Kufi', 700, ['ar'], False),
    'prompt':          ('Prompt', 700, ['th'], False),
    'dela-gothic-one': ('Dela Gothic One', 400, ['ja'], False),
    'black-han-sans':  ('Black Han Sans', 400, ['ko'], False),
    'zcool-qingke-sc': ('ZCOOL QingKe HuangYou', 400, ['zh-hans'], False),
    'noto-sans-tc':    ('Noto Sans TC', 900, ['zh-hant'], False),   # ZCOOL QingKe lacks 眾
}
TEMPLATES = glob.glob(os.path.join(I18N, '*.html')) + glob.glob(os.path.join(I18N, 'partials', '*.html')) + [os.path.join(ROOT, 'site', '404.html')]


def headings(cls):
    """(file, inner markup) of every heading with this class"""
    out = []
    for f in TEMPLATES:
        src = open(f, encoding='utf-8').read()
        src = re.sub(r'<style.*?</style>', '', src, flags=re.S)
        for m in re.finditer(r'<(h[1-6])\b[^>]*\bclass="[^"]*\b%s\b[^"]*"[^>]*>(.*?)</\1>' % cls, src, re.S):
            out.append((f, m.group(2)))
    return out


def strings(lang):
    d = {}
    for f in [os.path.join(I18N, 'strings', 'en.json')] + glob.glob(os.path.join(I18N, 'strings', '*', 'en.json')):
        d.update(json.load(open(f, encoding='utf-8')))
    for f in [os.path.join(I18N, 'strings', lang + '.json')] + glob.glob(os.path.join(I18N, 'strings', '*', lang + '.json')):
        if os.path.exists(f):
            d.update(json.load(open(f, encoding='utf-8')))
    return d


def text_of(cls, lang):
    S, text = strings(lang), ''
    for f, inner in headings(cls):
        if f.endswith('404.html') and lang != 'en':
            continue   # the 404 page is English only
        t = re.sub(r'{{\s*([\w.-]+)\s*}}', lambda m: S.get(m.group(1), ''), inner)
        text += ' ' + html.unescape(re.sub(r'<[^>]+>', '', t))
    return text


def fetch(url):
    return subprocess.run(['curl', '-fsS', '-A', UA, url], check=True, capture_output=True).stdout


def subset(family, weight, chars):
    css = fetch('https://fonts.googleapis.com/css2?family=%s:wght@%d&text=%s&display=swap'
                % (family.replace(' ', '+'), weight, urllib.parse.quote(chars))).decode()
    data = b''.join(fetch(u) for u in re.findall(r'url\((https://[^)]+)\)', css)[:1])
    with tempfile.NamedTemporaryFile(suffix='.woff2') as tmp:
        tmp.write(data)
        tmp.flush()
        cmap = TTFont(tmp.name).getBestCmap() or {}
    return data, ''.join(c for c in chars if ord(c) not in cmap and not c.isspace())


def main():
    os.makedirs(OUT, exist_ok=True)
    bad = False
    for stem, (family, weight, langs, caps) in FACES.items():
        for cls, name in (('tq-h1', stem + '.woff2'), ('tq-h2', stem + '-h2.woff2')):
            text = ''.join(text_of(cls, l) for l in langs)
            if caps:
                text = text.upper() + ('İ' if 'tr' in langs else '')   # CSS capitalises a Turkish i as İ
            chars = ''.join(sorted(set(text) - {'\n', '\t'}))
            data, missing = subset(family, weight, chars)
            if missing:
                bad = True
                print('%-24s %-22s MISSING %s (not written)' % (name, family, missing))
                continue
            with open(os.path.join(OUT, name), 'wb') as f:
                f.write(data)
            print('%-24s %-22s %6d bytes, %3d characters (%s)' % (name, family, len(data), len(chars), ' '.join(langs)))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
