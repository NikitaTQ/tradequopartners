#!/usr/bin/env python3
"""Validate tools/i18n/strings/[<page>/]*.json against en.json: keys, inline tokens,
{placeholders}, numbers, and length of strings that sit in tight UI slots.   python3 tools/check-strings.py"""
import json, os, re, sys, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'tools', 'i18n', 'strings')
TIGHT = re.compile(r'^(lang\.translate$|fan\.(home|programs|commission)$|pp\.nav\.|cp\.nav\.|pp\.p\d\.(tag|value|valueNote)$|pp\.card\.|cp\.calc\.(clientsUnit|tier|perLot|perDay|perYear|p\d)$|cp\.str\.example$|cp\.tier\.|cp\.pay\.t\d$|pp\.join\.cta2$|cp\.end\.cta2$|pp\.why\.cta$|nav\.|form\.(name|email|phone|commit\d|section|auth|sign|date|submit|sent)$|calc\.(lotsUnit|tradersUnit)$|inv\.|rcpt\.|dock\.|stats\.cta$|reach\.cta|offer\.\d\.t$|embed\.crys\.|embed\.flow\.(f\d|live)$)')
TOK = re.compile(r'</?[a-z]+/?>')
PH = re.compile(r'\{[a-z]+\}')
NUM = re.compile(r'\$?\d[\d,.:]*\+?%?')
def width(s):  # East-Asian wide chars count double
    return sum(2 if unicodedata.east_asian_width(c) in 'WF' else 1 for c in TOK.sub('', s))
bad = 0
for sub in ('', 'programs', 'commission'):
  D = os.path.join(BASE, sub)
  en = json.load(open(os.path.join(D, 'en.json'), encoding='utf-8'))
  for f in sorted(os.listdir(D)):
      if f == 'en.json' or not f.endswith('.json'): continue
      code = f[:-5]; t = json.load(open(os.path.join(D, f), encoding='utf-8'))
      problems = []
      for k in set(en) ^ set(t): problems.append('key ' + k)
      for k, v in en.items():
          if k not in t: continue
          if sorted(TOK.findall(v)) != sorted(TOK.findall(t[k])): problems.append('tokens %s: %s' % (k, TOK.findall(t[k])))
          if sorted(PH.findall(v)) != sorted(PH.findall(t[k])): problems.append('placeholders %s: %s' % (k, PH.findall(t[k])))
          if k not in ('footer.risk', 'form.datePh', 'embed.kb.3'):   # kb.3: '$0 payout fees' reads 'no payout fees' in translation
              for n in NUM.findall(TOK.sub('', v)):
                  core = n.strip('.,$%+')   # local forms like %87 (Turkish) keep the digits
                  if core and core not in t[k] and re.sub(r'\D', '', core) not in re.sub(r'\D', '', t[k]):
                      problems.append('number %s missing in %s' % (n, k))   # (30.000+ / 30 000+ are fine)
          if TIGHT.match(k) and width(t[k]) > max(width(v) * 1.45, width(v) + 6):
              problems.append('long %s: %r (%d vs %d)' % (k, t[k], width(t[k]), width(v)))
      print('%-20s %s' % ((sub + '/' if sub else '') + code, 'ok' if not problems else '\n  ' + '\n  '.join(problems)))
      bad += bool(problems)
sys.exit(1 if bad else 0)
