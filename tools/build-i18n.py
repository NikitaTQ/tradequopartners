#!/usr/bin/env python3
"""Build the translated pages (landing, partner programs, partner terms, partner tools) in every language.

    tools/i18n/<page>.html           templates ({{key}} = text, {{@key}} = attribute value,
                                     {{> name}} = tools/i18n/partials/name.html,
                                     {{faq:prefix:N}} = N FAQ cards from prefix.1.q / prefix.1.a …)
    tools/i18n/strings/<code>.json   landing copy + shared chrome (header, fan menu, footer); en.json is the master
    tools/i18n/strings/<page>/<code>.json   copy of the other pages (overrides/extends the above)
    tools/i18n/languages.json        URL path, hreflang, switcher name, direction, script
    tools/i18n/font-files.json       font subsets for Arabic / Thai (Inter covers Latin, Cyrillic, Vietnamese)

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
    {'id': 'marketing', 'template': 'marketing.html', 'slug': 'marketing-tools', 'css': 'partner'},   # was partner-tools for a while (netlify.toml: 302 there until the beginners' page takes that address)
    # IB Tools: the hero only for now; no table of contents yet (fan, FAB). ('display': 'h2' preloads the H2 face instead
    # of the H1 one, for a page whose display text is section-heading type, as with the earlier devices-film hero)
    {'id': 'ibtools', 'template': 'ibtools.html', 'slug': 'ib-tools', 'css': 'partner'},
]
# The site navigation in the header: the five pages, in this order (page id, path under the language root, label).
NAV = [
    ('landing', '', 'fan.home'),
    ('programs', 'programs/', 'fan.programs'),
    ('commission', 'partner-terms/', 'fan.commission'),
    ('marketing', 'marketing-tools/', 'fan.marketing'),
    ('ibtools', 'ib-tools/', 'fan.ibtools'),
]
# Each page's table of contents: the fan bottom right on desktop, the red menu on phones (section id, label).
TOC = {
    'landing': [('signup', 'nav.cta'), ('how', 'nav.how'), ('calculator', 'nav.calc'), ('reviews', 'toc.reviews'), ('dashboard', 'nav.perks'), ('faq', 'nav.faq')],
    'programs': [('programs', 'pp.nav.programs'), ('who', 'toc.who'), ('benefits', 'pp.nav.benefits'), ('why', 'pp.nav.why'), ('how', 'nav.how'), ('questions', 'nav.faq')],
    'commission': [('earnings', 'toc.earnings'), ('calculator', 'nav.calc'), ('payouts', 'cp.nav.payouts'), ('perks', 'nav.perks'), ('how', 'nav.how'), ('questions', 'nav.faq')],
    'marketing': [('tools', 'mt.nav.tools'), ('library', 'toc.materials'), ('get', 'toc.get'), ('support', 'toc.support'), ('questions', 'nav.faq')],
}
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
    'line': ('<span class="tq-line">', '</span>'),   # one sentence of a heading (a block of its own where the CSS says so)
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


# the H1 face of each language (site.css .tq-h1, tools/h1-fonts.py); Syncopate for the rest
H1_FACE = {'uk': 'unbounded', 'vi': 'unbounded', 'ro': 'unbounded', 'ar': 'reem-kufi', 'th': 'prompt', 'ja': 'dela-gothic-one',
           'ko': 'black-han-sans', 'zh-hans': 'zcool-qingke-sc', 'zh-hant': 'noto-sans-tc'}


def h1_preload(code, root, suffix=''):
    return '\n<link rel="preload" href="%sassets/fonts/h1/%s%s.woff2" as="font" type="font/woff2" crossorigin>' % (root, H1_FACE.get(code, 'syncopate'), suffix)


def font_css(script, root):
    """Fonts and type rules for scripts Inter doesn't cover. Inter itself has Latin, Cyrillic and Vietnamese
    (site.css); Arabic and Thai get IBM Plex Sans Arabic / Noto Sans Thai declared as 'Inter' for their unicode
    ranges, so every rule that says Inter draws them; CJK uses the system's faces."""
    rules, preload = [], []
    by = lambda font, subset=None: [f for f in fonts if f['font'] == font and (subset is None or f['subset'] == subset)]
    if script == 'cyrillic':
        preload = ['inter-cyrillic.woff2']
    elif script == 'vietnamese':
        preload = ['inter-vietnamese.woff2']
    elif script == 'arabic':
        rules += [face('Inter', f, root) for f in by('IBM-Plex-Sans-Arabic')]
        preload = ['intl/' + f['file'] for f in by('IBM-Plex-Sans-Arabic') if f['weight'] in ('400', '700')]
    elif script == 'thai':
        thai = by('Noto-Sans-Thai', 'thai')[0]
        rules.append(face('Inter', thai, root))
        preload = ['intl/' + thai['file']]
    if script in ('arabic', 'thai', 'cjk'):
        # tracking breaks Arabic joining and crowds CJK/Thai; tight Latin leading clips their glyphs.
        # SVG text is left alone: it is only the fixed Latin lettering round the stamps.
        rules.append('*:not(svg *) { letter-spacing: 0 !important; }')
        rules.append('h1, h2 { line-height: 1.2 !important; }')
    if script == 'cjk':
        rules.append('h1, h2, h3, p { line-break: strict; }')
        rules.append('html:lang(ko) * { word-break: keep-all; }')   # Korean wraps between words, not syllables
    css = '\n<style id="i18n-fonts">\n' + '\n'.join(rules) + '\n</style>' if rules else ''
    pre = ''.join('\n<link rel="preload" href="%sassets/fonts/%s" as="font" type="font/woff2" crossorigin>' % (root, f) for f in preload)
    return css, pre


