#!/usr/bin/env python3
"""Render the concept pages (site/<slug>/index.html) from tools/pages.json.

In the design these were overlays opened from the site-map fan; here each one
is a real page with its own URL. Edit pages.json, then run:

    python3 tools/build-pages.py
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
DOMAIN = 'https://tradequopartners.com'
pages = json.load(open(os.path.join(ROOT, 'tools', 'pages.json'), encoding='utf-8'))
TOTAL = len(pages) + 1  # the landing counts as page 01

e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)


def nav_link(p, current):
    sel = p['slug'] == current
    style = ('padding:8px 14px; border-radius:999px; border:1px solid {b}; background:{bg}; color:{c}; font-size:14px; '
             'font-weight:500; cursor:pointer; font-family:inherit; letter-spacing:-.01em; white-space:nowrap; '
             'transition: color .2s ease, background .2s ease;').format(
        b='#0a0a0a' if sel else 'transparent', bg='#0a0a0a' if sel else 'transparent', c='#fff' if sel else '#45474d')
    cur = ' aria-current="page"' if sel else ''
    return ('<a href="../{slug}/" data-page-link data-label="LOADING · {label}"{cur} style="{style}">{short}</a>'
            .format(slug=p['slug'], label=a(p['title'].upper()), cur=cur, style=style, short=e(p['short'])))


def render(i, p):
    nxt = pages[(i + 1) % len(pages)]
    nav = '\n          '.join(nav_link(q, p['slug']) for q in pages)
    rows = '\n'.join('''            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 15px 0; border-top: 1px solid rgba(150,156,165,.26); box-shadow: inset 0 1px 0 rgba(255,255,255,.9);">
              <span style="font-size: 14px; color: #5b5b5b;">{label}</span>
              <span style="display: flex; align-items: baseline; gap: 10px;"><span style="font-size: 24px; font-weight: 700; letter-spacing: -.035em; color: #0a0a0a;">{value}</span><span style="font-family: 'Fragment Mono', monospace; font-size: 10.5px; color: #9a9da3; white-space: nowrap;">{note}</span></span>
            </div>'''.format(label=e(r['label']), value=e(r['value']), note=e(r['note'])) for r in p['rows'])
    sections = '\n'.join('''          <div class="hv-glass-glow" style="position: relative; isolation: isolate; display: flex; flex-direction: column; gap: 10px; min-height: 196px; padding: 24px 24px 22px; border-radius: 14px; background: linear-gradient(200deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 40%), linear-gradient(112deg, rgba(255,255,255,0) 54%, rgba(226,228,232,.42) 54.2%, rgba(238,240,243,.22) 76%, rgba(255,255,255,0) 76.2%), linear-gradient(180deg, rgba(255,255,255,.42) 0%, rgba(244,245,247,.3) 100%); box-shadow: 0 1px 2px rgba(10,10,10,.05), 0 16px 32px -24px rgba(10,10,10,.24); transition: box-shadow .3s ease;">
            <span aria-hidden="true" style="position: absolute; inset: 0; z-index: -1; border-radius: inherit; padding: 3px; background: conic-gradient(from 200deg, #ffffff 0deg, #cfd2d7 28deg, #f6f7f8 52deg, #aeb2b9 86deg, #eff0f2 118deg, #ffffff 150deg, #c4c7cd 190deg, #f3f4f6 228deg, #a3a7ae 262deg, #e6e8eb 300deg, #ffffff 330deg, #ffffff 360deg); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;"></span>
            <span aria-hidden="true" style="position: absolute; inset: 3px; z-index: -1; border-radius: 11px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.95), 0 0 0 1px rgba(110,116,124,.3), inset 0 6px 14px -10px rgba(10,10,10,.14); pointer-events: none;"></span>
            <span style="font-family: 'Fragment Mono', monospace; font-size: 11px; letter-spacing: .14em; color: #e7131b;">{n}</span>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -.025em; line-height: 1.15; text-wrap: balance;">{title}</h2>
            <p style="margin: 0; font-size: 14.5px; line-height: 1.5; color: #5b5b5b; text-wrap: pretty;">{desc}</p>
          </div>'''.format(n='%02d' % (k + 1), title=e(s['title']), desc=e(s['desc'])) for k, s in enumerate(p['sections']))

    title = '{} — TradeQuo Partner Program'.format(p['title'])
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{blurb}">
<!-- Concept preview with placeholder copy: keep out of search until it is final. -->
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="{domain}/{slug}/">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TradeQuo Partners">
<meta property="og:url" content="{domain}/{slug}/">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{blurb}">
<meta property="og:image" content="{domain}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="icon" href="../favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<script>try{{if(sessionStorage.getItem('tqLoader'))document.documentElement.classList.add('tq-arriving')}}catch(e){{}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..900;1,9..40,400&amp;family=Fragment+Mono:ital@0;1&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/site.css">
</head>
<body>
<div class="tq-loader" data-loader hidden>
  <iframe data-src="../embeds/tradequo-loader.html?theme=light" title="" aria-hidden="true" tabindex="-1"></iframe>
  <span class="tq-loader__label" data-loader-label>LOADING</span>
</div>
<div style="min-height: 100vh; background: #fff; color: #0a0a0a; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased;">
  <header data-page-bar style="position: sticky; top: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px clamp(16px, 4vw, 56px); background: rgba(255,255,255,.86); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border-bottom: 1px solid #ececee;">
    <a href="../" data-page-link data-label="LOADING · PARTNER PROGRAM" style="display: inline-flex; flex-shrink: 0;"><img src="../assets/logo-wordmark-dark.png" alt="TradeQuo Partner Program" style="height: 21px; width: auto;"></a>
    <nav aria-label="Partner Program pages" style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: center;">
      <a href="../" data-page-link data-label="LOADING · PARTNER PROGRAM" class="hv-red" style="padding: 8px 14px; border-radius: 999px; border: 1px solid transparent; background: transparent; color: #45474d; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; letter-spacing: -.01em; white-space: nowrap;">Partner Program</a>
          {nav}
    </nav>
    <a href="../" data-page-link data-label="LOADING · PARTNER PROGRAM" class="hv-ink-border" style="display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; height: 40px; padding: 0 16px 0 12px; border-radius: 999px; border: 1px solid #dcdde0; background: #fff; color: #0a0a0a; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; letter-spacing: -.01em; white-space: nowrap;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"></path><path d="M11 18l-6-6 6-6"></path></svg>
      Back
    </a>
  </header>
  <div style="display: flex; align-items: center; justify-content: center; gap: 14px; padding: 9px clamp(16px, 4vw, 56px); background: #fafafa; border-bottom: 1px solid #ececee; font-family: 'Fragment Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #6b6e74; text-align: center;">
    <span style="width: 6px; height: 6px; border-radius: 50%; background: #e7131b; flex-shrink: 0;"></span>
    <span>CONCEPT PREVIEW · PAGE {num} / {total:02d} · COPY AND LAYOUT ARE PLACEHOLDERS · PLANNED Q1 2027</span>
  </div>

  <main>
    <section style="position: relative; padding: clamp(48px, 7vw, 96px) clamp(16px, 4vw, 56px) clamp(40px, 5vw, 72px); overflow: hidden;">
      <div aria-hidden="true" style="position: absolute; inset: 0; background-image: linear-gradient(rgba(10,10,10,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,10,.07) 1px, transparent 1px); background-size: 64px 64px; opacity: .35; mask-image: radial-gradient(ellipse 60% 70% at 70% 40%, #000 0%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse 60% 70% at 70% 40%, #000 0%, transparent 75%);"></div>
      <div style="position: relative; max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr); gap: clamp(28px, 5vw, 72px); align-items: center;" data-page-hero>
        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 22px;">
          <span style="display: inline-flex; align-items: center; gap: 10px; font-family: 'Fragment Mono', monospace; font-size: 12px; letter-spacing: .16em; color: #e7131b;">{num} / {total:02d}<span style="width: 22px; height: 1px; background: #c9cbd0;"></span><span style="color: #6b6e74;">{kicker}</span></span>
          <h1 style="margin: 0; font-size: clamp(40px, 5.6vw, 76px); line-height: .95; letter-spacing: -.045em; font-weight: 700; text-wrap: balance; max-width: 13ch;">{h1}</h1>
          <p style="margin: 0; max-width: 46ch; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.55; color: #5b5b5b; text-wrap: pretty;">{sub}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;">
            <span class="hv-red-bg" style="display: inline-flex; align-items: center; height: 48px; padding: 0 26px; border-radius: 999px; background: #e7131b; color: #fff; font-size: 15px; font-weight: 600; letter-spacing: -.01em; cursor: pointer;">{cta}</span>
            <span class="hv-ink-border" style="display: inline-flex; align-items: center; height: 48px; padding: 0 24px; border-radius: 999px; border: 1px solid #dcdde0; color: #0a0a0a; font-size: 15px; font-weight: 600; letter-spacing: -.01em; cursor: pointer;">{cta2}</span>
          </div>
        </div>
        <div style="position: relative; isolation: isolate; border-radius: 24px; padding: 26px 28px 10px; background: linear-gradient(200deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 40%), linear-gradient(112deg, rgba(255,255,255,0) 54%, rgba(226,228,232,.42) 54.2%, rgba(238,240,243,.22) 76%, rgba(255,255,255,0) 76.2%), linear-gradient(180deg, rgba(255,255,255,.6) 0%, rgba(244,245,247,.5) 100%); box-shadow: 0 1px 2px rgba(10,10,10,.05), 0 30px 50px -30px rgba(10,10,10,.3);">
          <span aria-hidden="true" style="position: absolute; inset: 0; z-index: -1; border-radius: inherit; padding: 3px; background: conic-gradient(from 200deg, #ffffff 0deg, #cfd2d7 28deg, #f6f7f8 52deg, #aeb2b9 86deg, #eff0f2 118deg, #ffffff 150deg, #c4c7cd 190deg, #f3f4f6 228deg, #a3a7ae 262deg, #e6e8eb 300deg, #ffffff 330deg, #ffffff 360deg); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;"></span>
          <span aria-hidden="true" style="position: absolute; inset: 3px; z-index: -1; border-radius: 21px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.95), 0 0 0 1px rgba(110,116,124,.26), inset 0 6px 14px -10px rgba(10,10,10,.14); pointer-events: none;"></span>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px;">
            <span style="font-size: 13px; font-weight: 600; letter-spacing: -.01em; color: #0a0a0a;">{card_title}</span>
            <span style="font-family: 'Fragment Mono', monospace; font-size: 10.5px; letter-spacing: .14em; color: #9a9da3;">PREVIEW</span>
          </div>
{rows}
        </div>
      </div>
    </section>

    <section style="padding: 0 clamp(16px, 4vw, 56px) clamp(56px, 7vw, 96px);">
      <div style="max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
{sections}
      </div>
    </section>
  </main>

  <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; max-width: 1240px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 56px) clamp(48px, 6vw, 80px);">
    <a href="../" data-page-link data-label="LOADING · PARTNER PROGRAM" class="hv-red" style="display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 4px; border: 0; background: transparent; color: #45474d; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; letter-spacing: -.01em;">← Back to Partner Program</a>
    <a href="../{next_slug}/" data-page-link data-label="LOADING · {next_label}" class="hv-ink-border" style="display: inline-flex; align-items: center; gap: 10px; height: 48px; padding: 0 22px; border-radius: 999px; border: 1px solid #dcdde0; background: #fff; color: #0a0a0a; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; letter-spacing: -.01em;">
      <span style="font-family: 'Fragment Mono', monospace; font-size: 11px; letter-spacing: .14em; color: #e7131b;">NEXT</span>{next_title}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
    </a>
  </div>
</div>
<script src="../assets/js/transition.js" defer></script>
<script>
  /* Phones: the page nav scrolls sideways — bring the current page into view. */
  var cur = document.querySelector('[data-page-bar] [aria-current="page"]');
  if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) cur.parentNode.scrollLeft = cur.offsetLeft - 16;
  /* Esc returns to the Partner Program, as closing the overlay did in the design. */
  document.addEventListener('keydown', function (e) {{
    if (e.key === 'Escape' && window.tqGo) window.tqGo('../', 'LOADING · PARTNER PROGRAM');
  }});
</script>
</body>
</html>
'''.format(title=a(title), blurb=a(p['blurb']), domain=DOMAIN, slug=p['slug'], nav=nav, num=p['num'], total=TOTAL,
           kicker=e(p['kicker'].upper()), h1=e(p['h1']), sub=e(p['sub']), cta=e(p['cta']), cta2=e(p['cta2']),
           card_title=e(p['cardTitle']), rows=rows, sections=sections, next_slug=nxt['slug'],
           next_label=a(nxt['title'].upper()), next_title=e(nxt['title']))


for i, p in enumerate(pages):
    out = os.path.join(SITE, p['slug'])
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(render(i, p))
    print('wrote', os.path.relpath(os.path.join(out, 'index.html'), ROOT))

# Pages link CSS/JS with a content hash; re-stamp after regenerating them.
import runpy
runpy.run_path(os.path.join(ROOT, 'tools', 'stamp-assets.py'))
