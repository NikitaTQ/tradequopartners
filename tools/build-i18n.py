#!/usr/bin/env python3
"""Build the translated pages (landing, partner programs, commission plan, marketing tools) in every language.

    tools/i18n/<page>.html           templates ({{key}} = text, {{@key}} = attribute value,
                                     {{> name}} = tools/i18n/partials/name.html,
                                     {{faq:prefix:N}} = N FAQ cards from prefix.1.q / prefix.1.a …)
    tools/i18n/strings/<code>.json   landing copy + shared chrome (header, fan menu, footer); en.json is the master
    tools/i18n/strings/<page>/<code>.json   copy of the other pages (overrides/extends the above)
    tools/i18n/languages.json        URL path, hreflang, switcher name, direction, script
    tools/i18n/font-files.json       extra font subsets for Cyrillic / Vietnamese / Arabic / Thai

Writes site/[<lang>/][<slug>/]index.html for every page and language,
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

# Pages built from templates. slug '' is the landing; the others live under it, per language.
PAGES = [
    {'id': 'landing', 'template': 'landing.html', 'slug': ''},
    {'id': 'programs', 'template': 'programs.html', 'slug': 'programs', 'css': 'partner'},
    {'id': 'commission', 'template': 'commission.html', 'slug': 'partner-terms', 'css': 'partner'},   # was commission-plan (netlify.toml redirects)
    {'id': 'marketing', 'template': 'marketing.html', 'slug': 'marketing-tools', 'css': 'partner'},
]
# The site-map fan (bottom right): the translated partner pages.
FAN = [
    ('programs', 'home', 'programs/', 'fan.programs'),
    ('commission', 'home', 'partner-terms/', 'fan.commission'),
    ('marketing', 'home', 'marketing-tools/', 'fan.marketing'),
]
languages = json.load(open(os.path.join(I18N, 'languages.json'), encoding='utf-8'))
fonts = json.load(open(os.path.join(I18N, 'font-files.json'), encoding='utf-8'))
caption_fonts_path = os.path.join(I18N, 'caption-fonts.json')
caption_fonts = json.load(open(caption_fonts_path, encoding='utf-8')) if os.path.exists(caption_fonts_path) else {}
partials = {f[:-5]: open(os.path.join(I18N, 'partials', f), encoding='utf-8').read()
            for f in os.listdir(os.path.join(I18N, 'partials')) if f.endswith('.html')}


def load_strings(sub=''):
    out = {}
    for lang in languages:
        path = os.path.join(I18N, 'strings', sub, lang['code'] + '.json')
        if os.path.exists(path):
            out[lang['code']] = json.load(open(path, encoding='utf-8'))
    return out


strings = load_strings()
EN = strings['en']

# ---- inline tokens allowed in copy ---------------------------------------------
PAIRED = {
    'red': ('<span style="color: #e7131b;">', '</span>'),
    'privacy': ('<a href="#" style="color:#c8141b;">', '</a>'),
    'terms': ('<a href="#" style="color:#c8141b;">', '</a>'),
    'lots': ('<span data-inv-lots>', '</span>'),
    'rate': ('<span data-inv-rate>', '</span>'),
}
SINGLE = {
    'br': '<br>',
    'brd': '<br class="br-desk">',
    'year': '<span data-inv-money="" data-mul="12"></span>',
    'day': '<span data-inv-money="" data-mul="0.0333333333"></span>',
}
TOKEN = re.compile(r'<(/?)([a-z]+)(/?)>')


# Thai has no spaces; the browser breaks lines with a dictionary that doesn't know
# trading loanwords, so it can split them (ของส|เปรด). A word joiner between their
# base letters keeps them whole (never before a combining vowel/tone mark).
THAI_KEEP = ['คอมมิชชั่น', 'พาร์ทเนอร์', 'เทรดเดอร์', 'สเปรด', 'รีเบท', 'ล็อต', 'ทริป', 'เทรด']


def keep_thai(text):
    import unicodedata
    for w in THAI_KEEP:
        joined = ''.join(('\u2060' + c) if i and unicodedata.category(c) != 'Mn' else c for i, c in enumerate(w))
        text = text.replace(w, joined)
    return text


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
        # tracking breaks Arabic joining and crowds CJK/Thai; tight Latin leading clips their glyphs.
        # SVG text is left alone: it is only the fixed Latin lettering round the stamps.
        rules.append('*:not(svg *) { letter-spacing: 0 !important; }')
        rules.append('h1, h2 { line-height: 1.2 !important; }')
    if script == 'cjk':
        rules.append('h1, h2, h3, p { line-break: strict; }')
        rules.append('html:lang(ko) * { word-break: keep-all; }')   # Korean wraps between words, not syllables
    if not rules:
        return '', ''
    css = '\n<style id="i18n-fonts">\n' + '\n'.join(rules) + '\n</style>'
    pre = ''.join('\n<link rel="preload" href="%sassets/fonts/intl/%s" as="font" type="font/woff2" crossorigin>' % (root, f) for f in preload)
    return css, pre


def url_of(lang, slug=''):
    return DOMAIN + '/' + ''.join(part + '/' for part in (lang['path'], slug) if part)


def root_of(lang, slug=''):
    """Relative path from a page back to the site root."""
    return '../' * ((1 if lang['path'] else 0) + (1 if slug else 0))


def href_from(cur, target, slug=''):
    return (root_of(cur, slug) + ''.join(part + '/' for part in (target['path'], slug) if part)) or './'


SHORT = {'zh-hans': '简体', 'zh-hant': '繁體'}


def switcher(cur, s, slug=''):
    items = []
    for t in languages:
        current = ' aria-current="true"' if t['code'] == cur['code'] else ''
        items.append('<li><a href="%s" hreflang="%s" lang="%s"%s>%s</a></li>'
                     % (href_from(cur, t, slug), t['hreflang'], t.get('html', t['code']), current, html.escape(t['name'])))
    # Browser auto-translate stays allowed; this switch lets a visitor turn it off (landing.js startLang).
    items.append('<li class="tq-lang__opt"><button type="button" role="switch" aria-checked="true" data-translate-toggle>'
                 '<span>%s</span><span class="tq-lang__switch" aria-hidden="true"></span></button></li>'
                 % html.escape(s('lang.translate'), quote=False))
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


def fan_menu(home, root, page_id):
    """Veil + fan of page blades + knob (partials/fan.html, fan-blade.html). Numbers start at 02: the landing is 01."""
    blades = []
    for i, (pid, base, href, key) in enumerate(FAN):
        blades.append(partials['fan-blade']
                      .replace('{{i}}', str(i)).replace('{{ri}}', str(len(FAN) - 1 - i))
                      .replace('{{href}}', (home if base == 'home' else root) + href)
                      .replace('{{current}}', ' aria-current="page"' if pid == page_id else '')
                      .replace('{{num}}', '%02d' % (i + 2)).replace('{{key}}', key))
    return partials['fan'].replace('{{fanBlades}}', ''.join(blades)).replace('{{fanCount}}', str(len(FAN)))


FAQ_MACRO = re.compile(r'\{\{faq:([A-Za-z0-9_.-]+):(\d+)\}\}')


def faq_cards(prefix, count):
    out = []
    for i in range(1, count + 1):
        first = i == 1
        card = partials['faq-card']
        for k, v in {'{{q}}': '{{%s.%d.q}}' % (prefix, i), '{{a}}': '{{%s.%d.a}}' % (prefix, i),
                     '{{nn}}': '%02d' % i, '{{id}}': prefix.replace('.', '-') + '-%d' % i,
                     '{{open}}': 'true' if first else 'false', '{{rows}}': '1fr' if first else '0fr',
                     '{{rot}}': '180' if first else '0', '{{edge}}': '1' if first else '0'}.items():
            card = card.replace(k, v)
        out.append(card)
    return ''.join(out)


def expand(template):
    for _ in range(3):   # partials may include partials
        template = re.sub(r'\{\{> ([a-z0-9-]+)\}\}', lambda m: partials[m.group(1)], template)
    return FAQ_MACRO.sub(lambda m: faq_cards(m.group(1), int(m.group(2))), template)


# ---- render --------------------------------------------------------------------------
missing_report = {}
PAGES = [p for p in PAGES if os.path.exists(os.path.join(I18N, p['template']))]
for page in PAGES:
    template = expand(open(os.path.join(I18N, page['template']), encoding='utf-8').read())
    page_strings = load_strings(page['id']) if page['id'] != 'landing' else {}
    page_en = page_strings.get('en', {})
    page['built'] = [t for t in languages if t['code'] in strings and (page['id'] == 'landing' or t['code'] in page_strings)]
    slug = page['slug']
    for lang in page['built']:
        code = lang['code']
        S = dict(strings[code], **page_strings.get(code, {}))
        missing = [k for k in list(EN) + list(page_en) if k not in S]
        if missing:
            missing_report[(page['id'], code)] = missing

        swap = {'dock.l': 'dock.r', 'dock.r': 'dock.l'} if lang.get('dir') == 'rtl' else {}

        def s(key, S=S):
            key = swap.get(key, key)   # RTL: the split CTA keeps its LTR mechanics, so its halves trade places
            for source in (S, page_en, EN):
                if key in source:
                    return source[key]
            raise KeyError(key)

        root = root_of(lang, slug)
        home = '../' if slug else ''
        faces, preload = font_css(lang.get('script'), root)
        hreflang = '\n'.join('<link rel="alternate" hreflang="%s" href="%s">' % (t['hreflang'], url_of(t, slug)) for t in page['built'])
        hreflang += '\n<link rel="alternate" hreflang="x-default" href="%s">' % url_of(languages[0], slug)
        system = {
            'lang': lang.get('html', code), 'dir': lang.get('dir', 'ltr'), 'root': root, 'home': home or './',
            'canonical': url_of(lang, slug), 'hreflang': hreflang, 'ogLocale': lang['ogLocale'],
            'fontFaces': faces, 'fontPreload': preload, 'langSwitcher': switcher(lang, s, slug),
            'embedQuery': '' if code == 'en' else '?lang=' + code,
            # "become a partner" links in shared blocks: scroll to the form on the landing, go to it elsewhere
            'signupHref': (home + '#signup') if slug else '#signup',
            'signupNav': (' data-page-link data-label="%s"' % render_attr(s('loader') + ' · ' + s('fan.home'))) if slug else '',
            'pageCss': ('\n<link rel="stylesheet" href="%sassets/css/%s.css" data-inline>' % (root, page['css'])) if page.get('css') else '',
        }

        def fill(m):
            attr, key = m.group(1) == '@', m.group(2)
            if key in system:
                return system[key]
            if attr:
                return render_attr(s(key))
            text = s(key)
            return render_text(keep_thai(text) if lang.get('script') == 'thai' else text)

        out = template.replace('{{fanMenu}}', fan_menu(home, root, page['id']))
        out = re.sub(r'\{\{(@?)([A-Za-z0-9_.-]+)\}\}', fill, out)
        assert '{{' not in out, out[out.index('{{'):][:80]
        out_dir = os.path.join(SITE, lang['path'], slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(out)
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
urls = ''
for page in PAGES:
    alts = ''.join('\n    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (t['hreflang'], url_of(t, page['slug'])) for t in page['built'])
    urls += ''.join('\n  <url>\n    <loc>%s</loc>%s\n  </url>' % (url_of(l, page['slug']), alts) for l in page['built'])
with open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">%s\n</urlset>\n' % urls)

for (page_id, code), keys in missing_report.items():
    print('WARNING %s/%s: %d keys fall back to English: %s' % (page_id, code, len(keys), ', '.join(keys[:8])), file=sys.stderr)

runpy.run_path(os.path.join(ROOT, 'tools', 'stamp-assets.py'))
