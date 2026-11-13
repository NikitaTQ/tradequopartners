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
It also inlines the stylesheets of the translated pages (see inline_css), without comments and without
the rules that cannot apply on that page (see used_css).
Run after editing anything in site/assets/ or site/embeds/:

    python3 tools/stamp-assets.py
"""
import hashlib
import os
import re
from urllib.parse import urlsplit, parse_qsl, urlencode

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
ATTR = re.compile(r'''((?:href|src|data-src|srcset|poster)=")([^"#]+\.(?:css|js|html|png|webp|svg|jpg|mp4|webm|woff2)(?:\?[^"#]*)?)(")''')
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


# ---- the rules a page can use -------------------------------------------------------------------
# site.css and partner.css hold the styles of every page. Inlined, each page keeps only the rules that can apply on it:
# a rule goes when one of its selectors' classes is on that page neither in the markup (class="…") nor in a script it
# loads (its own inline scripts and assets/js files: scripts add classes as they run, sometimes built from a prefix,
# 'tq-ibc__pill--' + kind). Classes inside :not(), :is(), :where() and :has() are not required (conservative), rules
# without classes, @font-face, @keyframes and @property always stay; @media / @supports / @container keep what of
# them stays. So nothing a page can show loses its style; what goes are the other pages' blocks.
CLASS_ATTR = re.compile(r'\bclass="([^"]*)"')
SCRIPT_SRC = re.compile(r'<script[^>]*\ssrc="[./]*(assets/js/[\w.-]+\.js)')
INLINE_SCRIPT = re.compile(r'<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>', re.S)
WORD = re.compile(r'[A-Za-z_][\w-]*')
PREFIX = re.compile(r'([A-Za-z_][\w-]*[-_])(?=[\'"`]|\$\{)')
CSS_CLASS = re.compile(r'\.(-?[_a-zA-Z][\w-]*)')
_js_cache = {}


def _page_vocabulary(html):
    """The classes a page can have: the markup's, and every word and class prefix of the scripts it runs."""
    have = set()
    for v in CLASS_ATTR.findall(html):
        have.update(v.split())
    js = [m for m in INLINE_SCRIPT.findall(html)]
    for src in SCRIPT_SRC.findall(html):
        path = os.path.join(SITE, src)
        if path not in _js_cache:
            _js_cache[path] = open(path, encoding='utf-8').read() if os.path.exists(path) else ''
        js.append(_js_cache[path])
    prefixes = set()
    for t in js:
        have.update(WORD.findall(t))
        prefixes.update(p for p in PREFIX.findall(t) if len(p) >= 4)
    return have, tuple(sorted(prefixes))


def _split(text, sep):
    """Split at top-level `sep` (not inside (), [] or quotes)."""
    out, depth, q, cur = [], 0, None, []
    for ch in text:
        if q:
            cur.append(ch)
            if ch == q:
                q = None
            continue
        if ch in '"\'':
            q = ch
        elif ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        elif ch == sep and depth == 0:
            out.append(''.join(cur)); cur = []
            continue
        cur.append(ch)
    out.append(''.join(cur))
    return out


def _required_classes(selector):
    s = re.sub(r'\[[^\]]*\]', '', selector)                               # attribute selectors
    for _ in range(4):                                                     # :not(…) :is(…) :where(…) :has(…), nested
        s = re.sub(r':(?:not|is|where|has|-webkit-any|-moz-any)\((?:[^()]|\([^()]*\))*\)', '', s)
    return CSS_CLASS.findall(s)


def _blocks(css):
    """Top-level statements: (prelude, body or None for `@x …;`), from text without comments."""
    i, n, out = 0, len(css), []
    while i < n:
        j, q, depth = i, None, 0
        while j < n:                                                       # the prelude, to `{` or `;`
            ch = css[j]
            if q:
                if ch == q: q = None
            elif ch in '"\'': q = ch
            elif ch == '(': depth += 1
            elif ch == ')': depth -= 1
            elif depth == 0 and ch in '{;': break
            j += 1
        prelude = css[i:j]
        if j >= n:
            if prelude.strip(): out.append((prelude, None))
            break
        if css[j] == ';':
            out.append((prelude + ';', None)); i = j + 1; continue
        k, level, q = j + 1, 1, None                                       # the body, to the matching `}`
        while k < n and level:
            ch = css[k]
            if q:
                if ch == q: q = None
            elif ch in '"\'': q = ch
            elif ch == '{': level += 1
            elif ch == '}': level -= 1
            k += 1
        out.append((prelude, css[j + 1:k - 1]))
        i = k
    return out


def used_css(css, html):
    have, prefixes = _page_vocabulary(html)

    def present(c):
        return c in have or any(c.startswith(p) for p in prefixes)

    def keep_rule(prelude):
        return any(all(present(c) for c in _required_classes(sel)) for sel in _split(prelude, ','))

    def walk(text):
        parts = []
        for prelude, body in _blocks(text):
            head = prelude.strip()
            if body is None:
                if head: parts.append(head)
            elif re.match(r'@(media|supports|container|layer)\b', head):
                inner = walk(body)
                if inner.strip(): parts.append(head + ' {\n' + inner + '\n}')
            elif head.startswith('@'):                                     # @font-face, @keyframes, @property, …
                parts.append(head + ' {' + body + '}')
            elif head and keep_rule(head):
                parts.append(head + ' {' + body + '}')
        return '\n'.join(parts)
    return walk(css)


# Translated pages inline their stylesheets (one less render-blocking request on the
# first visit). A page opts in with <link rel="stylesheet" href="…assets/css/NAME.css" data-inline>;
# the inlined copy is <style id="NAME-css" data-prefix="…"> and is refreshed on every run.
def inline_css(page):
    html = open(page, encoding='utf-8').read()

    def block(prefix, name):
        css = open(os.path.join(SITE, 'assets', 'css', name + '.css'), encoding='utf-8').read()
        css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)                  # comments stay in the source only
        css = used_css(css, re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.S))   # only what this page can use
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
