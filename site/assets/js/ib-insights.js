/* IB Tools, the Network insights block (#insights, IB_Network_Insights design), ported from the design's React component.
   A canvas draws the partner tree in glass: "You" (dark) at the top, the Sub-IBs level by level under it, links with
   pulses running up to you, the strongest branch (Northline) red. View 2 turns the same partners into glass bars by
   net deposits on a grid (each node grows into its bar, the tree fades). The views swap on their own (7.5 s on the tree,
   5.5 s on the bars) while the block is on screen and the pointer is not over the picture; a click on a view on the left
   picks it and stops the swapping. With "reduce motion" nothing moves: the picture is drawn once per view.
   The words drawn on the canvas come from its data-you / data-total ("{v}" = the sum) / data-net. Names and figures
   are demo data. */
(function () {
  var s = document.querySelector('[data-ib-ins]');
  if (!s) return;
  var fig = s.querySelector('.tq-ibi__fig'), stage = s.querySelector('.tq-ibi__stage'), cv = stage.querySelector('canvas');
  var guide = s.querySelectorAll('.tq-ibi__g');
  var lang = document.documentElement.lang || 'en', cased = !/^(ar|th|ja|ko|zh)/.test(lang);
  var upper = function (t) { if (!cased) return t; try { return t.toLocaleUpperCase(lang); } catch (e) { return t.toUpperCase(); } };
  var TXT = { you: upper(cv.getAttribute('data-you') || 'You'), total: cv.getAttribute('data-total') || '{v} total', net: upper(cv.getAttribute('data-net') || 'Network net deposits') };
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

  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var target = 0, manual = false, hover = false, vis = false, at = 0, raf = 0, draw = null;

  function setView(v, byHand) {
    if (byHand) { manual = true; clearTimeout(at); }
    target = v;
    for (var i = 0; i < guide.length; i++) { guide[i].classList.toggle('is-act', i === v); guide[i].setAttribute('aria-pressed', i === v ? 'true' : 'false'); }
    if (reduced && draw) draw(performance.now());
  }
  function schedule() {
    clearTimeout(at);
    at = setTimeout(function () {
      if (manual) return;
      if (hover || !vis) { schedule(); return; }
      setView(1 - target); schedule();
    }, target === 0 ? 7500 : 5500);
  }
  for (var g = 0; g < guide.length; g++) guide[g].addEventListener('click', setView.bind(null, g, true));
  fig.addEventListener('mouseenter', function () { hover = true; });
  fig.addEventListener('mouseleave', function () { hover = false; });

  function start() {
    var ctx = cv.getContext('2d');
    var PI2 = Math.PI * 2, cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; }, eo = function (v) { return 1 - Math.pow(1 - v, 3); };
    var eio = function (v) { return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }, lerp = function (a, b, t) { return a + (b - a) * t; };
    var W = 0, H = 0, dpr = 1, k = 1, top = 0, bot = 0, L = 0, R = 0, base = 0, maxH = 0, colW = 0, bw = 0;
    var size = function () {
      W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return;
      dpr = Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);   /* phones: 1.5x is sharp enough and lighter for the blurred glass */
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      k = Math.max(0.68, Math.min(1, W / 620));
      top = 24; bot = H - 10; L = 6; R = W - 6;
      base = bot - (W < 520 ? 44 : 34); maxH = base - top - 70;
      colW = (R - L) / PARTNERS.length; bw = Math.max(16, Math.min(46, colW * 0.56));
      if (reduced && draw) draw(performance.now());
    };
    if (window.ResizeObserver) new ResizeObserver(size).observe(stage); else window.addEventListener('resize', size);
    size();
    var RB = [30, 24, 19, 15];
    var lvY = function (d) { return top + 34 + d * ((base - top - 70) / 3); };
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
      ctx.shadowColor = K.sh; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
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
    var last = performance.now(), T = 0, rv = 0, mt = 0;

    draw = function (now) {
      if (!W) return;
      var still = reduced;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      T += dt; rv += dt;
      if (still) { rv = 9; mt = target; }
      mt += Math.sign(target - mt) * Math.min(Math.abs(target - mt), dt / 1.25);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var st = NODES.map(function (n) {
        var r = RB[n.depth] * k, tx = L + n.fx * (R - L), ty = lvY(n.depth);
        var mi = n.rank < 0 ? eio(cl(mt * 1.3)) : eio(cl(mt * 1.35 - n.rank * 0.05));
        var pop = eo(cl((rv - n.depth * 0.32) / 0.4));
        var bx = tx, bh = 2 * r, by = ty, w = 2 * r, h = 2 * r, rad = r;
        if (n.rank >= 0) { bx = L + (n.rank + 0.5) * colW; bh = Math.max(bw, maxH * n.net / MAX); by = base - bh / 2; w = lerp(2 * r, bw, mi); h = lerp(2 * r, bh, mi); rad = lerp(r, Math.min(12, bw / 2), mi); }
        return { n: n, r: r, tx: tx, ty: ty, mi: mi, pop: pop, x: lerp(tx, bx, mi), y: lerp(ty, by, mi), w: w, h: h, rad: rad, bx: bx, bh: bh };
      });
      var S = {}; st.forEach(function (x) { S[x.n.id] = x; });
      var net = 1 - eio(cl(mt * 1.6));
      /* the chart's grid, total and scale */
      var ga = eio(cl((mt - 0.3) / 0.7));
      if (ga > 0) {
        ctx.save(); ctx.globalAlpha = ga;
        ctx.strokeStyle = 'rgba(18,22,30,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, base + 0.5); ctx.lineTo(R, base + 0.5); ctx.stroke();
        ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(18,22,30,0.1)';
        ctx.font = '500 10px ' + F; ctx.fillStyle = '#8A8D93'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        [50000, 100000, 150000].forEach(function (v) { var y = base - maxH * v / MAX + 0.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); ctx.fillText(kfmt(v), R, y - 3); });
        ctx.setLineDash([]);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '700 ' + (cased ? 10 : 11) + 'px ' + F; spaced(1.8); ctx.fillStyle = '#6B6E75'; ctx.fillText(TXT.net, L, top + 14); spaced(0);
        ctx.font = '700 ' + Math.round(26 * k) + 'px ' + F; ctx.fillStyle = '#0A0A0A'; ctx.fillText('$541,500', L, top + 14 + 30 * k);
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
          var fs = Math.round(11 * k + 1); ctx.font = '700 ' + fs + 'px ' + F; spaced(1);
          while (fs > 8 && ctx.measureText(TXT.you).width > x.r * 1.6) { fs--; ctx.font = '700 ' + fs + 'px ' + F; }
          ctx.fillText(TXT.you, x.x, x.y + 1); spaced(0);
          ctx.textBaseline = 'alphabetic'; ctx.font = '500 11px ' + F; ctx.fillStyle = '#6B6E75'; ctx.fillText(TXT.total.replace('{v}', kfmt(n.net)), x.x, x.y + x.r + 18);
          return;
        }
        var nameY = lerp(x.ty + x.r + 17, base + 17 + (stag && n.rank % 2 ? 14 : 0), x.mi), valY = lerp(x.ty + x.r + 31, base - x.bh - 9, x.mi);
        ctx.globalAlpha = la;
        ctx.font = '700 ' + (x.mi > 0.5 && stag ? 10 : 12) + 'px ' + F; ctx.fillStyle = '#0A0A0A'; ctx.fillText(n.name, x.x, nameY);
        ctx.font = x.mi > 0.5 ? '700 12px ' + F : '500 11px ' + F; ctx.fillStyle = n.id === 'n' ? '#C40F16' : x.mi > 0.5 ? '#0A0A0A' : '#6B6E75'; ctx.fillText(kfmt(n.net), x.x, valY);
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
