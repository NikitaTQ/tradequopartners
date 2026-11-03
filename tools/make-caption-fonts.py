#!/usr/bin/env python3
"""Tiny CJK fonts for the captions the crystals embed draws on canvas.

Chinese, Japanese and Korean pages use the visitor's system fonts, but the 3D
crystals paint their captions into a texture, and the page's poster image is a
screenshot of that texture: both should use the same face everywhere. For each
CJK language this takes the Noto Sans weight-700 slices from Google Fonts that
contain the caption characters, cuts them down to exactly those characters
(a few KB each) and records them in tools/i18n/caption-fonts.json, which
build-i18n.py turns into a 'TQ CJK' @font-face for the embed.

Run when embed.crys.* captions change (needs network + `pip install fonttools brotli`):

    python3 tools/make-caption-fonts.py
"""
import json
import os
import re
import subprocess
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'assets', 'fonts', 'intl')
FAMILIES = {'zh-hans': 'Noto Sans SC', 'zh-hant': 'Noto Sans TC', 'ja': 'Noto Sans JP', 'ko': 'Noto Sans KR'}
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'


def ranges(spec):
    for part in spec.split(','):
        part = part.strip().replace('U+', '')
        if '-' in part:
            a, b = part.split('-')
            yield int(a, 16), int(b, 16)
        else:
            yield int(part, 16), int(part, 16)


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read()


result = {}
for code, family in FAMILIES.items():
    strings = json.load(open(os.path.join(ROOT, 'tools', 'i18n', 'strings', code + '.json'), encoding='utf-8'))
    text = ''.join(v for k, v in strings.items() if k.startswith('embed.crys.'))
    chars = sorted({c for c in text if ord(c) > 0x2E7F})          # CJK + kana/hangul; Latin stays Archivo
    css = get('https://fonts.googleapis.com/css2?family=%s:wght@700&display=swap' % family.replace(' ', '+')).decode()
    faces = []
    for block in re.findall(r'@font-face \{.*?\}', css, re.S):
        url = re.search(r'url\((https://[^)]+)\)', block).group(1)
        spans = list(ranges(re.search(r'unicode-range: ([^;]+);', block).group(1)))
        need = [c for c in chars if any(a <= ord(c) <= b for a, b in spans)]
        if not need:
            continue
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, 'slice.woff2')
            open(src, 'wb').write(get(url))
            name = 'caption-%s-%d.woff2' % (code, len(faces))
            subprocess.run(['pyftsubset', src, '--text=' + ''.join(need), '--flavor=woff2',
                            '--layout-features=*', '--output-file=' + os.path.join(OUT, name)], check=True)
        faces.append({'file': name, 'range': ', '.join('U+%X' % ord(c) for c in need)})
    covered = {c for f in faces for c in re.findall(r'U\+([0-9A-F]+)', f['range'])}
    lost = [c for c in chars if '%X' % ord(c) not in covered]
    if lost:
        print('WARNING %s: no slice for %s' % (code, ''.join(lost)))
    result[code] = faces
    print('%s: %d chars in %d files, %d bytes' % (code, len(chars), len(faces), sum(os.path.getsize(os.path.join(OUT, f['file'])) for f in faces)))

json.dump(result, open(os.path.join(ROOT, 'tools', 'i18n', 'caption-fonts.json'), 'w'), indent=1)
