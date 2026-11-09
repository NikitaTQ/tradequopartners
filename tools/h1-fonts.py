#!/usr/bin/env python3
"""Display faces for the H1 of every page (the site's font scheme: Syncopate 700 for the H1, Inter for the rest).

Syncopate has Latin letters only, and no Romanian Ș, so the other languages get a look-alike wide display face.
Every file is a Google Fonts subset holding only the characters of the H1s (the `text=` parameter, capitals where
the CSS sets capitals), a few KB each. Run this again whenever an H1 changes in any language (hero.h1, pp.hero.h1,
cp.earn.h1, mt.top.h1, or the 404 page): it fetches the subsets anew into site/assets/fonts/h1/ and stops if a face
lacks a letter.

    python3 tools/h1-fonts.py

Needs network access and fontTools (pip install fonttools). All faces are SIL Open Font License.
"""
import json, os, re, subprocess, sys, tempfile, urllib.parse

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'assets', 'fonts', 'h1')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

# file: (Google family, weight, languages, capitals?) — keep in step with the .tq-h1 rules in site.css
FACES = {
    'syncopate.woff2':       ('Syncopate', 700, ['en', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'tr', 'id'], True),
    'unbounded.woff2':       ('Unbounded', 700, ['uk', 'vi', 'ro'], True),
    'reem-kufi.woff2':       ('Reem Kufi', 700, ['ar'], False),
    'prompt.woff2':          ('Prompt', 700, ['th'], False),
    'dela-gothic-one.woff2': ('Dela Gothic One', 400, ['ja'], False),
    'black-han-sans.woff2':  ('Black Han Sans', 400, ['ko'], False),
    'zcool-qingke-sc.woff2': ('ZCOOL QingKe HuangYou', 400, ['zh-hans'], False),
    'noto-sans-tc.woff2':    ('Noto Sans TC', 900, ['zh-hant'], False),   # ZCOOL QingKe lacks 眾
}


# (strings file under tools/i18n/strings/, key) of each page's H1
H1S = [('', 'hero.h1'), ('programs', 'pp.hero.h1'), ('commission', 'cp.earn.h1'), ('marketing', 'mt.top.h1')]
PAGE_404 = 'This page doesn’t exist.'   # site/404.html, English only


def h1(lang):
    text = PAGE_404 if lang == 'en' else ''
    for folder, key in H1S:
        with open(os.path.join(ROOT, 'tools', 'i18n', 'strings', folder, lang + '.json'), encoding='utf-8') as f:
            text += ' ' + re.sub(r'<[^>]+>', '', json.load(f).get(key, ''))
    return text


def fetch(url):
    return subprocess.run(['curl', '-fsS', '-A', UA, url], check=True, capture_output=True).stdout


def main():
    os.makedirs(OUT, exist_ok=True)
    bad = False
    for name, (family, weight, langs, caps) in FACES.items():
        text = ''.join(h1(l) for l in langs)
        if caps:
            text = text.upper() + ('İ' if 'tr' in langs else '')   # CSS capitalises a Turkish i as İ
        chars = ''.join(sorted(set(text)))
        css = fetch('https://fonts.googleapis.com/css2?family=%s:wght@%d&text=%s&display=swap'
                    % (family.replace(' ', '+'), weight, urllib.parse.quote(chars))).decode()
        data = fetch(re.search(r'url\((https://[^)]+)\)', css).group(1))
        with tempfile.NamedTemporaryFile(suffix='.woff2') as tmp:
            tmp.write(data)
            tmp.flush()
            cmap = TTFont(tmp.name).getBestCmap() or {}
        missing = ''.join(c for c in chars if ord(c) not in cmap and not c.isspace())
        if missing:
            bad = True
            print('%-24s %-22s MISSING %s (not written)' % (name, family, missing))
            continue
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(data)
        print('%-24s %-22s %5d bytes, %d characters (%s)' % (name, family, len(data), len(chars), ' '.join(langs)))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
