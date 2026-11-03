#!/usr/bin/env python3
"""Validate tools/i18n/strings/*.json against en.json: keys, inline tokens, numbers,
and length of strings that sit in tight UI slots.   python3 tools/check-strings.py"""
import json, os, re, sys, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'tools', 'i18n', 'strings')
en = json.load(open(os.path.join(D, 'en.json'), encoding='utf-8'))
TIGHT = re.compile(r'^(nav\.|form\.(name|email|phone|commit\d|section|auth|sign|date|submit|sent)$|calc\.(lotsUnit|tradersUnit)$|inv\.|rcpt\.|dock\.|stats\.cta$|reach\.cta|offer\.\d\.t$|embed\.crys\.|embed\.flow\.(f\d|live)$)')
TOK = re.compile(r'</?[a-z]+/?>')
NUM = re.compile(r'\$?\d[\d,.:]*\+?%?')
def width(s):  # East-Asian wide chars count double
    return sum(2 if unicodedata.east_asian_width(c) in 'WF' else 1 for c in TOK.sub('', s))
bad = 0
for f in sorted(os.listdir(D)):
    if f == 'en.json' or not f.endswith('.json'): continue
    code = f[:-5]; t = json.load(open(os.path.join(D, f), encoding='utf-8'))
    problems = []
    for k in set(en) ^ set(t): problems.append('key ' + k)
    for k, v in en.items():
        if k not in t: continue
        if sorted(TOK.findall(v)) != sorted(TOK.findall(t[k])): problems.append('tokens %s: %s' % (k, TOK.findall(t[k])))
        if k != 'footer.risk' and k != 'form.datePh':
            for n in NUM.findall(TOK.sub('', v)):
                if n.strip('.,') and n.strip('.,') not in t[k]: problems.append('number %s missing in %s' % (n, k))
        if TIGHT.match(k) and width(t[k]) > max(width(v) * 1.45, width(v) + 6):
            problems.append('long %s: %r (%d vs %d)' % (k, t[k], width(t[k]), width(v)))
    print('%-8s %s' % (code, 'ok' if not problems else '\n  ' + '\n  '.join(problems)))
    bad += bool(problems)
sys.exit(1 if bad else 0)
