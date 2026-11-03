#!/usr/bin/env python3
"""Build the landing page in every language.

    tools/i18n/landing.html          template ({{key}} = text, {{@key}} = attribute value)
    tools/i18n/strings/<code>.json   copy per language (en.json is the master)
    tools/i18n/languages.json        URL path, hreflang, switcher name, direction, script
    tools/i18n/font-files.json       extra font subsets for Cyrillic / Vietnamese / Arabic / Thai

Writes site/index.html (English) and site/<path>/index.html for every other language,
site/embeds/i18n.js (captions for the 3D embeds) and site/sitemap.xml, then runs
stamp-assets.py. Missing keys fall back to English and are reported.

    python3 tools/build-i18n.py
"""
import html
import json
import os
import re
import runpy
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
I18N = os.path.join(ROOT, 'tools', 'i18n')
DOMAIN = 'https://tradequopartners.com'

template = open(os.path.join(I18N, 'landing.html'), encoding='utf-8').read()
languages = json.load(open(os.path.join(I18N, 'languages.json'), encoding='utf-8'))
fonts = json.load(open(os.path.join(I18N, 'font-files.json'), encoding='utf-8'))
caption_fonts_path = os.path.join(I18N, 'caption-fonts.json')
caption_fonts = json.load(open(caption_fonts_path, encoding='utf-8')) if os.path.exists(caption_fonts_path) else {}
strings = {}
for lang in languages:
    path = os.path.join(I18N, 'strings', lang['code'] + '.json')
    if os.path.exists(path):
        strings[lang['code']] = json.load(open(path, encoding='utf-8'))
EN = strings['en']

# ---- inline tokens allowed in copy ---------------------------------------------
PAIRED = {
    'red': ('<span style="color: #e7131b;">', '</span>'),
    'privacy': ('<a href="#" style="color:#c8141b;">', '</a>'),
    'terms': ('<a href="#" style="color:#c8141b;">', '</a>'),
    'lots': ('<span data-inv-lots>', '</span>'),
}
SINGLE = {
    'br': '<br>',
    'brd': '<br class="br-desk">',
    'year': '<span data-inv-money="" data-mul="12"></span>',
    'day': '<span data-inv-money="" data-mul="0.0333333333"></span>',
}
TOKEN = re.compile(r'<(/?)([a-z]+)(/?)>')


def render_text(value):
    out, pos = [], 0
    for m in TOKEN.finditer(value):
        out.append(html.escape(value[pos:m.start()], quote=False))
        closing, name, selfclosing = m.group(1), m.group(2), m.group(3)
        if selfclosing and name in SINGLE:
            out.append(SINGLE[name])
        elif name in PAIRED:
            out.append(PAIRED[name][1 if closing else 0])
        else:
            raise ValueError('unknown token %r in %r' % (m.group(0), value))
        pos = m.end()
    out.append(html.escape(value[pos:], quote=False))
    return ''.join(out)


def render_attr(value):
    return html.escape(TOKEN.sub('', value), quote=True)


# ---- per-language extras ----------------------------------------------------------
def face(family, f, root, weight=None):
    return ("@font-face { font-family: '%s'; font-style: normal; font-weight: %s; font-display: swap; "
            "src: url(%sassets/fonts/intl/%s) format('woff2'); unicode-range: %s; }"
            % (family, weight or f['weight'], root, f['file'], f['range']))


def font_css(script, root):
    """Fonts and type rules for scripts DM Sans / Fragment Mono don't cover. Declared after
    the base faces, so for the same family these win for their unicode ranges."""
    rules, preload = [], []
    by = lambda font, subset=None: [f for f in fonts if f['font'] == font and (subset is None or f['subset'] == subset)]
    if script in ('cyrillic', 'vietnamese'):
        # whole page in Manrope / IBM Plex Mono: mixing faces inside a word looks broken
        rules += [face('DM Sans', f, root) for f in by('Manrope')]
        rules += [face('Fragment Mono', f, root) for f in by('IBM-Plex-Mono')]
        subs = ('cyrillic', 'cyrillic-ext') if script == 'cyrillic' else ('vietnamese',)
        rules += [face('Cormorant Garamond', f, root) for f in by('Cormorant-Garamond') if f['subset'] in subs]
        preload = [f['file'] for f in by('Manrope') if f['subset'] in ('latin', subs[0])]
    elif script == 'arabic':
        for f in by('IBM-Plex-Sans-Arabic'):
            rules.append(face('DM Sans', f, root))
        regular = [f for f in by('IBM-Plex-Sans-Arabic') if f['weight'] == '400'][0]
        medium = [f for f in by('IBM-Plex-Sans-Arabic') if f['weight'] == '500'][0]
        rules += [face('Fragment Mono', regular, root), face('Cormorant Garamond', medium, root, '500 600')]
        preload = [f['file'] for f in by('IBM-Plex-Sans-Arabic') if f['weight'] in ('400', '700')]
    elif script == 'thai':
        thai = by('Noto-Sans-Thai', 'thai')[0]
        rules += [face('DM Sans', thai, root), face('Fragment Mono', thai, root), face('Cormorant Garamond', thai, root)]
        preload = [thai['file']]
    if script in ('arabic', 'thai', 'cjk'):
        # tracking breaks Arabic joining and crowds CJK/Thai; tight Latin leading clips their glyphs
        rules.append('* { letter-spacing: 0 !important; }')
        rules.append('h1, h2 { line-height: 1.2 !important; }')
    if script == 'cjk':
        rules.append('h1, h2, h3, p { line-break: strict; }')
    if not rules:
        return '', ''
    css = '\n<style id="i18n-fonts">\n' + '\n'.join(rules) + '\n</style>'
    pre = ''.join('\n<link rel="preload" href="%sassets/fonts/intl/%s" as="font" type="font/woff2" crossorigin>' % (root, f) for f in preload)
    return css, pre


