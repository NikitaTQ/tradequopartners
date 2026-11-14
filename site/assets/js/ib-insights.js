/* IB Tools, the Network + clients block (#insights, IB_Network_Block design "IB Network + Clients", which grew from the
   IB_Network_Insights one), ported from the design's React component.
   A canvas draws the partner tree in glass: "You" (dark) at the top, the Sub-IBs level by level under it, links with
   pulses running up to you, the strongest branch (Northline) red. View 2 turns the same partners into glass bars by
   net deposits on a grid (each node grows into its bar, the tree fades). View 3 lays each bar down as a row: each
   partner's top client, a glass bar as long as the commission you earn from them, with the client's name, status
   ("Dormant risk" in red) and the partner it came through; the month's total on top. The views turn on their own
   (7.5 s on the tree, 5.5 s on the bars, 7 s on the clients) while the block is on screen and the pointer is not over
   the picture; a click on a view on the pill above it picks it and stops the turns. With "reduce motion" nothing moves: the
   picture is drawn once per view.
   The words drawn on the canvas come from its data-you / data-total ("{v}" = the sum) / data-net / data-comm ("{m}" =
   the month, in the page's language) / data-top / data-active / data-dormant / data-via ("{n}" = the partner). Names
   and figures are demo data. Below 641px (the phone mockup) the picture is packed tighter: smaller glass, levels
   closer, smaller words, no sum under "You" (the bars show it). */
