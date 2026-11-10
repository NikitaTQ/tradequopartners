// IB Tools: the Sub-IB network diagram (Sub-IB_Network_Silver design) as static SVG.
// The design computes the 3D glass hexagons (Main IB, five Sub-IBs, their clients, a tier-2 Sub-IB) in JS; this
// script does the same once and writes tools/i18n/partials/ib-net-svg.html: the SVG plus its labels (with {{keys}}
// for the translated ones). A second, smaller scene for phones (three Sub-IBs, the tier-2 one under Sub-IB 03, cropped
// to its contents, whole-unit coordinates, its own gradient ids) goes to ib-net-svg-m.html.
// Each group carries data-g; the page's CSS and a few lines of script do the highlight
// (hovered group red, the others dimmed). Run after changing the geometry here:  cd tools && node build-ib-net.mjs
import { writeFileSync } from 'node:fs';

const P = 48 * Math.PI / 180, cP = Math.cos(P), sP = Math.sin(P), D = 1500, F = 1430, CX = 505, CY = 345;
const pj = (x, y, z) => { const up = y * cP - z * sP, d = D - y * sP - z * cP; return [CX + F * x / d, CY - F * up / d, d]; };
const circ = (x, z, r, n) => Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2; return pj(x + Math.cos(t) * r, 0, z + Math.sin(t) * r); });

/* desktop: the design's scene */
const DESK = {
  file: 'ib-net-svg.html', prec: 1, ids: '',
  subs: [[-315, -35, 46], [-70, -250, 74], [255, -170, 24], [215, 150, 54], [-245, 200, 16]], nc: [4, 5, 4, 3, 4],
  deep: 3, deepOffs: [-1.2, -0.6, 1.0], deepAng: 0.04, deepLabel: 'SUB-IB 04 · {{ib.net.tier2}}', tail: true, notes: true, below: -150,
  cd: [70, 52], deepDist: 180, dcd: [58, 18], sc: 1,
};
/* phones: fewer, larger nodes (as in the phone mockup): Sub-IB 01 left, 02 behind on the right, 03 in front on the
   right with its tier-2 Sub-IB further right; every label above its node, no side notes; the view is cropped */
const PHONE = {
  file: 'ib-net-svg-m.html', prec: 0, ids: 'm',
  subs: [[-225, -25, 46], [80, -240, 64], [175, 70, 34]], nc: [4, 4, 3],
  deep: 2, deepOffs: [-1.25, -2.1, 1.35], deepAng: 0.3, deepLabel: '{{ib.net.tier2}}', tail: false, notes: false, below: -Infinity,
  cd: [50, 34], deepDist: 122, dcd: [44, 12], sc: 0.8, crop: [62, 16],
};