def url_of(lang, slug=''):
    return DOMAIN + '/' + ''.join(part + '/' for part in (lang['path'], slug) if part)


def root_of(lang, slug=''):
    """Relative path from a page back to the site root."""
    return '../' * ((1 if lang['path'] else 0) + (1 if slug else 0))


def href_from(cur, target, slug=''):
    return (root_of(cur, slug) + ''.join(part + '/' for part in (target['path'], slug) if part)) or './'


SHORT = {'zh-hans': '简体', 'zh-hant': '繁體'}


def switcher(cur, s, slug='', page_id='landing', home=''):
    # below 1140px the site navigation lives here: the five pages first, then "Language" and the languages
    items = []
    for pid, path, key in NAV:
        if pid == page_id:
            items.append('<li class="tq-lang__page"><a href="#" aria-current="page" data-to-top>%s</a></li>' % html.escape(s(key)))
        else:
            items.append('<li class="tq-lang__page"><a href="%s" data-page-link data-label="%s">%s</a></li>'
                         % (page_href(home, path), render_attr(s('loader') + ' · ' + s(key)), html.escape(s(key))))
    items.append('<li class="tq-lang__page tq-lang__label" aria-hidden="true">%s</li>' % html.escape(s('lang.label')))
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
            '<button type="button" class="tq-lang__btn" aria-haspopup="true" aria-expanded="false" aria-label="%s · %s: %s">'
            '<svg class="tq-lang__burger" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path></svg>'
            '<svg class="tq-lang__globe" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'
            '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z"></path></svg>'
            '<span class="tq-lang__code">%s</span>'
            '<svg class="tq-lang__chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>'
            '</button>'
            '<ul class="tq-lang__menu" hidden>%s</ul></div>'
            % (render_attr(s('fab.aria')), render_attr(s('lang.label')), html.escape(cur['name']), html.escape(code), ''.join(items)))


def fan_menu(page_id):
    """Veil + fan of this page's sections + knob (partials/fan.html, fan-blade.html): its table of contents."""
    toc = TOC.get(page_id, ())
    blades = []
    for i, (sid, key) in enumerate(toc):
        blades.append(partials['fan-blade']
                      .replace('{{i}}', str(i)).replace('{{ri}}', str(len(toc) - 1 - i))
                      .replace('{{href}}', '#' + sid).replace('{{num}}', '%02d' % (i + 1)).replace('{{key}}', key))
    return partials['fan'].replace('{{fanBlades}}', ''.join(blades)).replace('{{fanCount}}', str(len(toc)))


def page_href(home, path):
    return (home + path) or './'


def site_nav(home, page_id):
    """The header's links to the five pages; the page you are on is marked (and takes you back to its top)."""
    out = []
    for pid, path, key in NAV:
        if pid == page_id:
            out.append('<a class="hv-red tq-nav-link" href="#" aria-current="page" data-to-top>{{%s}}</a>' % key)
        else:
            out.append('<a class="hv-red tq-nav-link" href="%s" data-page-link data-label="{{@loader}} · {{@%s}}">{{%s}}</a>'
                       % (page_href(home, path), key, key))
    return '\n        '.join(out)


def fab_links(page_id):
    """Below 1140px: the red menu bottom right is this page's table of contents (the pages are in the header menu)."""
    return '\n      '.join('<a class="tq-fab-link" href="#%s" data-toc-link style="--i: %d;">{{%s}}</a>' % (sid, i, key)
                           for i, (sid, key) in enumerate(TOC.get(page_id, ())))


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
            'lang': lang.get('html', code), 'code': code, 'dir': lang.get('dir', 'ltr'), 'root': root, 'home': home or './',
            'canonical': url_of(lang, slug), 'hreflang': hreflang, 'ogLocale': lang['ogLocale'],
            'fontFaces': faces, 'fontPreload': preload + h1_preload(lang['code'], root, '-h2' if page.get('display') == 'h2' else ''), 'langSwitcher': switcher(lang, s, slug, page['id'], home),
            'embedQuery': '' if code == 'en' else '?lang=' + code,
            # "become a partner" links in shared blocks: scroll to the form on the landing, go to it elsewhere
            'signupHref': (home + '#signup') if slug else '#signup',
            'signupNav': (' data-page-link data-label="%s"' % render_attr(s('loader') + ' · ' + s('fan.home'))) if slug else '',
            # the header: dark (light wordmark) on pages that start with a dark screen
            'headClass': ' tq-head--dark' if page.get('head') == 'dark' else '',
            'logoFile': 'logo-wordmark-light.png' if page.get('head') == 'dark' else 'logo-wordmark-dark.png',
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

        out = (template.replace('{{fanMenu}}', fan_menu(page['id'])).replace('{{siteNav}}', site_nav(home, page['id']))
               .replace('{{fabLinks}}', fab_links(page['id'])))
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
