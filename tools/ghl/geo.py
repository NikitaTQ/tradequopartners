"""The home form's (GoHighLevel's) phone field, filled for the visitor's country: their browser's time zone gives the
country (no request to any server), the country its calling code; the inline script in tools/i18n/landing.html sends
both into the form's address (phone=+<code>, country=<ISO>), so the CRM's phone field opens on the right flag and code.
This writes the map it reads — a time zone's city (or full name where cities clash) : ISO, for every country the site
knows a calling code for (DIAL in assets/js/landing.js), old names included (the browser may give Asia/Calcutta) —
between the markers TQ-GEO-MAP in landing.html.
Run after a tzdata update or a change to DIAL:  python3 tools/ghl/geo.py && python3 tools/build-i18n.py"""
import os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
JS = open(os.path.join(ROOT, 'site', 'assets', 'js', 'landing.js'), encoding='utf-8').read()
DIAL = dict((x.split('|')[0], x.split('|')[1]) for x in re.search(r"const DIAL = '([^']+)'", JS).group(1).split(';'))

zone = {}
for line in open('/usr/share/zoneinfo/zone.tab'):
    if line.startswith('#') or not line.strip():
        continue
    cc, _, tz = line.split('\t')[:3]
    zone[tz.strip()] = cc
for line in open('/usr/share/zoneinfo/tzdata.zi'):   # links: L <target> <old name>
    if line.startswith('L '):
        _, target, old = line.split()
        if target in zone and old not in zone:
            zone[old] = zone[target]
zone = {tz: cc for tz, cc in zone.items() if cc in DIAL}

# by city where the city is unique, else by full name
city = {}
for tz, cc in zone.items():
    city.setdefault(tz.split('/')[-1], set()).add((tz, cc))
pairs = []
for c, s in sorted(city.items()):
    if len({cc for _, cc in s}) == 1:
        pairs.append('%s:%s' % (c, next(iter(s))[1]))
    else:
        pairs += ['%s:%s' % (tz, cc) for tz, cc in sorted(s)]
geo = ','.join(pairs)
dial = ','.join('%s%s' % (k, v) for k, v in sorted(DIAL.items()))

p = os.path.join(ROOT, 'tools', 'i18n', 'landing.html')
s = open(p, encoding='utf-8').read()
s, n = re.subn(r"/\*TQ-GEO-MAP\*/.*?/\*/TQ-GEO-MAP\*/", lambda m: "/*TQ-GEO-MAP*/G='%s',D='%s'/*/TQ-GEO-MAP*/" % (geo, dial), s, flags=re.S)
assert n == 1, 'markers TQ-GEO-MAP not found in landing.html'
open(p, 'w', encoding='utf-8').write(s)
print('zones', len(zone), 'map', len(geo), 'bytes, dial', len(dial), 'bytes')
