/* IB Tools: the black hole block (IB_Tools_Black_Hole_Obsidian design), drawn on a canvas. Event chips orbit an
 * obsidian black hole and fall in; a flash, and crystals stack into the volume-by-lot bars, regroup into the Sub-IB
 * tree and drain back into the hole; the HUD under it follows the three steps (Pull, Every lot, Every tier).
 * The drawing is the design's, as it is (theme obsidian, liquid crystals); its type is Inter. The loop runs only while
 * the block is on screen and the tab is visible; with reduced motion it draws one still frame (the hole). */
(function () {
  const root = document.querySelector('[data-ib-hole]');
  if (!root) return;
  const cv = root.querySelector('canvas');
  const fills = Array.from(root.querySelectorAll('[data-ib-hole-fill]')), tabs = Array.from(root.querySelectorAll('[data-ib-hole-tab]'));
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let draw = () => {};
  /* the HUD: if a long translation does not fit, the step numbers go (class is-tight) */
  const hud = root.querySelector('.tq-ibb__tabs');
  const tight = () => { hud.classList.remove('is-tight'); if (tabs.some((t) => { const x = t.querySelector('span'); return x.scrollWidth > x.clientWidth + 1; })) hud.classList.add('is-tight'); };
  const start = () => {
    const ctx = cv.getContext('2d');
    const DPR0 = Math.min(2, window.devicePixelRatio || 1); let dpr = DPR0;
    const PI2 = Math.PI * 2;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const eo = v => 1 - Math.pow(1 - v, 3), ei = v => v * v * v, eio = v => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
    const rgb = h => { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); };
    const rgba = (c, a) => 'rgba(' + c + ',' + a.toFixed(3) + ')';
    const RED = '#E7131B';
    const base = { bar: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.95)'], barR: ['rgba(231,19,27,0.08)', 'rgba(231,19,27,0.5)'], edge: '18,22,30', edgeA: 0.26, mute: '#6B6E75', chip: ['rgba(255,255,255,0.86)', '#0A0A0A', '#C40F16', '#FFFFFF'], flash: ['255,255,255', '231,19,27'] };
    const TH = {
      silver: Object.assign({}, base, { bands: ['#FFFFFF', '#D4D6DB', '#FFFFFF', '#B9BCC3', '#F4F5F7'], inner: RED, shade: '18,22,30', shadeA: 0.62, photon: RED, core: ['#2E3036', '#0B0C0E', '#16171B'], dust: ['rgba(255,255,255,0.95)', 'rgba(231,19,27,0.9)'] }),
      chrome: Object.assign({}, base, { bands: ['#FFFFFF', '#5A5D63', '#F4F5F7', '#8A8D93', '#2E3036', '#D4D6DB'], inner: RED, shade: '18,22,30', shadeA: 0.42, photon: RED, core: ['#3A3C42', '#050506', '#1E1F23'], dust: ['rgba(255,255,255,0.95)', 'rgba(231,19,27,0.95)'] }),
      ember: Object.assign({}, base, { bands: ['#FFE3E3', '#FF4148', '#E7131B', '#8E0B10', '#FF8A8E'], inner: '#FFFFFF', shade: '90,8,12', shadeA: 0.42, photon: '#FFE3E3', core: ['#2A1416', '#070505', '#140B0C'], dust: ['rgba(255,170,170,0.95)', 'rgba(255,255,255,0.95)'], barR: ['rgba(255,65,72,0.12)', 'rgba(255,65,72,0.65)'], edge: '120,14,18', edgeA: 0.32, flash: ['255,227,227', '231,19,27'] }),
      obsidian: Object.assign({}, base, { bands: ['#0A0A0A', '#3A3C42', '#18191D', '#6B6E75', '#FFFFFF', '#2A2C31'], inner: RED, shade: '0,0,0', shadeA: 0.3, photon: RED, core: ['#111113', '#000000', '#050506'], dust: ['rgba(40,42,48,0.9)', 'rgba(231,19,27,0.95)'], chip: ['rgba(18,19,22,0.88)', '#FFFFFF', '#FF4148', 'rgba(255,255,255,0.22)'] })
    };
    Object.values(TH).forEach(t => { t.bandsRgb = t.bands.map(rgb); t.innerRgb = rgb(t.inner); });
    const CRY = {
      silver: { body: ['rgba(255,255,255,0.88)', 'rgba(186,190,198,0.44)'], rim: ['rgba(255,255,255,0.98)', 'rgba(18,22,30,0.42)'], pool: 'rgba(255,255,255,0.34)', spec: 'rgba(255,255,255,0.95)', solid: ['#F4F5F7', '#B9BCC3', '#8A8D93'], trail: '150,154,162' },
      black: { body: ['rgba(78,80,88,0.86)', 'rgba(6,6,8,0.7)'], rim: ['rgba(255,255,255,0.62)', 'rgba(0,0,0,0.75)'], pool: 'rgba(255,255,255,0.14)', spec: 'rgba(255,255,255,0.7)', solid: ['#3A3C42', '#18191D', '#050506'], trail: '30,32,38' }
    };
    const LABELS = ['+$6.40 commission', 'New partner', '+$12.10', '0.8 lot', 'Weekly report', 'Sub-IB joined', '+$3.20 rebate', '1.5 lots', 'Payout sent', 'New client', 'Monthly report', '+$48.00', '2.0 lots', 'Partner L2', '+$9.75', 'Partner L5', 'XAUUSD 3.0 lots'];
    const BARS = [2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 11];
    const NODES = [
      { lv: 0, fx: 0, hx: 2, red: 1, par: -1 },
      { lv: 1, fx: -0.36, hx: 1, red: 1, par: 0 }, { lv: 1, fx: 0, hx: 1, par: 0 }, { lv: 1, fx: 0.36, hx: 1, par: 0 },
      { lv: 2, fx: -0.49, hx: 't', par: 1 }, { lv: 2, fx: -0.3, hx: 't', red: 1, par: 1 }, { lv: 2, fx: -0.13, hx: 't', par: 2 }, { lv: 2, fx: 0, hx: 't', par: 2 }, { lv: 2, fx: 0.13, hx: 't', par: 2 }, { lv: 2, fx: 0.3, hx: 't', par: 3 }, { lv: 2, fx: 0.49, hx: 't', par: 3 }
    ];
    const LVY = [-0.5, -0.15, 0.2];
    const cr = [];
    BARS.forEach((h, b) => { for (let j = 0; j < h; j++) cr.push({ b, j, ba: rnd(0, PI2), bd: rnd(0.35, 1.05), r0: rnd(0, PI2), sv: rnd(-7, 7), s1: b / 10 * 0.7 + rnd(0, 0.3), s2: rnd(0, 1), s3: rnd(0, 1), arc: rnd(-1, 1) }); });
    const slots = [];
    const hexRing = n => { const out = []; for (let q = -n; q <= n; q++) for (let r = -n; r <= n; r++) { if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= n) out.push([q + r / 2, r * 0.8660254]); } return out; };
    const HEXC = { 2: hexRing(2), 1: hexRing(1), t: [[-0.5, -0.2886751], [0.5, -0.2886751], [0, 0.5773503]] };
    NODES.forEach((nd, ni) => HEXC[nd.hx].forEach(o => slots.push({ ni, ox: o[0], oy: o[1] })));
    slots.sort((a, b) => NODES[a.ni].fx - NODES[b.ni].fx || a.ni - b.ni);
    cr.forEach((c, i) => Object.assign(c, slots[i]));
    const mkRing = (q, n) => ({ q, lw: rnd(1, 2.6) * (1 - q * 0.45), dash: [rnd(18, 110) * (1 + q), rnd(5, 36)], spd: rnd(0.8, 1.25) / Math.sqrt(0.25 + q), col: (Math.random() * n) | 0, al: 0.85 * Math.pow(1 - q, 1.1) + 0.08 });
    const SMALL = innerWidth < 700, ring = (n) => Array.from({ length: n }, (_, i) => mkRing(i / (n - 1), 6));   /* phones: fewer rings */
    const DISK = ring(SMALL ? 20 : 36), HTOP = ring(SMALL ? 10 : 18), HBOT = ring(SMALL ? 6 : 9);

    const gemCache = {}, barCache = {}; let chipCache = new Map(); let chipK = 1, sparks = [], W = 0, H = 0, cx = 0, cy = 0, RX = 500, R = 90, gw = 400, gh = 300, step = 26, cs = 11, parts = [], chips = [];
    const TILT = 0.075, ZOOM = 1.3;
    const resetChips = () => {
      const sh = ['Weekly report', 'Most active clients'].concat(LABELS.filter(l => l !== 'Weekly report').sort(() => Math.random() - 0.5)), n = chips.length;
      for (let i = sh.length - 1; i > 0; i--) { if (i < n) { const j = (Math.random() * (i + 1)) | 0; const t = sh[i]; sh[i] = sh[j]; sh[j] = t; } }
      chips.forEach((c, i) => Object.assign(c, { ro: 1.5 + 0.8 * ((i * 0.618) % 1), a: i / n * PI2 + rnd(-0.2, 0.2), w: rnd(0.14, 0.28), fd: rnd(0, 0.5), bob: rnd(0, PI2), label: sh[i % sh.length], ep: 0 }));
      chips.slice().sort((x, y) => x.ro - y.ro).forEach((c, i) => { c.ed = n > 1 ? i / (n - 1) * 1.1 : 0; });
      sparks = [];
    };
    const size = () => {
      W = Math.round(root.clientWidth); H = Math.round(root.clientHeight); if (!W || !H) return;
      const sh = H - 70;
      cx = W / 2; cy = sh * 0.52;
      const tall = W < H;   /* phones, portrait tablets: a bigger hole, wider bars and tree than the landscape design */
      RX = Math.min(W * 0.47, 760); R = Math.min(RX * (tall ? 0.28 : 0.2), sh * 0.17);
      gw = Math.min(W < 700 ? W - 48 : tall ? W * 0.72 : RX * 1.1, W - 48); gh = Math.min(sh * 0.6, gw * 0.66);
      tight();
      step = gh / 11.6; cs = step * 0.46; chipK = Math.min(1, Math.max(0.55, R / 110));
      dpr = Math.max(1, Math.min(W < 700 ? 1.5 : DPR0, Math.sqrt(3.4e6 / (W * H))));   /* phones: 1.5x, the canvas raster is what costs there */
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      for (const key in gemCache) delete gemCache[key]; chipCache = new Map(); for (const key in barCache) delete barCache[key];
      parts = Array.from({ length: Math.round(Math.min(260, W / 5)) }, () => ({ r: rnd(1.6, RX / R), a: rnd(0, PI2), z: rnd(0.7, 2), red: Math.random() < 0.1 }));
      chips = Array.from({ length: W < 700 ? 6 : 9 }, () => ({})); resetChips();
    };
    size();
    if (window.ResizeObserver) new ResizeObserver(() => { size(); if (still) draw(); }).observe(root);

    const nXY = nd => ({ x: cx + nd.fx * gw, y: cy + LVY[nd.lv] * gh });
    const barPos = c => ({ x: cx - gw / 2 + (c.b + 0.5) * gw / 11, y: cy + gh / 2 - (c.j + 0.5) * step });
    const nodePos = c => {
      const p = nXY(NODES[c.ni]), ns = cs * 0.8, d = ns * 1.7320508 + Math.max(1.5, ns * 0.16);
      return { x: p.x + c.ox * d, y: p.y + c.oy * d, s: ns };
    };
    const bz = (p, q, t) => {
      const m = (p.y + q.y) / 2, it = 1 - t;
      return { x: it * it * it * p.x + 3 * it * it * t * p.x + 3 * it * t * t * q.x + t * t * t * q.x, y: it * it * it * p.y + 3 * it * it * t * m + 3 * it * t * t * m + t * t * t * q.y };
    };
    let T = 0, spin = 0, wt = 0, bulge = 0.035;
    const wob = th => {
      const s = Math.sin(th); let w = s > 0 ? 1 + bulge * s * s : 1;
      for (const sp of sparks) { let d = Math.abs(th - sp.a) % PI2; if (d > Math.PI) d = PI2 - d; const env = sp.t < 0.12 ? sp.t / 0.12 : Math.pow(Math.max(0, 1 - (sp.t - 0.12) / 0.48), 2); w += 0.04 * env * Math.exp(-d * d / 0.22); }
      return w;
    };
    const rrect = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };

    const HEXV = [0, 1, 2, 3, 4, 5].map(i => { const t = -Math.PI / 2 + i * Math.PI / 3; return [Math.cos(t), Math.sin(t)]; });
    const hex = (s, rr) => {
      ctx.beginPath(); const v = HEXV;
      ctx.moveTo((v[5][0] + v[0][0]) / 2 * s, (v[5][1] + v[0][1]) / 2 * s);
      for (let i = 0; i < 6; i++) { const a = v[i], b = v[(i + 1) % 6]; ctx.arcTo(a[0] * s, a[1] * s, b[0] * s, b[1] * s, rr); }
      ctx.closePath();
    };
    const gemDraw = (c, style, s, dark) => {
      const C = dark ? CRY.black : CRY.silver, rr = s * 0.1;
      const hx = (S, r) => { c.beginPath(); const v = HEXV; c.moveTo((v[5][0] + v[0][0]) / 2 * S, (v[5][1] + v[0][1]) / 2 * S); for (let i = 0; i < 6; i++) { const a = v[i], b = v[(i + 1) % 6]; c.arcTo(a[0] * S, a[1] * S, b[0] * S, b[1] * S, r); } c.closePath(); };
      hx(s, rr);
      if (style === 'solid') {
        const g = c.createLinearGradient(0, -s, 0, s); g.addColorStop(0, C.solid[0]); g.addColorStop(1, C.solid[2]);
        c.fillStyle = g; c.fill(); c.strokeStyle = C.solid[1]; c.lineWidth = 1; c.stroke(); return;
      }
      const g = c.createLinearGradient(0, -s, 0, s); g.addColorStop(0, C.body[0]); g.addColorStop(1, C.body[1]);
      c.shadowColor = 'rgba(18,22,30,0.2)'; c.shadowBlur = 9 * dpr; c.shadowOffsetY = 3 * dpr;
      c.fillStyle = g; c.fill();
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
      const sg = c.createLinearGradient(0, -s, 0, s); sg.addColorStop(0, C.rim[0]); sg.addColorStop(1, C.rim[1]);
      c.strokeStyle = sg; c.lineWidth = 1; c.stroke();
      hx(s * 0.56, rr * 0.6); c.strokeStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8; c.stroke();
      if (style === 'liquid') {
        const pg = c.createLinearGradient(0, s * 0.05, 0, s); pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(1, C.pool);
        hx(s - 1.2, rr); c.fillStyle = pg; c.fill();
        const A = HEXV[5], B = HEXV[0], k = s * 0.84;
        c.lineCap = 'round'; c.strokeStyle = C.spec; c.lineWidth = 1;
        c.beginPath(); c.moveTo((A[0] + (B[0] - A[0]) * 0.15) * k, (A[1] + (B[1] - A[1]) * 0.15) * k); c.lineTo((A[0] + (B[0] - A[0]) * 0.85) * k, (A[1] + (B[1] - A[1]) * 0.85) * k); c.stroke();
      }
    };
    const gemSprite = (style, dark) => {
      const key = style + (dark ? 1 : 0); if (gemCache[key]) return gemCache[key];
      const S = Math.max(4, cs), w = 2 * S + 28, c = document.createElement('canvas');
      c.width = c.height = Math.ceil(w * dpr);
      const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, w / 2 * dpr, w / 2 * dpr);
      gemDraw(g, style, S, dark);
      return gemCache[key] = { c, S, w };
    };
    const gem = (style, x, y, s, rot, dark, al) => {
      if (al <= 0.01 || s < 0.5) return;
      const sp = gemSprite(style, dark), k = s / sp.S, co = Math.cos(rot) * k, si = Math.sin(rot) * k;
      ctx.setTransform(dpr * co, dpr * si, -dpr * si, dpr * co, dpr * x, dpr * y);
      ctx.globalAlpha = al;
      ctx.drawImage(sp.c, -sp.w / 2, -sp.w / 2, sp.w, sp.w);
    };

    const ringGrad = (th, c, r, al) => {
      const cs_ = c === -1 ? th.innerRgb : th.bandsRgb[c % th.bandsRgb.length];
      const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
      g.addColorStop(0, rgba(cs_, al)); g.addColorStop(0.5, rgba(cs_, al * 0.75)); g.addColorStop(1, rgba(cs_, al * 0.32));
      return g;
    };
    const diskHalf = (th, front, rin, rx) => {
      DISK.forEach((d, i) => {
        const r = rin + (rx - rin) * Math.pow(d.q, 1.5);
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * TILT, 0, front ? 0 : Math.PI, front ? Math.PI : PI2);
        ctx.setLineDash(d.dash); ctx.lineDashOffset = -spin * d.spd * 60;
        ctx.strokeStyle = ringGrad(th, i === 0 ? -1 : d.col, r, i === 0 ? 0.8 : d.al); ctx.lineWidth = i === 0 ? 1.6 : d.lw; ctx.stroke();
      });
      ctx.setLineDash([]);
    };
    const haloArc = (r, a0, a1) => {
      ctx.beginPath();
      for (let s = 0; s <= 44; s++) { const t = a0 + (a1 - a0) * s / 44, w = wob(t), x = cx + Math.cos(t) * r * w, y = cy + Math.sin(t) * r * w; if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    };
    const EAT0 = 2.3;
    const chipState = (c, u, t0, Rk) => {
      const fi = cl((u - t0 - c.fd) / 0.45), e = cl((u - EAT0 - c.ed) / 0.9), ee = e * e * (3 - 2 * e);
      const a = c.a + u * c.w + ee * Math.PI * 1.1, r = c.ro * R * (1 - ee) + Rk * 0.85 * ee;
      return { c, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.72 + Math.sin(u * 1.2 + c.bob) * 3 * (1 - ee), a, e: ee, raw: e, al: fi * (1 - cl((ee - 0.8) / 0.2)) };
    };
    const CHIPF = '700 15.5px Inter, sans-serif';
    const chipSprite = (th, lb) => {
      let m = chipCache.get(th); if (!m) chipCache.set(th, m = {}); if (m[lb]) return m[lb];
      const c = document.createElement('canvas'); let g = c.getContext('2d'); g.font = CHIPF;
      const tw = g.measureText(lb).width, w = tw + 30, hh = 34, CW = w + 52, CH = hh + 52;
      c.width = Math.ceil(CW * dpr); c.height = Math.ceil(CH * dpr);
      g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, CW / 2 * dpr, CH / 2 * dpr);
      g.beginPath(); if (g.roundRect) g.roundRect(-w / 2, -hh / 2, w, hh, 17); else g.rect(-w / 2, -hh / 2, w, hh);
      g.fillStyle = th.chip[0]; g.shadowColor = 'rgba(18,22,30,0.22)'; g.shadowBlur = 18 * dpr; g.shadowOffsetY = 6 * dpr; g.fill();
      g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; g.strokeStyle = th.chip[3]; g.lineWidth = 1; g.stroke();
      g.font = CHIPF; g.fillStyle = (lb[0] === '+' || lb.indexOf('Payout') === 0) ? th.chip[2] : th.chip[1];
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lb, 0, 0.5);
      return m[lb] = { c, CW, CH };
    };
    const drawChip = (th, q, kA) => {
      const al = q.al * kA; if (al <= 0.01) return;
      const sc = chipK * (0.86 + 0.14 * (Math.sin(q.a) + 1) / 2) * (1 - 0.6 * q.e), ang = Math.atan2(q.y - cy, q.x - cx), sp = chipSprite(th, q.c.label);
      ctx.save(); ctx.globalAlpha = al; ctx.translate(q.x, q.y); ctx.rotate(ang); ctx.scale(1 + q.e * 0.7, 1 - q.e * 0.45); ctx.rotate(-ang); ctx.scale(sc, sc);
      ctx.drawImage(sp.c, -sp.CW / 2, -sp.CH / 2, sp.CW, sp.CH);
      ctx.restore();
    };
    const hole = (th, k, rage, Rk, dt, cs_) => {
      const pr = 0.1 + 0.9 * Math.pow(k, 0.8), rx = RX * pr, rin = Rk * 1.5, kA = Math.min(1, k * 1.6), sA = Math.min(0.85, th.shadeA * (1 + 0.6 * rage));
      ctx.globalAlpha = kA;
      let g = ctx.createRadialGradient(cx, cy, Rk, cx, cy, Rk * 2.8);
      g.addColorStop(0, rgba(th.shade, sA)); g.addColorStop(0.45, rgba(th.shade, sA * 0.35)); g.addColorStop(1, rgba(th.shade, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Rk * 2.8, 0, PI2); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.22);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgba(th.shade, sA * 0.5)); g.addColorStop(1, rgba(th.shade, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, PI2); ctx.fill(); ctx.restore();
      diskHalf(th, false, rin, rx);
      const spd = 1 + 2 * rage + 2 * (1 - k);
      for (const p of parts) { p.a += dt * 0.5 * Math.pow((RX / R * 0.4) / p.r, 1.5) * spd; if (Math.sin(p.a) < 0) { ctx.fillStyle = th.dust[p.red ? 1 : 0]; ctx.fillRect(cx + Math.cos(p.a) * p.r * R * pr, cy + Math.sin(p.a) * p.r * R * pr * TILT * 1.6, p.z, p.z); } }
      for (const q of cs_) if (Math.sin(q.a) < 0) drawChip(th, q, kA);
      HBOT.forEach(d => { const r = Rk * (1.04 + 0.36 * d.q); haloArc(r, 0.02, Math.PI - 0.02); ctx.setLineDash(d.dash.map(v => v * 0.5)); ctx.lineDashOffset = spin * d.spd * 40; ctx.strokeStyle = ringGrad(th, d.col, r, d.al * 0.7); ctx.lineWidth = d.lw * 0.8; ctx.stroke(); });
      HTOP.forEach(d => { const r = Rk * (1.06 + 0.92 * Math.pow(d.q, 1.15)); haloArc(r, Math.PI - 0.06, PI2 + 0.06); ctx.setLineDash(d.dash.map(v => v * 0.6)); ctx.lineDashOffset = -spin * d.spd * 46; ctx.strokeStyle = ringGrad(th, d.col, r, d.al); ctx.lineWidth = d.lw * 1.15; ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let s = 0; s <= 72; s++) { const t = s / 72 * PI2, w = wob(t), x = cx + Math.cos(t) * Rk * w, y = cy + Math.sin(t) * Rk * w; if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath();
      g = ctx.createRadialGradient(cx - Rk * 0.3, cy - Rk * 0.35, 1, cx, cy + Rk * bulge * 0.5, Rk * (1 + bulge * 0.5));
      g.addColorStop(0, th.core[0]); g.addColorStop(0.55, th.core[1]); g.addColorStop(1, th.core[2]);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = th.photon; ctx.lineWidth = 1.8 + (1 - k) * 2 + rage * 0.8; ctx.stroke();
      { /* the ring's glow: a gradient band, not a blurred shadow (that one cost a phone most of each frame) */
        const gl = (16 + (1 - k) * 40 + rage * 24) * 0.75, r0 = Math.max(0, Rk - gl * 0.5), r1 = Rk + gl, m = (Rk - r0) / (r1 - r0), pc = rgb(th.photon);
        const gg = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
        gg.addColorStop(0, rgba(pc, 0)); gg.addColorStop(m, rgba(pc, 0.42)); gg.addColorStop(m + (1 - m) * 0.3, rgba(pc, 0.14)); gg.addColorStop(1, rgba(pc, 0));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r1, 0, PI2); ctx.fill(); }
      for (const sp of sparks) { if (sp.t >= 0.45) continue; const f = sp.t / 0.45; ctx.save(); ctx.strokeStyle = th.photon; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, Rk + 2, sp.a - 0.35 - f * 0.4, sp.a + 0.35 + f * 0.4); ctx.globalAlpha = kA * (1 - f) * 0.2; ctx.lineWidth = 3.2 * (1 - f) + 12; ctx.stroke(); ctx.globalAlpha = kA * (1 - f); ctx.lineWidth = 3.2 * (1 - f) + 1; ctx.stroke(); ctx.restore(); }
      diskHalf(th, true, rin, rx);
      for (const p of parts) { if (Math.sin(p.a) >= 0) { ctx.fillStyle = th.dust[p.red ? 1 : 0]; ctx.fillRect(cx + Math.cos(p.a) * p.r * R * pr, cy + Math.sin(p.a) * p.r * R * pr * TILT * 1.6, p.z + 0.4, p.z + 0.4); } }
      for (const q of cs_) if (Math.sin(q.a) >= 0) drawChip(th, q, kA);
      ctx.globalAlpha = 1;
    };
    const flash = (th, f) => {
      const fc = th.flash, rr = R * 0.6 + RX * 0.9 * eo(f);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.6);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
      g.addColorStop(0, rgba(fc[0], (1 - f) * 0.95)); g.addColorStop(0.35, rgba(fc[1], (1 - f) * 0.3)); g.addColorStop(1, rgba(fc[1], 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rr, 0, PI2); ctx.fill(); ctx.restore();
      const r1 = RX * (0.1 + 1.1 * eo(f)), r2 = RX * (0.05 + 0.85 * eo(cl((f - 0.12) / 0.88)));
      ctx.beginPath(); ctx.ellipse(cx, cy, r1, r1 * 0.3, 0, 0, PI2); ctx.strokeStyle = rgba(fc[0], 1 - f); ctx.lineWidth = 3 * (1 - f) + 0.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, r2, r2 * 0.3, 0, 0, PI2); ctx.strokeStyle = rgba(fc[1], (1 - f) * 0.8); ctx.lineWidth = 1.6; ctx.stroke();
    };
    /* each bar with its shadow, drawn once per size (a blurred shadow per bar per frame was too slow on phones) */
    const barSprite = (th, b, bw, bh, rr, last) => {
      if (barCache[b]) return barCache[b];
      const p = 34, c = document.createElement('canvas'); c.width = Math.ceil((bw + 2 * p) * dpr); c.height = Math.ceil((bh + 2 * p) * dpr);
      const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, p * dpr, p * dpr);
      const rr2 = () => { g.beginPath(); if (g.roundRect) g.roundRect(0, 0, bw, bh, rr); else g.rect(0, 0, bw, bh); };
      g.save(); if (last) { g.shadowColor = 'rgba(231,19,27,0.35)'; g.shadowBlur = 22; } else { g.shadowColor = 'rgba(18,22,30,0.16)'; g.shadowBlur = 14; g.shadowOffsetY = 6; }
      rr2(); g.fillStyle = last ? th.barR[0] : th.bar[0]; g.fill(); g.restore();
      rr2(); g.strokeStyle = last ? th.barR[1] : th.bar[1]; g.lineWidth = 1; g.stroke();
      return barCache[b] = { c, p };
    };
    const bars = (th, u, al) => {
      const cw = gw / 11, bw = Math.max(cs * 1.74 + 10, cw * 0.66), base = cy + gh / 2;
      ctx.globalAlpha = al * cl((u - 0.75) / 0.35);
      ctx.beginPath(); ctx.moveTo(cx - gw / 2, base + step * 0.45); ctx.lineTo(cx + gw / 2, base + step * 0.45); ctx.strokeStyle = rgba(th.edge, th.edgeA); ctx.lineWidth = 1; ctx.stroke();
      BARS.forEach((h, b) => {
        const a = al * cl((u - 0.75 - b * 0.035) / 0.35); if (a <= 0) return;
        const x = cx - gw / 2 + (b + 0.5) * cw - bw / 2, top = base - h * step - step * 0.2, last = b === BARS.length - 1, bh = h * step + step * 0.4, rr = Math.min(8, bw / 2);
        ctx.globalAlpha = a; const bs = barSprite(th, b, bw, bh, rr, last); ctx.drawImage(bs.c, x - bs.p, top - bs.p, bw + 2 * bs.p, bh + 2 * bs.p);
      });
      ctx.globalAlpha = 1;
    };
    const edges = (th, u, al) => {
      for (let n = 1; n < NODES.length; n++) {
        const nd = NODES[n], pa = NODES[nd.par], prog = cl((u - 0.4 - (nd.lv - 1) * 0.25) / 0.4); if (prog <= 0) continue;
        const p = nXY(pa), q = nXY(nd), red = nd.red && pa.red;
        ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(p.x, p.y);
        for (let s = 1; s <= 18; s++) { const pt = bz(p, q, s / 18 * prog); ctx.lineTo(pt.x, pt.y); }
        ctx.strokeStyle = red ? RED : rgba(th.edge, th.edgeA); ctx.lineWidth = red ? 2 : 1.2; ctx.stroke();
      }
      const p3 = cl((u - 0.95) / 0.45); if (p3 > 0) {
        const L = gh * 0.24;
        for (let n = 4; n < NODES.length; n++) {
          const q = nXY(NODES[n]), y0 = q.y + cs * 1.9, y1 = y0 + L * p3;
          const g = ctx.createLinearGradient(0, y0, 0, y0 + L); g.addColorStop(0, rgba(th.edge, th.edgeA)); g.addColorStop(1, rgba(th.edge, 0));
          ctx.globalAlpha = al; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(q.x, y0); ctx.lineTo(q.x, y1); ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    };
    const caption = (th, a, left, right) => {
      if (a <= 0) return;
      const y = cy - gh / 2 - 16;
      ctx.globalAlpha = a; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 11px Inter, sans-serif'; ctx.letterSpacing = '1.8px'; ctx.fillStyle = th.mute; ctx.textAlign = 'left'; ctx.fillText(left, cx - gw / 2, y);
      ctx.font = '500 11px Inter, sans-serif'; ctx.letterSpacing = '0px'; ctx.fillStyle = RED; ctx.textAlign = 'right'; ctx.fillText(right, cx + gw / 2, y);
      ctx.globalAlpha = 1;
    };
    const pulse = u => {
      if (u < 1.0 || u > 1.95) return;
      const q = cl((u - 1.0) / 0.8), n0 = nXY(NODES[0]), n1 = nXY(NODES[1]), n2 = nXY(NODES[5]);
      const pt = q < 0.5 ? bz(n0, n1, eio(q * 2)) : bz(n1, n2, eio((q - 0.5) * 2));
      ctx.save(); ctx.globalAlpha = 1 - cl((u - 1.8) / 0.15);
      const ph_ = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 15); ph_.addColorStop(0, 'rgba(231,19,27,0.55)'); ph_.addColorStop(1, 'rgba(231,19,27,0)');
      ctx.fillStyle = ph_; ctx.beginPath(); ctx.arc(pt.x, pt.y, 15, 0, PI2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 5.5, 0, PI2); ctx.fill();
      ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, PI2); ctx.fill(); ctx.restore();
    };
    const drainPos = (N, v) => {
      const dx = N.x - cx, rad0 = Math.abs(dx) + 4, a0 = dx >= 0 ? 0 : Math.PI;
      const a = a0 + v * v * 7, rad = rad0 * (1 - eio(v)), yb = N.y + (cy + R * 0.12 - N.y) * Math.pow(v, 1.4);
      return { x: cx + Math.cos(a) * rad, y: yb + Math.sin(a) * rad * 0.2, a };
    };
    const gems = (style, ph, u) => {
      for (const c of cr) {
        const B = barPos(c), nd = NODES[c.ni];
        let x, y, s = cs, rot = 0, dark = false, al = 1;
        if (ph === 1) {
          dark = c.b === BARS.length - 1;
          const bx = cx + Math.cos(c.ba) * c.bd * RX * 0.75, by = cy + Math.sin(c.ba) * c.bd * RX * 0.4;
          if (u < 0.4) { const e = eo(u / 0.4); x = cx + (bx - cx) * e; y = cy + (by - cy) * e; s = cs * (0.3 + 0.7 * e); rot = c.r0 + u * c.sv; }
          else { const v = cl((u - 0.4 - c.s1 * 0.35) / 0.6), e = eio(v); x = bx + (B.x - bx) * e; y = by + (B.y - by) * e - Math.sin(Math.PI * e) * 24 * c.arc; rot = (c.r0 + u * c.sv) * (1 - e); }
        } else if (ph === 2) {
          const N = nodePos(c), v = cl((u - c.s2 * 0.3) / 0.65), e = eio(v), dx = N.x - B.x, dy = N.y - B.y, L = Math.hypot(dx, dy) || 1, off = Math.sin(Math.PI * e) * c.arc * Math.min(60, L * 0.35);
          x = B.x + dx * e - dy / L * off; y = B.y + dy * e + dx / L * off; s = cs + (N.s - cs) * e; rot = Math.sin(Math.PI * e) * 0.6 * (c.arc > 0 ? 1 : -1);
          dark = e < 0.5 ? c.b === BARS.length - 1 : !!nd.red;
        } else {
          const N = nodePos(c), v = cl((u - c.s3 * 0.3) / 0.9); if (v >= 1) continue;
          const P = drainPos(N, v); x = P.x; y = P.y; dark = !!nd.red; al = 1 - Math.pow(v, 4);
          s = N.s * (1 - 0.55 * v) * (0.88 + 0.12 * Math.sin(P.a)); rot = v * 1.2;
          if (v > 0.15) {
            const tc = (dark ? CRY.black : CRY.silver).trail, ta = cl((v - 0.15) / 0.15) * al;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 1;
            let prev = P;
            for (let s = 1; s <= 6; s++) {
              const q = drainPos(N, Math.max(0, v - s * 0.0135));
              ctx.globalAlpha = 1; ctx.strokeStyle = rgba(tc, 0.6 * ta * (1 - s / 7));
              ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke(); prev = q;
            }
          }
        }
        gem(style, x, y, s, rot, dark, al);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1;
    };

    let last = performance.now(), lastPh = -1, lastRaw = -1;
    const frame = now => {
      if (!W) return;
      const th = TH.obsidian, style = 'liquid', showChips = true;
      let dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (still) { dt = 0; T = 1.2; } else T += dt;
      wt += dt;
      let ph, u;
      const VD = 4.6, V0 = 4.1, SK = VD - V0;
      if (T < V0) { ph = 0; u = T + SK; } else { const tt = (T - V0) % (VD + 5); if (tt < 2.5) { ph = 1; u = tt; } else if (tt < 5) { ph = 2; u = tt - 2.5; } else { ph = 3; u = tt - 5; } }
      if (ph !== lastRaw) { if (ph === 3) resetChips(); lastRaw = ph; }
      const isV = ph === 0 || ph === 3;
      let k = 0, rage = 0;
      if (isV) { const f0 = ph === 0 ? SK : 0.25; k = Math.min(eo(cl((u - f0) / 0.7)), 1 - ei(cl((u - 4.2) / 0.4))); rage = eio(cl((u - 3.4) / 0.8)); }
      if (still) { k = 1; rage = 0; }
      bulge = 0.035 + 0.012 * Math.sin(wt * 0.55) + rage * 0.05;
      spin += dt * (1.1 + rage * 4 + (1 - k) * 3);
      const si = ph === 1 ? 1 : ph === 2 ? 2 : 0, prog = ph === 0 ? (u - SK) / V0 : isV ? u / VD : u / 2.5;
      fills.forEach((f, i) => { f.style.width = (still || i !== si ? 0 : prog * 100).toFixed(1) + '%'; });
      if (si !== lastPh) { lastPh = si; tabs.forEach((x, i) => x.classList.toggle('is-on', i === si)); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      const Rk = R * (0.05 + 0.95 * k) * (1 + 0.06 * rage);
      const cst = showChips && isV ? chips.map(c => chipState(c, u, ph === 0 ? SK : 0.7, Rk)) : [];
      if (!still) { for (const q of cst) { if (q.c.ep < 0.92 && q.raw >= 0.92) sparks.push({ a: Math.atan2(q.y - cy, q.x - cx), t: 0 }); q.c.ep = q.raw; } sparks.forEach(s => { s.t += dt; }); sparks = sparks.filter(s => s.t < 0.6); }
      if (k > 0.002) {   /* phones: the hole scene (hole, disk, dust, chips) 1.3x, around its centre */
        const Z = W < 700 ? ZOOM : 1;
        if (Z !== 1) { ctx.save(); ctx.translate(cx, cy); ctx.scale(Z, Z); ctx.translate(-cx, -cy); }
        hole(th, k, rage, Rk, dt, cst);
        if (Z !== 1) ctx.restore();
      }
      if (still) return;
      if (ph === 1 && u < 0.6) flash(th, u / 0.6);
      if (ph === 1 && u > 0.75) bars(th, u, 1); else if (ph === 2 && u < 0.35) bars(th, 9, 1 - u / 0.35);
      if (ph === 2 && u > 0.4) edges(th, u, 1); else if (ph === 3 && u < 0.4) edges(th, 9, 1 - u / 0.4);
      if (ph === 1) caption(th, cl((u - 0.9) / 0.35) * (1 - cl((u - 2.3) / 0.2)), 'VOLUME · LOTS', '▲ 7.9%');
      if (ph === 2) caption(th, cl((u - 0.7) / 0.35) * (1 - cl((u - 2.3) / 0.2)), 'SUB-IB NETWORK', 'UNLIMITED TIERS');
      if (ph !== 0) gems(style, ph, u);
      if (ph === 2) pulse(u);
    };
    draw = () => frame(performance.now());
    if (still) { draw(); return; }
    /* the loop: only while on screen and the tab is visible */
    let raf = 0, seen = false;
    const loop = (now) => { raf = requestAnimationFrame(loop); try { frame(now); } catch (e) { cancelAnimationFrame(raf); } };
    const run = () => { if (!raf && seen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) run(); else stop(); }).observe(root);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else run(); });
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