function build(C) {
  const f = (v) => v.toFixed(C.prec), S = (a) => a.map((p) => f(p[0]) + ',' + f(p[1])).join(' ');
  let sd = 11; const rnd = () => { sd = sd + 0x6D2B79F5 | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const nodes = [], links = [];
  const add = (o) => { nodes.push(o); return nodes.length - 1; };
  const main = add({ type: 'main', x: -10, z: 10, y0: 34, r: 62, h: 40, grp: -1 });
  let deep = null;
  C.subs.forEach(([x, z, y0], i) => {
    const NC = C.nc[i];
    const s = add({ type: 'sub', x, z, y0, r: 30, h: 24, grp: i, label: 'SUB-IB 0' + (i + 1), n: NC });
    links.push({ a: main, b: s, grp: i, lv: 1 });
    const base = Math.atan2(z - 10, x + 10), offs = i === C.deep ? C.deepOffs : Array.from({ length: NC }, (_, k) => (k - (NC - 1) / 2) * 0.74);
    offs.forEach((o) => { const ang = base + o + (rnd() - 0.5) * 0.45, dist = C.cd[0] + rnd() * C.cd[1]; const c = add({ type: 'client', x: x + Math.cos(ang) * dist, z: z + Math.sin(ang) * dist, y0: 6 + rnd() * 64, r: 11.5 + rnd() * 3, h: 9, grp: i }); links.push({ a: s, b: c, grp: i, lv: 2 }); });
    if (i === C.deep) {
      const t = base + C.deepAng, l2 = add({ type: 'sub2', x: x + Math.cos(t) * C.deepDist, z: z + Math.sin(t) * C.deepDist, y0: 30, r: 22, h: 18, grp: i, label: C.deepLabel });
      links.push({ a: s, b: l2, grp: i, lv: 1 });
      const L = nodes[l2];
      [-0.95, 0.05, 1.0].forEach((o) => { const ang = t + o + (rnd() - 0.5) * 0.3, dist = C.dcd[0] + rnd() * C.dcd[1]; const c = add({ type: 'client', x: L.x + Math.cos(ang) * dist, z: L.z + Math.sin(ang) * dist, y0: 8 + rnd() * 46, r: 10, h: 8, grp: i }); links.push({ a: l2, b: c, grp: i, lv: 2 }); });
      if (C.tail) links.push({ a: l2, b: -1, grp: i, lv: 2, tail: [L.x + Math.cos(t - 1.55) * 125, 16, L.z + Math.sin(t - 1.55) * 125] });
      deep = L;
    }
  });
  const outline = (n, y, sc) => {
    const out = [], r = n.r * sc, rc = r * 0.3, d = r - rc / Math.cos(Math.PI / 6);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, ox = n.x + Math.cos(a) * d, oz = n.z + Math.sin(a) * d; for (let s = 0; s <= 4; s++) { const t = a - Math.PI / 6 + s / 4 * Math.PI / 3; out.push({ th: t, p: pj(ox + Math.cos(t) * rc, y, oz + Math.sin(t) * rc) }); } }
    return out;
  };
  const hull = (pts) => {
    const q = pts.map((v) => [v[0], v[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const v of q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], v) <= 0) lo.pop(); lo.push(v); }
    for (let i = q.length - 1; i >= 0; i--) { const v = q[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], v) <= 0) up.pop(); up.push(v); }
    lo.pop(); up.pop(); return lo.concat(up);
  };
  nodes.forEach((n) => {
    const yt = n.y0 + n.h, top = outline(n, yt, 1), bot = outline(n, n.y0, 1);
    n.hullPts = hull(top.concat(bot).map((o) => o.p));
    n.body = S(n.hullPts);
    n.top = S(top.map((o) => o.p));
    n.front = S(bot.filter((o) => Math.sin(o.th) > 0.02).map((o) => o.p));
    n.spec = S(top.filter((o) => o.th > 3.35 && o.th < 4.55).map((o) => o.p));
    n.inner = n.type === 'client' ? '' : S(outline(n, yt, 0.64).map((o) => o.p));
    n.core = n.type === 'main' ? S(outline(n, n.y0 + n.h * 0.5, 0.58).map((o) => o.p)) : '';
    n.shadow = S(circ(n.x + n.r * 0.25, n.z - n.r * 0.2, n.r * (1.25 + n.y0 / 110), 28));
    n.shA = Math.max(0.3, 0.95 - n.y0 / 120);
    n.thr = [pj(n.x, n.y0, n.z), pj(n.x, 0, n.z)];
    n.c3 = [n.x, n.y0 + n.h * 0.5, n.z];
    n.d = pj(n.x, 0, n.z)[2];
    n.tc = pj(n.x, yt, n.z);
    n.topY = Math.min(...top.map((o) => o.p[1])); n.botY = Math.max(...bot.map((o) => o.p[1]));
  });
  const arc = (A, B, lift) => { const pts = [], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2 + lift, mz = (A[2] + B[2]) / 2; for (let s = 0; s <= 24; s++) { const t = s / 24, it = 1 - t; pts.push(pj(it * it * A[0] + 2 * it * t * mx + t * t * B[0], it * it * A[1] + 2 * it * t * my + t * t * B[1], it * it * A[2] + 2 * it * t * mz + t * t * B[2])); } return pts; };
  links.forEach((l) => {
    const A = nodes[l.a].c3, B = l.b >= 0 ? nodes[l.b].c3 : l.tail, dist = Math.hypot(B[0] - A[0], B[2] - A[2]);
    const pts = arc(A, B, dist * (l.lv === 1 ? 0.2 : 0.26));
    l.d = 'M' + pts.map((p) => f(p[0]) + ' ' + f(p[1])).join(' L');
    l.mid = pts[14];
  });
  /* the view: the design's 1000×700, or (phones) the box around the nodes and their labels plus margins [x, y] */
  let vb = [0, 0, 1000, 700];
  if (C.crop) {
    const xs = nodes.flatMap((n) => n.hullPts.map((p) => p[0])), ys = nodes.flatMap((n) => n.hullPts.map((p) => p[1]));
    const labTop = Math.min(...nodes.filter((n) => n.label || n.type === 'main').map((n) => n.topY)) - 60;
    const [mx, my] = C.crop, x0 = Math.min(...xs) - mx, x1 = Math.max(...xs) + mx, y0 = Math.min(Math.min(...ys), labTop) - my, y1 = Math.max(...ys) + my;
    vb = [Math.floor(x0), Math.floor(y0), Math.ceil(x1 - x0), Math.ceil(y1 - y0)];
  }
  const pct = (p, dy = 0) => `left: ${((p[0] - vb[0]) / vb[2] * 100).toFixed(2)}%; top: ${((p[1] + dy - vb[1]) / vb[3] * 100).toFixed(2)}%`;
  const order = nodes.map((n, i) => i).sort((a, b) => nodes[b].d - nodes[a].d);
  const rings = [[160, '3 7'], [290, ''], [430, '2 9']].map(([r, d]) => ({ pts: S(circ(-10, 10, r * C.sc, 96)), dash: d }));
  const g = (n) => (n.grp >= 0 ? ` data-g="${n.grp}"` : '');
  const id = (k) => k + C.ids;

  let svg = '';
  svg += `<polygon points="${S(circ(-10, 10, 520 * C.sc, 64))}" fill="url(#${id('sibFloor')})"/>\n`;
  for (const r of rings) svg += `<polygon points="${r.pts}" fill="none" stroke="rgba(18,22,30,0.09)" stroke-width="1"${r.dash ? ` stroke-dasharray="${r.dash}"` : ''}/>\n`;
  svg += `<polygon points="${S(circ(-10, 10, 200 * C.sc, 48))}" fill="url(#${id('sibGlow')})"/>\n`;
  for (const i of order) { const n = nodes[i]; svg += `<g class="sib-s"${g(n)}><polygon points="${n.shadow}" fill="url(#${id('sibShadow')})" opacity="${n.shA.toFixed(3)}"/><line x1="${f(n.thr[0][0])}" y1="${f(n.thr[0][1])}" x2="${f(n.thr[1][0])}" y2="${f(n.thr[1][1])}" stroke="rgba(18,22,30,0.16)" stroke-width="1" stroke-dasharray="2 3"/></g>\n`; }
  for (const l of links) {
    const tail = l.b < 0;
    svg += `<g class="sib-l sib-l${l.lv}${tail ? ' sib-tail' : ''}" data-g="${l.grp}">${tail ? '' : `<path class="sib-lh" d="${l.d}"/>`}<path class="sib-lp" d="${l.d}"${tail ? ' stroke-dasharray="3 5"' : ''}/></g>\n`;
  }
  for (const i of order) {
    const n = nodes[i], mn = n.type === 'main', cl = n.type === 'client';
    const body = mn ? id('glBodyMain') : cl ? id('glBodyClient') : id('glBody'), topF = mn ? id('glTopMain') : cl ? id('glTopClient') : id('glTop');
    svg += `<g class="sib-n sib-${n.type}"${g(n)}>`;
    if (mn) svg += `<polygon points="${n.core}" fill="#E7131B" opacity="0.9" filter="url(#${id('glBlur')})"/>`;
    svg += `<polygon points="${n.body}" fill="url(#${body})" stroke="rgba(18,22,30,0.16)" stroke-width="0.8" stroke-linejoin="round"/>`;
    svg += `<polyline points="${n.front}" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="1" stroke-linecap="round"/>`;
    svg += `<polygon class="sib-top" points="${n.top}" fill="url(#${topF})" stroke-linejoin="round"/>`;
    if (n.inner) svg += `<polygon points="${n.inner}" fill="none" stroke="${mn ? 'rgba(255,255,255,0.16)' : 'rgba(18,22,30,0.12)'}" stroke-width="0.8" stroke-linejoin="round"/>`;
    svg += `<polyline points="${n.spec}" fill="none" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="${mn ? 2 : cl ? 1 : 1.4}" stroke-linecap="round"/>`;
    svg += `</g>\n`;
  }
  for (const l of links) if (l.lv === 1 && l.b >= 0) svg += `<g class="sib-b" data-g="${l.grp}"><circle cx="${f(l.mid[0])}" cy="${f(l.mid[1])}" r="6" fill="#E7131B" opacity="0.35" filter="url(#${id('glBlur')})"/><circle cx="${f(l.mid[0])}" cy="${f(l.mid[1])}" r="3.6" fill="#FFFFFF" stroke="#E7131B" stroke-width="1.6"/></g>\n`;

  const m = nodes[0];
  let labels = `<div class="sib-lab sib-lab--main" style="${pct([m.tc[0], m.topY], -12)}">Main IB</div>\n`;
  for (const n of nodes.filter((x) => x.label)) {
    const below = n.z < C.below;
    labels += `<div class="sib-lab sib-lab--${n.type}${below ? ' is-below' : ''}" data-g="${n.grp}" style="${below ? pct([n.tc[0], n.botY], 12) : pct([n.tc[0], n.topY], -10)}"><span>${n.label}</span>${n.type === 'sub' ? `<span class="sib-det">· {{ib.net.c${n.n}}}</span>` : ''}</div>\n`;
  }
  if (C.notes) {
    const c4 = nodes.filter((n) => n.type === 'client' && n.grp === 4);
    const cluAt = [c4.reduce((s, n) => s + n.tc[0], 0) / c4.length, Math.max(...c4.map((n) => n.botY)) + 14];
    const dc = nodes.filter((n) => n.type === 'client' && n.grp === 3).slice(-3);
    const deepAt = [deep.tc[0] - 10, Math.max(...dc.map((n) => n.botY)) + 16];
    labels += `<div class="sib-note" data-g="4" style="${pct(cluAt)}">{{ib.net.clients}}</div>\n`;
    labels += `<div class="sib-note" data-g="3" style="${pct(deepAt)}">{{ib.net.deeper}}</div>\n`;
  }

  const DEFS = `<defs>
<radialGradient id="${id('sibShadow')}"><stop offset="0" stop-color="#12161E" stop-opacity="0.42"/><stop offset="1" stop-color="#12161E" stop-opacity="0"/></radialGradient>
<radialGradient id="${id('sibGlow')}"><stop offset="0" stop-color="#12161E" stop-opacity="0.14"/><stop offset="0.55" stop-color="#12161E" stop-opacity="0.04"/><stop offset="1" stop-color="#12161E" stop-opacity="0"/></radialGradient>
<radialGradient id="${id('sibFloor')}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<linearGradient id="${id('glBody')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="0.18" stop-color="#E9EAEC" stop-opacity="0.45"/><stop offset="0.3" stop-color="#B9BCC3" stop-opacity="0.55"/><stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.35"/><stop offset="0.85" stop-color="#D4D6DB" stop-opacity="0.45"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.8"/></linearGradient>
<linearGradient id="${id('glBodyMain')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3A3C42" stop-opacity="0.95"/><stop offset="0.2" stop-color="#0A0A0A" stop-opacity="0.82"/><stop offset="0.32" stop-color="#6B6E75" stop-opacity="0.85"/><stop offset="0.45" stop-color="#0A0A0A" stop-opacity="0.8"/><stop offset="1" stop-color="#2A2C31" stop-opacity="0.92"/></linearGradient>
<linearGradient id="${id('glBodyClient')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.32" stop-color="#B9BCC3" stop-opacity="0.7"/><stop offset="0.6" stop-color="#E9EAEC" stop-opacity="0.6"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.9"/></linearGradient>
<linearGradient id="${id('glTop')}" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.6" stop-color="#F4F5F7" stop-opacity="0.5"/><stop offset="1" stop-color="#B9BCC3" stop-opacity="0.55"/></linearGradient>
<linearGradient id="${id('glTopMain')}" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="#5A5D63" stop-opacity="0.9"/><stop offset="0.6" stop-color="#0A0A0A" stop-opacity="0.75"/><stop offset="1" stop-color="#18191D" stop-opacity="0.9"/></linearGradient>
<linearGradient id="${id('glTopClient')}" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/><stop offset="1" stop-color="#D4D6DB" stop-opacity="0.8"/></linearGradient>
<filter id="${id('glBlur')}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>`;
  const out = `<!-- generated by tools/build-ib-net.mjs (Sub-IB_Network_Silver geometry); edit there, not here -->
<svg class="sib-svg" viewBox="${vb.join(' ')}" aria-hidden="true">
${DEFS}
${svg}</svg>
<div class="sib-labs" aria-hidden="true">
${labels}</div>
`;
  writeFileSync(new URL('./i18n/partials/' + C.file, import.meta.url), out);
  console.log('tools/i18n/partials/' + C.file, out.length, 'bytes,', nodes.length, 'nodes,', links.length, 'links, viewBox', vb.join(' '));
}
build(DESK);
build(PHONE);
