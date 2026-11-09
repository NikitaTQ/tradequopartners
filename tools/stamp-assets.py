#!/usr/bin/env python3
"""Add a content hash (?v=...) to local CSS/JS/embed links in the site's pages.

Everything under /assets, /embeds and /vendor is cached for a year
(netlify.toml); a new hash gives every changed file a new URL, so nobody gets
stuck with an old landing.js against a new index.html. Fonts referenced from
site.css and vendor files imported from JS are not stamped: fonts keep their
names only while unchanged, vendor folders carry the library version. Fonts named in the pages
and embeds themselves are stamped: url(...woff2) in their <style> blocks (inlined CSS, per-language
faces, an embed's Inter) and font preloads, with the same hash, so a preload and its @font-face
stay one request.
It also inlines the stylesheets of the translated pages (see inline_css), without comments.
Run after editing anything in site/assets/ or site/embeds/:

    python3 tools/stamp-assets.py
"""
import hashlib
import os
import re
from urllib.parse import urlsplit, parse_qsl, urlencode

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
ATTR = re.compile(r'''((?:href|src|data-src|srcset|poster)=")([^"#]+\.(?:css|js|html|png|webp|svg|jpg|mp4|woff2)(?:\?[^"#]*)?)(")''')
FONT_URL = re.compile(r'''(url\()([^)'"#]+\.woff2(?:\?[^)'"#]*)?)(\))''')


def digest(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()[:10]


def stamp(page):
    base = os.path.dirname(page)
    html = open(page, encoding='utf-8').read()

    def repl(m):
        url = m.group(2)
        parts = urlsplit(url)
        if parts.scheme or parts.netloc:
            return m.group(0)
        local = os.path.join(SITE, parts.path.lstrip('/')) if parts.path.startswith('/') else os.path.join(base, parts.path)
        if not os.path.isfile(local) or os.path.abspath(local) == os.path.abspath(page):
            return m.group(0)
        query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != 'v']
        query.append(('v', digest(local)))
        return m.group(1) + parts.path + '?' + urlencode(query) + m.group(3)

    out = ATTR.sub(repl, html)
    out = FONT_URL.sub(repl, out)
    if out != html:
        with open(page, 'w', encoding='utf-8') as f:
            f.write(out)
        print('stamped', os.path.relpath(page, ROOT))


# Translated pages inline their stylesheets (one less render-blocking request on the
# first visit). A page opts in with <link rel="stylesheet" href="…assets/css/NAME.css" data-inline>;
# the inlined copy is <style id="NAME-css" data-prefix="…"> and is refreshed on every run.
def inline_css(page):
    html = open(page, encoding='utf-8').read()

    def block(prefix, name):
        css = open(os.path.join(SITE, 'assets', 'css', name + '.css'), encoding='utf-8').read()
        css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)                  # comments stay in the source only
        css = re.sub(r'\n\s*\n+', '\n', css)
        body = css.replace('url(../fonts/', 'url(%sassets/fonts/' % prefix).replace('</style', '<\\/style')
        return '<style id="%s-css" data-prefix="%s">\n%s\n</style>' % (name, prefix, body.strip())
    out = re.sub(r'<link rel="stylesheet" href="([./]*)assets/css/([a-z-]+)\.css[^"]*" data-inline>', lambda m: block(m.group(1), m.group(2)), html)
    out = re.sub(r'<style id="([a-z-]+)-css" data-prefix="([./]*)">.*?</style>', lambda m: block(m.group(2), m.group(1)), out, flags=re.S)
    if out != html:
        with open(page, 'w', encoding='utf-8') as f:
            f.write(out)
        print('inlined css into', os.path.relpath(page, ROOT))

# Embeds first: stamping changes their content, and the pages link them by hash.
embeds = os.path.join(SITE, 'embeds')
for name in sorted(os.listdir(embeds)):
    if name.endswith('.html'):
        stamp(os.path.join(embeds, name))
for dirpath, dirnames, filenames in os.walk(SITE):
    dirnames[:] = [d for d in dirnames if d not in ('embeds', 'vendor')]
    for name in filenames:
        if name.endswith('.html'):
            inline_css(os.path.join(dirpath, name))
            stamp(os.path.join(dirpath, name))