def url_of(lang):
    return DOMAIN + '/' + (lang['path'] + '/' if lang['path'] else '')


def href_from(cur, target):
    up = '../' if cur['path'] else ''
    return up + (target['path'] + '/' if target['path'] else '') or './'


SHORT = {'zh-hans': '简体', 'zh-hant': '繁體'}


def switcher(cur, s):
    items = []
    for t in languages:
        current = ' aria-current="true"' if t['code'] == cur['code'] else ''
        items.append('<li><a href="%s" hreflang="%s" lang="%s"%s>%s</a></li>'
                     % (href_from(cur, t) or './', t['hreflang'], t.get('html', t['code']), current, html.escape(t['name'])))
    code = SHORT.get(cur['code'], cur['code'].upper())
    return ('<div class="tq-lang" data-lang>'
            '<button type="button" class="tq-lang__btn" aria-haspopup="true" aria-expanded="false" aria-label="%s: %s">'
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'
            '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z"></path></svg>'
            '<span class="tq-lang__code">%s</span>'
            '<svg class="tq-lang__chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>'
            '</button>'
            '<ul class="tq-lang__menu" hidden>%s</ul></div>'
            % (render_attr(s('lang.label')), html.escape(cur['name']), html.escape(code), ''.join(items)))


# ---- render --------------------------------------------------------------------------
missing_report = {}
for lang in languages:
    code = lang['code']
    S = strings.get(code)
    if S is None:
        print('skip %s: no strings yet' % code)
        continue
    missing = [k for k in EN if k not in S]
    if missing:
        missing_report[code] = missing

    swap = {'dock.l': 'dock.r', 'dock.r': 'dock.l'} if lang.get('dir') == 'rtl' else {}

    def s(key, S=S):
        key = swap.get(key, key)   # RTL: the split CTA keeps its LTR mechanics, so its halves trade places
        if key in S:
            return S[key]
        if key in EN:
            return EN[key]
        raise KeyError(key)

    root = '../' if lang['path'] else ''
    faces, preload = font_css(lang.get('script'), root)
    hreflang = '\n'.join('<link rel="alternate" hreflang="%s" href="%s">' % (t['hreflang'], url_of(t)) for t in languages)
    hreflang += '\n<link rel="alternate" hreflang="x-default" href="%s/">' % DOMAIN
    system = {
        'lang': lang.get('html', code), 'dir': lang.get('dir', 'ltr'), 'root': root,
        'canonical': url_of(lang), 'hreflang': hreflang, 'ogLocale': lang['ogLocale'],
        'fontFaces': faces, 'fontPreload': preload, 'langSwitcher': switcher(lang, s),
        'embedQuery': '' if code == 'en' else '?lang=' + code,
    }

    def fill(m):
        attr, key = m.group(1) == '@', m.group(2)
        if key in system:
            return system[key]
        return render_attr(s(key)) if attr else render_text(s(key))

    page = re.sub(r'\{\{(@?)([A-Za-z0-9_.-]+)\}\}', fill, template)
    assert '{{' not in page, page[page.index('{{'):][:80]
    out_dir = os.path.join(SITE, lang['path']) if lang['path'] else SITE
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    print('built', os.path.relpath(os.path.join(out_dir, 'index.html'), ROOT))

# ---- strings the embeds draw themselves ---------------------------------------------
embed = {}
for lang in languages:
    S = strings.get(lang['code'])
    if not S:
        continue
    embed[lang['code']] = {k[len('embed.'):]: S.get(k, EN[k]) for k in EN if k.startswith('embed.')}
    embed[lang['code']]['_script'] = lang.get('script', 'latin')
    embed[lang['code']]['_dir'] = lang.get('dir', 'ltr')
    css = font_css(lang.get('script'), '../')[0].replace('<style id="i18n-fonts">', '').replace('</style>', '').strip()
    # CJK captions: tiny Noto subsets (tools/make-caption-fonts.py) so poster and live scene match
    css += ''.join("\n@font-face { font-family: 'TQ CJK'; font-weight: 700; font-display: block; "
                   "src: url(../assets/fonts/intl/%s) format('woff2'); unicode-range: %s; }" % (f['file'], f['range'])
                   for f in caption_fonts.get(lang['code'], []))
    embed[lang['code']]['_fonts'] = css
with open(os.path.join(SITE, 'embeds', 'i18n.js'), 'w', encoding='utf-8') as f:
    f.write('/* Generated by tools/build-i18n.py — captions the 3D embeds draw themselves. */\n')
    f.write('window.TQ_I18N = ' + json.dumps(embed, ensure_ascii=False, indent=1) + ';\n')

# ---- sitemap ---------------------------------------------------------------------------
built = [l for l in languages if l['code'] in strings]
alts = ''.join('\n    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (t['hreflang'], url_of(t)) for t in built)
urls = ''.join('\n  <url>\n    <loc>%s</loc>%s\n  </url>' % (url_of(l), alts) for l in built)
with open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">%s\n</urlset>\n' % urls)

for code, keys in missing_report.items():
    print('WARNING %s: %d keys fall back to English: %s' % (code, len(keys), ', '.join(keys[:8])), file=sys.stderr)

runpy.run_path(os.path.join(ROOT, 'tools', 'stamp-assets.py'))
