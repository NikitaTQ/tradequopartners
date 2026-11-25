/* /for-influencers/: "Creators on platforms" (owner's design "Creator Platforms Scene", ported from its component).
 * Three pictures, one per platform; a tab plays the change: a flash and two shock rings from the planet, the new
 * picture opening out from the planet in a ring of its colour while the old one drifts off tinted and blurred, the
 * orbit drawn again in the new tint, the platform's icon and title coming in, a light across each creator's plate.
 * The design's second version: under the picture the card carries the scene on (a strip per platform, inside each
 * platform's group, so it opens with the reveal too) and the switch is a small bar of liquid glass: its white lens
 * slides to the chosen tab (--tab), its tint follows the section's data-pal, and in Chromium the bar and the lens
 * bend what is behind them, through displacement maps built here for their size (rebuilt when the bar resizes).
 * A comet runs the orbit while the block is on screen (paused off it). Reduced motion: a plain cross-fade, no comet. */
(function () {
  'use strict';
  const sec = document.querySelector('[data-orbit]');
  if (!sec) return;
  const r = sec.querySelector('[data-orbit-root]');
  const tabs = [...sec.querySelectorAll('[data-tab]')];
  const NAMES = ['Instagram', 'Telegram', 'YouTube'];   // YouTube in TikTok's place since November 2026
  const TINT = ['#E08AA0', '#8EB2DC', '#F07A80'];
  /* touch devices: the change without its blurs (the old picture tints and grows but stays sharp, the icon comes in
     from bright, not blurred): blurring the whole picture every frame was the heaviest part of it for a phone */
  const LIGHT = window.matchMedia('(pointer: coarse)').matches;
  const B = (px) => (LIGHT ? 0 : px);
  const OUT_FILTER = [
    'hue-rotate(-150deg) saturate(1.25) brightness(1.15) blur(' + B(4) + 'px)',
    'hue-rotate(150deg) saturate(1.25) brightness(1.15) blur(' + B(4) + 'px)',
    'sepia(.85) hue-rotate(-30deg) saturate(3.2) brightness(.7) blur(' + B(4) + 'px)',   // to YouTube: the old picture going red
  ];
  /* the scene's geometry: wider screens the design's (its group reaches over the strip under the picture, so the planet
     is at 61.54% of the group's height); phones the tall card's (tools/influencers/portrait.py: the picture's x 418..1281
     at 1.2 times, on a card of 1036 x 1340) */
  const PHONE = window.matchMedia('(max-width: 640px)');
  const GEO = {
    wide: { hole: 'ellipse 25% 27% at 49.9% 16%', planet: [0.4791, 0.6764], reveal: '47.91% 61.54%', reach: 1.0992,
      title: ['inset(24.2% 64.5% 68.8% 35.5%)', 'inset(24.2% 35.7% 68.8% 35.5%)'], streak: ['35.5%', '64.3%'] },
    phone: { hole: 'ellipse 51.37% 21.45% at 54.12% 12.71%', planet: [0.5004, 0.5373], reveal: '50.04% 53.73%', reach: 1,
      title: ['inset(19.22% 75.47% 75.22% 24.53%)', 'inset(19.22% 16.29% 75.22% 24.53%)'], streak: ['24.53%', '83.71%'] },
  };
  const geo = () => (PHONE.matches ? GEO.phone : GEO.wide);
  /* the orbit overlay follows: the card's part of the picture, and in its mask the creators' places on the card */
  const svg = sec.querySelector('.inf-orbit__svg'), hide = sec.querySelector('[data-hide]');
  const frame = () => {
    svg.setAttribute('viewBox', PHONE.matches ? svg.dataset.viewM : '0 0 1774 887');
    hide.setAttribute('mask', PHONE.matches ? 'url(#tqHideM)' : 'url(#tqHide)');
  };
  frame();
  if (PHONE.addEventListener) PHONE.addEventListener('change', frame);
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const F = (n) => r.querySelector('[data-fx="' + n + '"]');
  const G = (i) => r.querySelector('[data-group="' + i + '"]');
  const L = (g, n) => g.querySelector('[data-l="' + n + '"]');
  const mask = (el, v) => { el.style.webkitMaskImage = v; el.style.maskImage = v; };
  let active = 0, busy = false;

  /* the comet: a light and its trail running the orbit (9 s a lap), only while the block is on screen, drawn on one
     canvas (one layer: animating the SVG line's dashes repainted the whole card every frame, and 21 moving dots meant 21
     layers each clipped by the card's rounded corners, which Safari masks one by one). The orbit's points are worked out
     once per size; the comet goes out of sight where a creator stands (the orbit's mask for the current layout) and at
     the orbit's two open ends. Touch devices draw it 30 times a second (a 9-second lap still glides), drawing at 1.5x. */
  const orbitPath = sec.querySelector('#tqOrbit');
  const cv = sec.querySelector('[data-comet]');
  const ctx = cv && cv.getContext && cv.getContext('2d');
  const COARSE = window.matchMedia('(pointer: coarse)').matches;
  const LAP = 9000, N = 600, TRAIL = 0.12, HEAD0 = 0.117;   // a lap; points on it; the trail's length and the head's start (of a lap)
  let pts = null, vis = null, built = '', playing = false, raf = 0, t0 = 0, pausedAt = 0, prevT = 0, hiddenNow = false;
  const hideShapes = () => {
    const m = sec.querySelector(PHONE.matches ? '#tqHideM' : '#tqHide');
    const n = (e, a) => +e.getAttribute(a);
    return {
      c: [...m.querySelectorAll('g circle')].map((e) => [n(e, 'cx'), n(e, 'cy'), n(e, 'r')]),
      r: [...m.querySelectorAll('g rect')].map((e) => [n(e, 'x'), n(e, 'y'), n(e, 'width'), n(e, 'height')]),
    };
  };
  const buildComet = () => {
    if (still() || !orbitPath || !ctx || !orbitPath.getTotalLength) return;
    const W = r.clientWidth, H = r.clientHeight, vb = svg.viewBox.baseVal;
    const key = W + 'x' + H + ':' + vb.x + ',' + vb.width;
    if (!W || key === built) return;
    built = key;
    const dpr = Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = W / vb.width, sy = H / vb.height, total = orbitPath.getTotalLength();
    const hs = hideShapes();
    const hidden = (x, y) => hs.c.some(([cx, cy, rr]) => Math.hypot(x - cx, y - cy) < rr)
      || hs.r.some(([rx, ry, rw, rh]) => x > rx && x < rx + rw && y > ry && y < ry + rh);
    pts = new Float32Array((N + 1) * 2); vis = new Float32Array(N + 1);
    for (let k = 0; k <= N; k++) {
      const p = orbitPath.getPointAtLength(total * k / N), u = k / N;
      pts[k * 2] = (p.x - vb.x) * sx; pts[k * 2 + 1] = (p.y - vb.y) * sy;
      vis[k] = hidden(p.x, p.y) ? 0 : Math.max(0, Math.min(1, u / 0.015, (1 - u) / 0.015));
    }
    for (let pass = 0; pass < 3; pass++) for (let k = 1; k < N; k++) vis[k] = Math.min(vis[k], (vis[k - 1] + vis[k] * 2 + vis[k + 1]) / 4 + .25);   // soft edges where it hides
    draw(prevT);
  };
  const at = (u) => {   // a point on the lap at u (0..1), with its visibility
    const f = u * N, k = Math.min(N - 1, Math.floor(f)), a = f - k;
    return [pts[k * 2] + (pts[k * 2 + 2] - pts[k * 2]) * a, pts[k * 2 + 1] + (pts[k * 2 + 3] - pts[k * 2 + 1]) * a, vis[k] + (vis[k + 1] - vis[k]) * a];
  };
  const draw = (t) => {
    if (!pts) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (hiddenNow) return;
    const head = (HEAD0 + t / LAP) % 1;
    // the trail: a run of short strokes behind the head, thinner and fainter toward its end
    ctx.lineCap = 'round';
    const STEPS = 28;
    let prev = at(head);
    for (let s = 1; s <= STEPS; s++) {
      let u = head - TRAIL * s / STEPS; if (u < 0) u += 1;
      const p = at(u), fade = 1 - s / STEPS;
      const a = Math.min(prev[2], p[2]) * fade;
      if (a > 0.01 && Math.abs(p[0] - prev[0]) + Math.abs(p[1] - prev[1]) < 80) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 * a).toFixed(3) + ')'; ctx.lineWidth = 7 * fade + 2;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.75 * a).toFixed(3) + ')'; ctx.lineWidth = 2.4 * fade + .6;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
      prev = p;
    }
    // the head: a soft glow and a bright core
    const h = at(head);
    if (h[2] > 0.01) {
      const g = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 12);
      g.addColorStop(0, 'rgba(255,255,255,' + h[2] + ')'); g.addColorStop(.25, 'rgba(255,255,255,' + (.75 * h[2]) + ')');
      g.addColorStop(.55, 'rgba(255,255,255,' + (.18 * h[2]) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h[0], h[1], 12, 0, Math.PI * 2); ctx.fill();
    }
  };
  let lastDraw = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (COARSE && now - lastDraw < 31) return;   // touch devices: 30 a second
    lastDraw = now;
    prevT = now - t0;
    draw(prevT);
  };
  const pauseComet = () => { playing = false; if (raf) { cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now(); } };
  const playComet = () => {
    if (still()) return;
    playing = true; buildComet();
    if (!raf && !hiddenNow) { const now = performance.now(); t0 = pausedAt ? t0 + (now - pausedAt) : now; pausedAt = 0; raf = requestAnimationFrame(loop); }
  };
  const holdComet = (on) => {   /* out of sight (and not drawn) while a platform change plays */
    hiddenNow = on;
    if (on) { if (raf) { cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now(); } if (pts) ctx.clearRect(0, 0, cv.width, cv.height); }
    else if (playing) playComet();
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? playComet() : pauseComet())), { rootMargin: '100px 0px' }).observe(r);
  } else playComet();
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (built) buildComet(); }).observe(r);
  if (PHONE.addEventListener) PHONE.addEventListener('change', () => { if (built) buildComet(); });   /* after frame(): the new view is set */

  const select = (i) => {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
    r.setAttribute('aria-label', (r.dataset.aria || 'Creators on') + ' ' + NAMES[i]);
    sec.dataset.pal = String(i);
    if (bar) bar.style.setProperty('--tab', String(i));
  };

  /* ---- the liquid glass (Chromium): a displacement map for a pill of w x h, its edge band bending inwards (and, for
     the lens, a slight magnification), as in the design */
  const bar = sec.querySelector('[data-bar]');
  const glassMap = (w, h, band, magnify) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
    const rr = h / 2, cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x + .5, py = y + .5;
      const qx = Math.abs(px - cx) - (cx - rr), qy = Math.abs(py - cy) - (cy - rr);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const dist = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - rr);
      let nx, ny;
      if (qx > 0) { const l = Math.hypot(ox, oy) || 1; nx = ox / l; ny = oy / l; } else { nx = 0; ny = 1; }
      nx *= Math.sign(px - cx) || 1; ny *= Math.sign(py - cy) || 1;
      const t = Math.max(0, Math.min(1, 1 - dist / band)), m = t * t;
      let dx = -nx * m, dy = -ny * m;
      if (magnify) { dx -= (px - cx) / cx * magnify; dy -= (py - cy) / cy * magnify; }
      dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
      const k = (y * w + x) * 4;
      d[k] = 128 + dx * 127; d[k + 1] = 128 + dy * 127; d[k + 2] = 128; d[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  };
  const setMap = (name, url, w, h, scale) => {
    const fe = document.querySelector('[data-map="' + name + '"]');
    if (!fe) return;
    fe.setAttribute('href', url); fe.setAttribute('width', w); fe.setAttribute('height', h);
    [1, 1.1, 1.2].forEach((f, k) => {
      const dm = document.querySelector('[data-s="' + name + (k + 1) + '"]');
      if (dm) dm.setAttribute('scale', Math.round(scale * (name === 'lens' ? [1, 1.12, 1.24][k] : f)));
    });
  };
  let gW = 0, gH = 0;
  const buildGlass = () => {
    const w = Math.round(bar.offsetWidth), h = Math.round(bar.offsetHeight);
    if (!w || !h || (w === gW && h === gH)) return;
    gW = w; gH = h;
    const lw = Math.round((w - 6) / 3), lh = h - 6;
    setMap('bar', glassMap(w, h, h * 0.42, 0), w, h, h * 0.9);
    setMap('lens', glassMap(lw, lh, lh * 0.5, 0.22), lw, lh, lh * 0.8);
    bar.classList.add('is-liquid');
  };
  if (bar && /Chrome\//.test(navigator.userAgent) && 'ResizeObserver' in window) {
    new ResizeObserver(buildGlass).observe(bar);
  }

  async function play(fi, ti) {
    const from = G(fi), to = G(ti);
    to.removeAttribute('data-off');
    to.style.visibility = 'visible'; to.style.zIndex = 2; from.style.zIndex = 1;

    if (still()) {
      await to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished;
      from.style.visibility = 'hidden';
      return;
    }

    const rect = r.getBoundingClientRect();
    const g = geo();
    const cx = rect.width * g.planet[0], cy = rect.height * g.planet[1];
    const R = Math.max(...[[0, 0], [rect.width, 0], [0, rect.height * g.reach], [rect.width, rect.height * g.reach]].map(([x, y]) => Math.hypot(x - cx, y - cy))) + 260;   /* to the far corners (and the strip's) */
    const REVEAL = 'radial-gradient(circle at ' + g.reveal + ',#000 calc(var(--r) - 240px),transparent var(--r))';
    const HOLE = 'radial-gradient(' + g.hole + ',transparent 72%,#000 100%)';
    const tint = TINT[ti];
    mask(to, REVEAL);
    to.classList.add('is-playing');
    /* the comet steps aside while the change plays */
    holdComet(true);
    const bg = L(to, 'bg'), sky = L(to, 'sky');
    mask(bg, HOLE);
    sky.style.opacity = 1;
    ['shock1', 'shock2', 'draw'].forEach((n) => F(n).setAttribute('stroke', tint));
    F('streak').style.boxShadow = '0 0 18px 6px ' + tint;

    const ease = 'cubic-bezier(.6,.02,.22,1)', wipe = 'cubic-bezier(.65,0,.25,1)';
    const anims = [];
    const A = (el, kf, o) => { const a = el.animate(kf, Object.assign({ fill: 'both' }, o)); anims.push(a); return a; };

    A(F('flash'), [{ opacity: 0 }, { opacity: 0.9, offset: 0.18 }, { opacity: 0 }], { duration: 1000, easing: 'ease-out' });
    A(F('shock1'), [{ transform: 'scale(.02)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 1500, easing: 'cubic-bezier(.15,.6,.25,1)' });
    A(F('shock2'), [{ transform: 'scale(.02)', opacity: 0.8 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 1500, delay: 180, easing: 'cubic-bezier(.15,.6,.25,1)' });
    A(to, [{ '--r': '0px' }, { '--r': R + 'px' }], { duration: 1800, easing: ease });
    A(L(to, 'edge'), [{ opacity: 0 }, { opacity: 0.9, offset: 0.12 }, { opacity: 0.75, offset: 0.75 }, { opacity: 0 }], { duration: 1800 });
    A(from, [
      { transform: 'scale(1)', filter: 'hue-rotate(0deg) saturate(1) brightness(1) blur(0px)' },
      { transform: 'scale(1.07)', filter: OUT_FILTER[ti] },
    ], { duration: 1800, easing: ease });
    A(L(to, 'drift'), [{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 2600, easing: 'cubic-bezier(.16,.8,.2,1)' });
    A(L(to, 'planet'), [
      { opacity: 1, filter: 'brightness(1)', transform: 'scale(1)' },
      { opacity: 1, filter: 'brightness(2.4)', transform: 'scale(1.06)', offset: 0.3 },
      { opacity: 1, filter: 'brightness(1)', transform: 'scale(1)' },
    ], { duration: 1400, easing: 'ease-out' });
    A(L(to, 'icon'), [{ opacity: 0, filter: 'blur(' + B(20) + 'px) brightness(3)' }, { opacity: 1, filter: 'blur(0px) brightness(1)' }], { duration: 1400, delay: 750, easing: 'cubic-bezier(.3,0,.2,1)' });
    A(L(to, 'title'), [
      { opacity: 1, clipPath: g.title[0], filter: 'brightness(2.6)' },
      { opacity: 1, clipPath: g.title[1], filter: 'brightness(1)' },
    ], { duration: 1000, delay: 1000, easing: wipe });
    A(F('streak'), [{ left: g.streak[0], opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { left: g.streak[1], opacity: 0 }], { duration: 1000, delay: 1000, easing: wipe });
    A(F('draw'), [{ strokeDashoffset: 1000, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.75 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 2100, delay: 250, easing: 'cubic-bezier(.5,0,.3,1)' });
    A(F('ftrail'), [{ strokeDashoffset: 0, opacity: 0.8 }, { opacity: 0.8, offset: 0.9 }, { strokeDashoffset: -1000, opacity: 0 }], { duration: 1700, delay: 200, easing: 'cubic-bezier(.4,0,.3,1)' });
    A(F('fhead'), [{ strokeDashoffset: -214, opacity: 1 }, { opacity: 1, offset: 0.9 }, { strokeDashoffset: -1214, opacity: 0 }], { duration: 1700, delay: 200, easing: 'cubic-bezier(.4,0,.3,1)' });
    r.querySelectorAll('[data-sheen]').forEach((el, i) =>
      A(el, [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 800, delay: 1500 + i * 110, easing: 'cubic-bezier(.5,0,.3,1)' }));

    await Promise.all(anims.map((a) => a.finished.catch(() => {})));
    from.style.visibility = 'hidden';
    mask(to, 'none'); mask(bg, 'none');
    to.classList.remove('is-playing');
    holdComet(false);
    sky.style.opacity = 0;
    anims.forEach((a) => a.cancel());
  }

  const go = (to) => {
    const from = active;
    if (busy || to === from) return;
    busy = true;
    active = to;
    select(to);
    play(from, to).finally(() => { busy = false; });
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => go(i));
    t.addEventListener('keydown', (e) => {   /* arrows move along the tabs */
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = (i + d + tabs.length) % tabs.length;
      tabs[n].focus();
      go(n);
    });
  });
  select(0);
})();

/* /for-influencers/: "Incentive trips" (owner's design "Incentive Trips", 7d). The water in its "ON US." drifts (a CSS
 * animation, influencers.css .inf-trip__water) only while the block is on screen: off it the animation is paused, so
 * the page does not paint it for nothing. */
(function () {
  'use strict';
  const sec = document.querySelector('[data-trip]');
  if (!sec || !('IntersectionObserver' in window)) { if (sec) sec.classList.add('is-on'); return; }
  new IntersectionObserver((es) => es.forEach((e) => sec.classList.toggle('is-on', e.isIntersecting)), { rootMargin: '80px 0px' }).observe(sec);
})();

/* /for-influencers/: "Three numbers" rows (influencers.css .inf-nums__row). A row opens (grows, its line comes in) while
 * pointed at or focused, by CSS; on touch screens a tap opens it (and closes the one open before); a second tap on it,
 * or a tap anywhere else on the page, closes it. aria-expanded follows what shows. */
(function () {
  'use strict';
  const rows = [...document.querySelectorAll('[data-nums-row]')];
  if (!rows.length) return;
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const set = (r, on) => { r.classList.toggle('is-open', on); r.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  rows.forEach((r) => {
    r.addEventListener('click', () => { if (hover.matches) return; const on = !r.classList.contains('is-open'); rows.forEach((x) => set(x, x === r && on)); });
    r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const on = !r.classList.contains('is-open'); rows.forEach((x) => set(x, x === r && on)); } });
    r.addEventListener('mouseenter', () => { if (hover.matches) r.setAttribute('aria-expanded', 'true'); });
    r.addEventListener('mouseleave', () => { if (hover.matches && !r.classList.contains('is-open')) r.setAttribute('aria-expanded', 'false'); });
    r.addEventListener('focus', () => r.setAttribute('aria-expanded', 'true'));
    r.addEventListener('blur', () => set(r, false));
  });
  /* a tap anywhere else on the page closes the open row (touch screens) */
  document.addEventListener('click', (e) => {
    if (hover.matches || e.target.closest('[data-nums-row]')) return;
    rows.forEach((x) => { if (x.classList.contains('is-open')) { set(x, false); x.blur(); } });
  });
})();

/* /for-influencers/: the earnings calculator (influencers.css .inf-calc). The home page's own sum: clients × lots a
 * client trades a month × $7.50 a lot; a day is a thirtieth of the month, a year twelve months. The counter's drums
 * roll to the clients' number, the slider's filled part follows the knob, the estimate counts to its new value. */
(function () {
  'use strict';
  const box = document.querySelector('[data-calc-case]');
  if (!box) return;
  const RATE = 7.5, LOTS = 130;   /* $ a lot; lots per client a month (the home calculator's starting value) */
  const PER = { day: 1 / 30, month: 1, year: 12 };
  const range = box.querySelector('[data-calc-range]'), sum = box.querySelector('[data-calc-sum]'), per = box.querySelector('[data-calc-per]');
  const reels = [...box.querySelectorAll('[data-calc-reel]')], tabs = [...box.querySelectorAll('[data-calc-p]')];
  const track = range.parentNode;
  let p = 'year', shown = null, raf = 0;
  const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
  const fit = (txt) => { const n = txt.length; sum.parentNode.style.setProperty('--sf', n <= 7 ? 64 : n <= 9 ? 56 : n <= 11 ? 46 : 38); };
  const tween = (to) => {
    cancelAnimationFrame(raf);
    const from = shown == null ? to : shown, t0 = performance.now(), D = 600;
    const step = (now) => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); shown = from + (to - from) * e; const t = money(shown); fit(money(to)); sum.textContent = t; if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  const render = () => {
    const c = Number(range.value), d = String(c).padStart(4, '0');
    reels.forEach((r, i) => { r.style.transform = 'translateY(' + (-Number(d[i]) * 10) + '%)'; });
    track.style.setProperty('--p', ((c - Number(range.min)) / (Number(range.max) - Number(range.min)) * 100).toFixed(2) + '%');
    tween(c * LOTS * RATE * PER[p]);
  };
  range.addEventListener('input', render);
  tabs.forEach((t) => t.addEventListener('click', () => {
    p = t.dataset.calcP;
    tabs.forEach((x) => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
    if (per.dataset[p]) per.textContent = per.dataset[p];
    render();
  }));
  render();
})();
