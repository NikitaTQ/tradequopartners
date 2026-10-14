#!/usr/bin/env python3
"""Add a content hash (?v=...) to local CSS/JS/embed links in the site's pages.

Everything under /assets, /embeds and /vendor is cached for a year
(netlify.toml); a new hash gives every changed file a new URL, so nobody gets
stuck with an old landing.js against a new index.html. Fonts referenced from
site.css and vendor files imported from JS are not stamped: fonts keep their
names only while unchanged, vendor folders carry the library version.
It also inlines site.css into the landing (see inline_css).
Run after editing anything in site/assets/ or site/embeds/:

    python3 tools/stamp-assets.py
"""
import hashlib
import os
import re
from urllib.parse import urlsplit, parse_qsl, urlencode

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
ATTR = re.compile(r'''((?:href|src|data-src|srcset)=")([^"#]+\.(?:css|js|html|png|webp|svg|jpg)(?:\?[^"#]*)?)(")''')


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
    if out != html:
        with open(page, 'w', encoding='utf-8') as f:
            f.write(out)
        print('stamped', os.path.relpath(page, ROOT))


# The landing inlines site.css: one less render-blocking request on the first
# visit. <style id="site-css"> is refreshed from the file on every run.
def inline_css():
    page = os.path.join(SITE, 'index.html')
    html = open(page, encoding='utf-8').read()
    css = open(os.path.join(SITE, 'assets', 'css', 'site.css'), encoding='utf-8').read()
    css = css.replace('url(../fonts/', 'url(assets/fonts/').replace('</style', '<\\/style')
    block = '<style id="site-css">\n' + css.strip() + '\n</style>'
    out = re.sub(r'<link rel="stylesheet" href="assets/css/site\.css[^"]*">', lambda m: block, html)
    out = re.sub(r'<style id="site-css">.*?</style>', lambda m: block, out, flags=re.S)
    if out != html:
        with open(page, 'w', encoding='utf-8') as f:
            f.write(out)
        print('inlined site.css into site/index.html')


inline_css()

# Embeds first: stamping changes their content, and the pages link them by hash.
embeds = os.path.join(SITE, 'embeds')
for name in sorted(os.listdir(embeds)):
    if name.endswith('.html'):
        stamp(os.path.join(embeds, name))
for dirpath, dirnames, filenames in os.walk(SITE):
    dirnames[:] = [d for d in dirnames if d not in ('embeds', 'vendor')]
    for name in filenames:
        if name.endswith('.html'):
            stamp(os.path.join(dirpath, name))