(function () {
  var s = document.querySelector('[data-ib-ins]');
  if (!s) return;
  var fig = s.querySelector('.tq-ibi__fig'), stage = s.querySelector('.tq-ibi__stage'), cv = stage.querySelector('canvas');
  /* the views: buttons on a glass pill (a red pill slides over the picked one: --v on .tq-ibi__sel, data-dir = which way,
     so its leading edge moves first), and the picked view's line under it */
  var guide = s.querySelectorAll('.tq-ibi__b'), sel = s.querySelector('.tq-ibi__sel'), lines = s.querySelectorAll('.tq-ibi__cur > span');
  var lang = document.documentElement.lang || 'en', cased = !/^(ar|th|ja|ko|zh)/.test(lang), rtl = document.documentElement.dir === 'rtl';
  var upper = function (t) { if (!cased) return t; try { return t.toLocaleUpperCase(lang); } catch (e) { return t.toUpperCase(); } };
  var attr = function (n, d) { return cv.getAttribute('data-' + n) || d; };
  var month = 'November';
  try { month = new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2026, 10, 15)); } catch (e) {}
  var TXT = { you: upper(attr('you', 'You')), total: attr('total', '{v} total'), net: upper(attr('net', 'Network net deposits')),
    comm: upper(attr('comm', 'Your commissions · {m}').replace('{m}', month)), top: upper(attr('top', 'Top client of each partner')),
    active: attr('active', 'Active'), dormant: attr('dormant', 'Dormant risk'), via: attr('via', 'via {n}') };
  var F = 'Inter, system-ui, sans-serif';
  var coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);

  var NODES = [
    { id: 'r', name: 'You', par: null, net: 541500 },
    { id: 'n', name: 'Northline', par: 'r', net: 184200 },
    { id: 'o', name: 'K. Ortiz', par: 'n', net: 96900 },
    { id: 'v', name: 'E. Varga', par: 'o', net: 18300 },
    { id: 'b', name: 'Bluefin', par: 'n', net: 22400 },
    { id: 'm', name: 'Meridian', par: 'r', net: 131600 },
    { id: 'a', name: 'Atlas', par: 'm', net: 31200 },
    { id: 'k', name: 'S. Kumar', par: 'm', net: 12800 },
    { id: 'h', name: 'Harbor FX', par: 'r', net: 44100 }
  ];
  var BY = {};
  NODES.forEach(function (n) { BY[n.id] = n; });
  NODES.forEach(function (n) { n.kids = NODES.filter(function (x) { return x.par === n.id; }); n.depth = n.par ? BY[n.par].depth + 1 : 0; });
  (function () {   /* x of each node: leaves spread evenly, a parent above the middle of its children */
    var leaves = [];
    var dfs = function (n) { if (!n.kids.length) leaves.push(n); n.kids.forEach(dfs); };
    dfs(BY.r);
    leaves.forEach(function (l, i) { l.fx = (i + 0.5) / leaves.length; });
    var up = function (n) { n.kids.forEach(up); if (n.kids.length) n.fx = n.kids.reduce(function (a, k) { return a + k.fx; }, 0) / n.kids.length; };
    up(BY.r);
  })();
  var PARTNERS = NODES.filter(function (n) { return n.par; }).sort(function (a, b) { return b.net - a.net; });
  PARTNERS.forEach(function (p, i) { p.rank = i; });
  BY.r.rank = -1;
  var MAX = PARTNERS[0].net;
  var kfmt = function (v) { return '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k'; };
  /* view 3: the top client of each partner, in the partners' order (row i belongs to the partner ranked i) */
  var CL = [
    { n: 'D. Moreau', ib: 'Northline', amt: 112.00, s: 'a' },
    { n: 'R. Castillo', ib: 'Meridian', amt: 23.75, s: 'a' },
    { n: 'S. Haddad', ib: 'K. Ortiz', amt: 22.40, s: 'a' },
    { n: 'A. Lindqvist', ib: 'Harbor FX', amt: 18.20, s: 'a' },
    { n: 'M. Tanaka', ib: 'Atlas', amt: 14.60, s: 'a' },
    { n: 'L. Brennan', ib: 'Bluefin', amt: 9.10, s: 'a' },
    { n: 'J. Okafor', ib: 'E. Varga', amt: 5.60, s: 'd' },
    { n: 'P. Novak', ib: 'S. Kumar', amt: 3.40, s: 'a' }
  ];
  var CMAX = CL[0].amt;
  var STS = { a: [TXT.active, '#0A0A0A', '#55585F'], d: [TXT.dormant, '#E7131B', '#C40F16'] };
  var DUR = [7500, 5500, 7000];

  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var target = 0, manual = false, hover = false, vis = false, at = 0, raf = 0, draw = null;

  function setView(v, byHand) {
    if (byHand) { manual = true; clearTimeout(at); }
    if (sel) { sel.setAttribute('data-dir', v >= target ? 'f' : 'b'); sel.style.setProperty('--v', v); }
    target = v;
    for (var i = 0; i < guide.length; i++) { guide[i].classList.toggle('is-act', i === v); guide[i].setAttribute('aria-pressed', i === v ? 'true' : 'false'); }
    for (var j = 0; j < lines.length; j++) lines[j].classList.toggle('is-act', j === v);
    if (reduced && draw) draw(performance.now());
  }
  function schedule() {
    clearTimeout(at);
    at = setTimeout(function () {
      if (manual) return;
      if (hover || !vis) { schedule(); return; }
      setView((target + 1) % 3); schedule();
    }, DUR[target]);
  }
  for (var g = 0; g < guide.length; g++) guide[g].addEventListener('click', setView.bind(null, g, true));
  fig.addEventListener('mouseenter', function () { hover = true; });
  fig.addEventListener('mouseleave', function () { hover = false; });

  function start() {
    var ctx = cv.getContext('2d');
    var PI2 = Math.PI * 2, cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; }, eo = function (v) { return 1 - Math.pow(1 - v, 3); };
    var eio = function (v) { return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }, lerp = function (a, b, t) { return a + (b - a) * t; };
    var W = 0, H = 0, dpr = 1, k = 1, top = 0, bot = 0, L = 0, R = 0, base = 0, maxH = 0, colW = 0, bw = 0, ph = false;
    var rowTop = 0, pitch = 0, capH = 0, x0 = 0, maxLen = 0;
    var phone = window.matchMedia ? matchMedia('(max-width: 640px)') : null;
    var size = function () {
      W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return;
      dpr = Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);   /* phones: 1.5x is sharp enough and lighter for the blurred glass */
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ph = !!(phone && phone.matches);
      if (ph) { k = 0.55; top = 6; bot = H - 4; L = 4; R = W - 4; base = H - 36; maxH = base - top - 46; }
      else {
        k = Math.max(0.68, Math.min(1, W / 620));
        top = 24; bot = H - 10; L = 6; R = W - 6;
        base = bot - (W < 520 ? 44 : 34); maxH = base - top - 70;
      }
      colW = (R - L) / PARTNERS.length; bw = Math.max(16, Math.min(46, colW * 0.56));
      /* view 3's rows: under the heading, one per client; the bars start a third of the way in */
      rowTop = top + (ph ? 40 : 74); pitch = (base + 10 - rowTop) / CL.length; capH = Math.max(ph ? 11 : 14, Math.min(30, pitch * 0.5));
      x0 = L + Math.min(210, (R - L) * (ph ? 0.38 : 0.34)); maxLen = R - x0 - (ph ? 56 : 76);
      if (reduced && draw) draw(performance.now());
    };
    if (window.ResizeObserver) new ResizeObserver(size).observe(stage); else window.addEventListener('resize', size);
    size();
    var RB = [30, 24, 19, 15];
    var lvY = function (d) { return ph ? top + 22 + d * ((H - 64 - top - 22) / 3) : top + 34 + d * ((base - top - 70) / 3); };
    var rr = function (x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, r); else ctx.rect(x - w / 2, y - h / 2, w, h); };
    var KIND = {
      silver: { c: 'rgba(255,255,255,0.10)', e: 'rgba(255,255,255,0.62)', shade: 'rgba(18,22,30,0.16)', sh: 'rgba(18,22,30,0.2)', rim: ['rgba(255,255,255,1)', 'rgba(255,255,255,0.35)'], line: 'rgba(18,22,30,0.14)', glow: 'rgba(255,255,255,0.9)', caus: 'rgba(255,255,255,0.95)', spec: 0.95 },
      red: { c: 'rgba(231,19,27,0.42)', e: 'rgba(255,118,122,0.82)', shade: 'rgba(120,6,10,0.35)', sh: 'rgba(231,19,27,0.38)', rim: ['rgba(255,226,228,1)', 'rgba(255,120,124,0.5)'], line: 'rgba(150,10,16,0.35)', glow: 'rgba(255,190,192,0.85)', caus: 'rgba(255,214,216,0.95)', spec: 0.95 },
      dark: { c: 'rgba(14,15,18,0.86)', e: 'rgba(78,80,88,0.9)', shade: 'rgba(0,0,0,0.4)', sh: 'rgba(0,0,0,0.32)', rim: ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.12)'], line: 'rgba(0,0,0,0.5)', glow: 'rgba(255,255,255,0.35)', caus: 'rgba(255,255,255,0.4)', spec: 0.75 }
    };
    /* one glass shape (a disc or a bar): drop shadow, fresnel edge, darker bottom, inner glow, caustic, specular dots, rim */
    var glass = function (x, y, w, h, r, kind, al) {
      if (al <= 0.01 || w < 1 || h < 1) return;
      var K = KIND[kind], m = Math.min(w, h), x0 = x - w / 2, y0 = y - h / 2;
      ctx.save(); ctx.globalAlpha = al;
      ctx.shadowColor = K.sh; ctx.shadowBlur = ph ? 14 : 24; ctx.shadowOffsetY = ph ? 7 : 12;
      rr(x, y, w, h, r); ctx.fillStyle = K.c; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.save(); rr(x, y, w, h, r); ctx.clip();
      var fg = ctx.createRadialGradient(x - w * 0.08, y - h * 0.12, 0, x, y, Math.max(w, h) * 0.62);
      fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(0.62, 'rgba(255,255,255,0)'); fg.addColorStop(1, K.e);
      ctx.fillStyle = fg; ctx.fillRect(x0, y0, w, h);
      var sg = ctx.createLinearGradient(0, y0, 0, y0 + h);
      sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.55, 'rgba(0,0,0,0)'); sg.addColorStop(1, K.shade);
      ctx.fillStyle = sg; ctx.fillRect(x0, y0, w, h);
      ctx.shadowColor = K.glow; ctx.shadowBlur = m * 0.18; ctx.lineWidth = Math.max(2, m * 0.06); ctx.strokeStyle = K.glow;
      rr(x, y, w + ctx.lineWidth, h + ctx.lineWidth, r + ctx.lineWidth / 2); ctx.stroke();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      var cy = y0 + h - m * 0.2, cg = ctx.createRadialGradient(x, cy, 0, x, cy, w * 0.36);
      cg.addColorStop(0, K.caus); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.translate(x, cy); ctx.scale(1, 0.38); ctx.translate(-x, -cy); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, cy, w * 0.36, 0, PI2); ctx.fill(); ctx.restore();
      ctx.globalAlpha = al * K.spec;
      ctx.beginPath(); ctx.ellipse(x - w * 0.18, y0 + m * 0.22, w * 0.2, m * 0.09, -0.35, 0, PI2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + w * 0.2, y0 + m * 0.2, w * 0.05, m * 0.04, 0, 0, PI2); ctx.fill();
      if (h > w * 1.4) { var vg = ctx.createLinearGradient(0, y0, 0, y0 + h); vg.addColorStop(0, 'rgba(255,255,255,0.55)'); vg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = vg; ctx.fillRect(x - w * 0.32, y0 + m * 0.4, w * 0.1, h - m * 0.7); }
      ctx.restore();
      ctx.globalAlpha = al;
      var rg = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h); rg.addColorStop(0, K.rim[0]); rg.addColorStop(0.5, K.rim[1]); rg.addColorStop(1, K.rim[0]);
      rr(x, y, w, h, r); ctx.strokeStyle = rg; ctx.lineWidth = 1.4; ctx.stroke();
      rr(x, y, w + 1.6, h + 1.6, r + 0.8); ctx.strokeStyle = K.line; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    };
    var bez = function (p, q, t) { var my = (p.y + q.y) / 2, it = 1 - t; return { x: it * it * it * p.x + 3 * it * it * t * p.x + 3 * it * t * t * q.x + t * t * t * q.x, y: it * it * it * p.y + 3 * it * it * t * my + 3 * it * t * t * my + t * t * t * q.y }; };
    var spaced = function (px) { if ('letterSpacing' in ctx) ctx.letterSpacing = (cased ? px : 0) + 'px'; };
    var last = performance.now(), T = 0, rv = 0, mt = 0, mc = 0;
    /* view 3: a row per client — a glass bar as long as the commission, starting at x0 */
    var rows = function () {
      return CL.map(function (c, i) { var rw = Math.max(capH, maxLen * c.amt / CMAX); return { x: x0 + rw / 2, y: rowTop + (i + 0.5) * pitch, w: rw, h: capH, rad: capH / 2, rw: rw }; });
    };
    /* view 3's words for a row: the client (red for the top one), a status dot, "status · via partner", the amount */
    var rowLabel = function (s) {
      var i = s.n.rank, c = CL[i], S2 = STS[c.s], g = s.g, nameC = i === 0 ? '#C40F16' : '#0A0A0A', amt = '$' + c.amt.toFixed(2);
      ctx.textAlign = 'left';
      ctx.font = '700 ' + (ph ? 11 : 13.5) + 'px ' + F; ctx.fillStyle = nameC; ctx.fillText(c.n, L, g.y - 2);
      ctx.fillStyle = S2[1]; ctx.beginPath(); ctx.arc(L + 3, g.y + (ph ? 8 : 10), ph ? 2.5 : 3, 0, PI2); ctx.fill();
      /* status and partner: a sentence of the page's language around a Latin name — written right to left in Arabic */
      ctx.font = '600 ' + (ph ? 9.5 : 11) + 'px ' + F; ctx.fillStyle = S2[2]; if (rtl) ctx.direction = 'rtl';
      ctx.fillText(S2[0] + ' · ' + TXT.via.replace('{n}', c.ib), L + (ph ? 9 : 11), g.y + (ph ? 11.5 : 14)); ctx.direction = 'ltr';
      ctx.font = '700 ' + (ph ? 10.5 : 12.5) + 'px ' + F; ctx.fillStyle = nameC; ctx.textBaseline = 'middle'; ctx.fillText(amt, x0 + g.rw + (ph ? 8 : 12), g.y + 1); ctx.textBaseline = 'alphabetic';
    };

    draw = function (now) {
      if (!W) return;
      var still = reduced;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      T += dt; rv += dt;
      /* two moves: tree -> bars (mt, 0..1), bars -> client rows (mc, 0..1) */
      var tb = Math.min(1, target), tc = target === 2 ? 1 : 0;
      if (still) { rv = 9; mt = tb; mc = tc; }
      mt += Math.sign(tb - mt) * Math.min(Math.abs(tb - mt), dt / 1.25);
      mc += Math.sign(tc - mc) * Math.min(Math.abs(tc - mc), dt / 1.25);
      var cf = eio(cl(mc)), LAY = rows();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var st = NODES.map(function (n) {
        var r = RB[n.depth] * k, tx = L + n.fx * (R - L), ty = lvY(n.depth);
        var mi = n.rank < 0 ? eio(cl(mt * 1.3)) : eio(cl(mt * 1.35 - n.rank * 0.05));
        var pop = eo(cl((rv - n.depth * 0.32) / 0.4));
        var bx = tx, bh = 2 * r, by = ty, w = 2 * r, h = 2 * r, rad = r;
        if (n.rank >= 0) { bx = L + (n.rank + 0.5) * colW; bh = Math.max(bw, maxH * n.net / MAX); by = base - bh / 2; w = lerp(2 * r, bw, mi); h = lerp(2 * r, bh, mi); rad = lerp(r, Math.min(12, bw / 2), mi); }
        var x = lerp(tx, bx, mi), y = lerp(ty, by, mi), ci = 0, g = null;
        if (n.rank >= 0) { g = LAY[n.rank]; ci = eio(cl(mc * 1.35 - n.rank * 0.05)); x = lerp(x, g.x, ci); y = lerp(y, g.y, ci); w = lerp(w, g.w, ci); h = lerp(h, g.h, ci); rad = lerp(rad, g.rad, ci); }
        return { n: n, r: r, tx: tx, ty: ty, mi: mi, ci: ci, g: g, pop: pop, x: x, y: y, w: w, h: h, rad: rad, bx: bx, bh: bh };
      });
      var S = {}; st.forEach(function (x) { S[x.n.id] = x; });
      var net = 1 - eio(cl(mt * 1.6));
      /* view 3's heading: the month's commissions, what the rows are, the total; lines between the rows */
      if (cf > 0.01) {
        ctx.save(); ctx.globalAlpha = cf; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '700 ' + (ph ? (cased ? 9 : 10) : (cased ? 10 : 11)) + 'px ' + F; spaced(ph ? 1.4 : 1.8); ctx.fillStyle = '#6B6E75';
        ctx.fillText(TXT.comm, L, top + (ph ? 9 : 14));
        if (!ph && ctx.measureText(TXT.comm).width + ctx.measureText(TXT.top).width + 24 < R - L) { ctx.textAlign = 'right'; ctx.fillText(TXT.top, R, top + 14); ctx.textAlign = 'left'; }
        spaced(0);
        ctx.font = '700 ' + (ph ? 15 : Math.round(26 * k)) + 'px ' + F; ctx.fillStyle = '#0A0A0A'; ctx.fillText('$4,812.60', L, ph ? top + 27 : top + 14 + 30 * k);
        ctx.strokeStyle = 'rgba(18,22,30,0.08)'; ctx.lineWidth = 1;
        for (var ri = 1; ri < CL.length; ri++) { var ly = Math.round(rowTop + ri * pitch) + 0.5, lp = cl(cf * 1.4 - ri * 0.04); ctx.beginPath(); ctx.moveTo(L, ly); ctx.lineTo(L + (R - L) * lp, ly); ctx.stroke(); }
        ctx.restore();
      }
      /* the chart's grid, total and scale */
      var ga = eio(cl((mt - 0.3) / 0.7)) * (1 - cf);
      if (ga > 0) {
        ctx.save(); ctx.globalAlpha = ga;
        ctx.strokeStyle = 'rgba(18,22,30,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, base + 0.5); ctx.lineTo(R, base + 0.5); ctx.stroke();
        ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(18,22,30,0.1)';
        ctx.font = '500 ' + (ph ? 9 : 10) + 'px ' + F; ctx.fillStyle = '#8A8D93'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        [50000, 100000, 150000].forEach(function (v) { var y = base - maxH * v / MAX + 0.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); ctx.fillText(kfmt(v), R, y - 3); });
        ctx.setLineDash([]);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '700 ' + (ph ? (cased ? 9 : 10) : (cased ? 10 : 11)) + 'px ' + F; spaced(ph ? 1.4 : 1.8); ctx.fillStyle = '#6B6E75'; ctx.fillText(TXT.net, L, top + (ph ? 9 : 14)); spaced(0);
        ctx.font = '700 ' + (ph ? 15 : Math.round(26 * k)) + 'px ' + F; ctx.fillStyle = '#0A0A0A'; ctx.fillText('$541,500', L, ph ? top + 27 : top + 14 + 30 * k);
        ctx.restore();
      }
      /* links and pulses */
      if (net > 0.01) {
        NODES.forEach(function (n) {
          if (!n.par) return;
          var c = S[n.id], p = S[n.par], prog = cl((rv - (n.depth - 1) * 0.32 - 0.18) / 0.32); if (prog <= 0) return;
          var red = n.id === 'n';
          var P0 = { x: p.x, y: p.y + p.r }, P1 = { x: c.x, y: c.y - c.r };
          ctx.save(); ctx.globalAlpha = net;
          ctx.beginPath(); ctx.moveTo(P0.x, P0.y);
          for (var j = 1; j <= 24; j++) { var q = bez(P0, P1, j / 24 * prog); ctx.lineTo(q.x, q.y); }
          ctx.strokeStyle = red ? '#E7131B' : 'rgba(18,22,30,0.24)'; ctx.lineWidth = red ? 2 : 1.4; ctx.stroke();
          if (rv > 1.5 && !still) {
            for (var i = 0; i < 2; i++) {
              var t = ((T * (red ? 0.55 : 0.4) + i * 0.5 + n.fx) % 1), b = bez(P0, P1, 1 - t), fa = Math.sin(Math.PI * t);
              ctx.globalAlpha = net * fa;
              if (red) { ctx.shadowColor = '#E7131B'; ctx.shadowBlur = 12; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(b.x, b.y, 4.5, 0, PI2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#E7131B'; ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, PI2); ctx.fill(); }
              else { ctx.fillStyle = 'rgba(18,22,30,0.55)'; ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, PI2); ctx.fill(); }
            }
          }
          ctx.restore();
        });
      }
      /* nodes (the red one last, on top) */
      st.slice().sort(function (a, b) { return (a.n.id === 'n') - (b.n.id === 'n'); }).forEach(function (x) {
        var n = x.n, sc = 0.4 + 0.6 * x.pop, al = x.pop;
        if (n.rank < 0) { glass(x.x, x.y, x.w * sc, x.h * sc, x.rad * sc, 'dark', al * (1 - x.mi)); return; }
        var breathe = still ? 1 : 1 + 0.025 * Math.sin(T * 1.6 + n.fx * 9) * (1 - x.mi);
        glass(x.x, x.y, x.w * sc * breathe, x.h * sc * breathe, x.rad * sc, n.id === 'n' ? 'red' : 'silver', al);
      });
      /* labels */
      ctx.textAlign = 'center';
      var stag = colW < 66;
      st.forEach(function (x) {
        var n = x.n, la = cl((rv - n.depth * 0.32 - 0.2) / 0.35);
        if (la <= 0) return;
        if (n.rank < 0) {
          var a = la * (1 - x.mi); if (a <= 0.01) return;
          ctx.globalAlpha = a; ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle';
          var fs = ph ? 9 : Math.round(11 * k + 1), fmin = ph ? 6 : 8; ctx.font = '700 ' + fs + 'px ' + F; spaced(ph ? 0.6 : 1);
          while (fs > fmin && ctx.measureText(TXT.you).width > x.r * 1.6) { fs--; ctx.font = '700 ' + fs + 'px ' + F; }
          ctx.fillText(TXT.you, x.x, x.y + 1); spaced(0);
          ctx.textBaseline = 'alphabetic';
          if (!ph) { ctx.font = '500 11px ' + F; ctx.fillStyle = '#6B6E75'; ctx.fillText(TXT.total.replace('{v}', kfmt(n.net)), x.x, x.y + x.r + 18); }
          return;
        }
        var nameY = ph ? lerp(x.ty + x.r + 12, base + 13 + (stag && n.rank % 2 ? 12 : 0), x.mi) : lerp(x.ty + x.r + 17, base + 17 + (stag && n.rank % 2 ? 14 : 0), x.mi);
        var valY = ph ? lerp(x.ty + x.r + 23, base - x.bh - 6, x.mi) : lerp(x.ty + x.r + 31, base - x.bh - 9, x.mi);
        /* view 3: the row's words come in as the bar lands; the partner's name and sum go first */
        var ra = la * cl((x.ci - 0.45) / 0.55);
        if (ra > 0.01) { ctx.save(); ctx.globalAlpha = ra; ctx.textBaseline = 'alphabetic'; rowLabel(x); ctx.restore(); ctx.textAlign = 'center'; }
        ctx.globalAlpha = la * (1 - cl(x.ci * 2.2));
        if (ctx.globalAlpha <= 0.01) return;
        ctx.font = '700 ' + (ph ? 10 : x.mi > 0.5 && stag ? 10 : 12) + 'px ' + F; ctx.fillStyle = '#0A0A0A'; ctx.fillText(n.name, x.x, nameY);
        ctx.font = ph ? (x.mi > 0.5 ? '700 10px ' : '500 10px ') + F : x.mi > 0.5 ? '700 12px ' + F : '500 11px ' + F; ctx.fillStyle = n.id === 'n' ? '#C40F16' : x.mi > 0.5 ? '#0A0A0A' : '#6B6E75'; ctx.fillText(kfmt(n.net), x.x, valY);
      });
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    };

    if (reduced) { draw(performance.now()); return; }
    var loop = function (now) {
      raf = requestAnimationFrame(loop);
      if (vis) { try { draw(now); } catch (e) { cancelAnimationFrame(raf); } } else last = now;
    };
    raf = requestAnimationFrame(loop);
  }

  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }, { threshold: 0.2 }).observe(s);
  else vis = true;
  var go = function () { start(); if (!reduced) schedule(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
})();
