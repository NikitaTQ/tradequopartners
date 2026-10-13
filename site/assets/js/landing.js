/* TradeQuo Partner Program — landing behaviour.
 * Ported from the Claude Design component (Partner Program v2.dc.html). */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const ref = (name) => $('[data-ref="' + name + '"]');
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const pad = (n) => String(n).padStart(2, '0');
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const MOTION = 0.7; /* design prop motionLevel = 70% */

  /* ---- magnetic CTAs: buttons lean toward the pointer --------------------- */
  function startDock() {
    if (!matchMedia('(hover: hover)').matches || reducedMotion()) return;
    let cur = null;
    const reset = (el) => { el.style.setProperty('--tqx', '0px'); el.style.setProperty('--tqy', '0px'); };
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.tq-dock, .tq-env, .tq-launch, .tq-rcpt, .tq-logo, .tq-crys');
      if (cur && cur !== el) { reset(cur); cur = null; }
      if (!el) return;
      cur = el;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tqx', ((e.clientX - r.left - r.width / 2) * 0.12).toFixed(1) + 'px');
      el.style.setProperty('--tqy', ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px');
    }, { passive: true });
  }

  /* ---- embeds: auto-height + "scroll to section" requests ------------------ */
  function startIframeFit() {
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin) return;
      const d = e.data;
      if (d && d.tqGo) {
        const t = document.getElementById(d.tqGo);
        if (t) window.scrollTo({ top: t.getBoundingClientRect().top + scrollY, behavior: 'smooth' });
        return;
      }
      if (!d || typeof d.tqFrameH !== 'number' || d.tqFrameH < 50) return;
      $$('iframe').forEach((f) => {
        if (f.contentWindow === e.source) { f.style.height = Math.ceil(d.tqFrameH) + 'px'; f.style.aspectRatio = 'auto'; }
      });
    });
  }

  /* Embeds stop rendering while off-screen (they poll window.__tqPaused). */
  function startIframePause() {
    const check = () => {
      const vh = innerHeight;
      $$('iframe').forEach((f) => {
        const r = f.getBoundingClientRect();
        let hidden = r.bottom < -80 || r.top > vh + 80 || r.width === 0;
        if (!hidden) {
          for (let n = f; n && n !== document.body; n = n.parentElement) {
            if (n.style && n.style.visibility === 'hidden') { hidden = true; break; }
          }
        }
        try { if (f.contentWindow) f.contentWindow.__tqPaused = hidden; } catch (e) {}
      });
    };
    check();
    setInterval(check, 200);
  }

  /* ---- mobile: tap an offer card to lift it -------------------------------- */
  function startFanTap() {
    document.addEventListener('click', (e) => {
      if (innerWidth > 640) return;
      const c = e.target.closest && e.target.closest('[data-fan-card]');
      $$('[data-fan-card][data-sel]').forEach((n) => { if (n !== c) n.removeAttribute('data-sel'); });
      if (c) c.toggleAttribute('data-sel');
    });
  }

  /* ---- desktop site-map fan ------------------------------------------------ */
  function startFanMenu() {
    const menu = $('[data-fanmenu]'), veil = $('[data-fanveil]'), knob = $('[data-fan-toggle]');
    if (!menu || !knob) return;
    const set = (open) => {
      menu.toggleAttribute('data-open', open);
      if (veil) veil.hidden = !open;
      knob.setAttribute('aria-expanded', String(open));
    };
    knob.addEventListener('click', () => set(!menu.hasAttribute('data-open')));
    if (veil) veil.addEventListener('click', () => set(false));
    $$('[data-page-link]', menu).forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.addEventListener('pageshow', (e) => { if (e.persisted) set(false); });
  }

  /* ---- mobile quick menu --------------------------------------------------- */
  function startFab() {
    const fab = $('[data-fab]'), btn = $('[data-fab-toggle]');
    if (!fab || !btn) return;
    const set = (open) => { fab.toggleAttribute('data-open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(!fab.hasAttribute('data-open')));
    $$('.tq-fab-link', fab).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  /* ---- How it works: progress line runs step to step ----------------------- */
  function startHowLine() {
    const sec = document.getElementById('how');
    if (!sec) return;
    const line = $('[data-how-line]', sec), fill = $('[data-how-fill]', sec);
    const dots = $$('[data-how-dot]', sec), steps = $$('[data-how-step]', sec);
    const arrows = $$('[data-how-arrow]', sec).map((a) => ({ fill: $('[data-how-arrow-fill]', a), head: $('[data-how-arrow-head]', a) }));
    const RUN = 6200, HOLD = 1600, FADE = 500, CYCLE = RUN + HOLD + FADE;
    let t0 = performance.now(), state = [];
    const set = (i, on) => {
      if (state[i] === on) return;
      state[i] = on;
      const d = dots[i], st = steps[i];
      if (!d || !st) return;
      d.style.background = on ? '#e7131b' : '#fff';
      d.style.borderColor = on ? '#e7131b' : '#d6d6d9';
      d.style.transform = on ? 'scale(1.18)' : 'scale(1)';
      d.style.boxShadow = on ? '0 0 0 6px rgba(231,19,27,.14)' : 'none';
      const svg = $('svg', d); if (svg) svg.style.stroke = on ? '#fff' : '#b5b5b9';
      st.style.opacity = on ? '1' : '.38';
      st.style.transform = on ? 'translateY(0)' : 'translateY(6px)';
      const ic = $('[data-how-icon]', st); if (ic) ic.style.background = on ? '#fdecec' : 'transparent';
    };
    const tick = (now) => {
      requestAnimationFrame(tick);
      const r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) { t0 = now - Math.min(now - t0, RUN * 0.02); return; }
      if (!line || line.offsetParent === null) {
        /* mobile: vertical arrows between stacked steps */
        const k = (now - t0) % CYCLE, T = k / RUN;
        const op = k < RUN + HOLD ? 1 : 1 - (k - RUN - HOLD) / FADE;
        if (k < 40) state = [];
        const marks = [0.03, 0.47, 0.91];
        steps.forEach((_, i) => set(i, op > .5 && T >= marks[i]));
        arrows.forEach((a, j) => {
          const p = clamp01((T - marks[j] - 0.06) / (marks[j + 1] - marks[j] - 0.1));
          if (a.fill) { a.fill.style.height = (p * 100).toFixed(1) + '%'; a.fill.style.opacity = op; }
          if (a.head) a.head.style.stroke = p >= 1 && op > .5 ? '#e7131b' : '#d6d6d9';
        });
        return;
      }
      const lr = line.getBoundingClientRect(), W = lr.width;
      const k = (now - t0) % CYCLE;
      let w, op = 1;
      if (k < RUN) { const p = k / RUN; w = W * (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2); }
      else if (k < RUN + HOLD) w = W;
      else { w = W; op = 1 - (k - RUN - HOLD) / FADE; }
      if (k < 40) state = [];
      if (fill) { fill.style.width = w + 'px'; fill.style.opacity = op; }
      dots.forEach((d, i) => {
        const dr = d.getBoundingClientRect();
        const cx = dr.left - lr.left + dr.width / 2;
        set(i, op > .5 && w >= cx - dr.width / 2);
      });
    };
    requestAnimationFrame(tick);
  }

  /* ---- Infinite Flow → "What we offer": scroll-driven flip (desktop) -------- */
  function startFlip() {
    const track = $('[data-flip-track]');
    if (!track) return;
    const front = $('[data-flip-front]', track), back = $('[data-flip-back]', track), shade = $('[data-flip-shade]', track);
    if (!front || !back) return;
    const ifr = $('iframe', front), panel = $('[data-flip-panel]', back), grid = $('[data-fan-grid]', back);
    const clamp = clamp01;
    const ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
    const io3 = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    const io4 = (x) => { x = clamp(x); return x < .5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; };
    const out3 = (x) => 1 - Math.pow(1 - clamp(x), 3);
    const kids = () => panel ? [...panel.children] : [];
    let pS = -1, hd = null, Rf = null, apiReset = false;
    const tick = () => {
      requestAnimationFrame(tick);
      let api = null, doc = null;
      try { api = ifr && ifr.contentWindow && ifr.contentWindow.infiniteFlow; doc = ifr && ifr.contentDocument; } catch (e) {}
      const vh = innerHeight;
      if (innerWidth <= 640) {
        /* mobile: plain stacked layout, undo any inline transforms once */
        if (pS !== -2) {
          pS = -2; apiReset = false;
          front.style.transform = ''; front.style.visibility = '';
          back.style.transform = ''; back.style.opacity = ''; back.style.visibility = ''; back.style.clipPath = '';
          kids().forEach((n) => { n.style.opacity = ''; n.style.transform = ''; });
          if (grid) [...grid.children].forEach((n) => { n.style.opacity = ''; n.style.transform = ''; });
          if (hd) hd.forEach((n) => { n.style.opacity = ''; n.style.transform = ''; });
        }
        if (!apiReset && api && api.setFlip) { api.setFlip({ flip: 0, fill: 0, zoom: 0 }); apiReset = true; }
        return;
      }
      if (pS === -2) pS = -1;
      const r = track.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) { pS = -1; return; }
      const pT = clamp(-r.top / Math.max(1, r.height - vh));
      pS = pS < 0 ? pT : pS + (pT - pS) * 0.06;
      if (Math.abs(pT - pS) < 0.0004) pS = pT;
      const p = pS;
      const zoom = io3(p / 0.3);
      const fl = io3((p - 0.22) / 0.36), fi = io3((p - 0.3) / 0.34);
      const ov = ss((p - 0.52) / 0.08), pn = io4((p - 0.56) / 0.3);
      const c1 = out3((p - 0.76) / 0.18), c2 = out3((p - 0.82) / 0.18);
      const s0 = Math.min(1, (vh - 40) / Math.max(1, front.offsetHeight));
      front.style.transform = 'scale(' + s0 + ')';
      if (shade) shade.style.opacity = '0';
      if (api && api.setFlip) api.setFlip({ flip: fl, fill: fi, zoom });
      if (doc) {
        if (!hd) hd = [doc.querySelector('.if-head'), doc.querySelector('.if-metrics')].filter(Boolean);
        const o = Math.max(0, 1 - zoom * 1.6).toFixed(3);
        hd.forEach((n) => { n.style.opacity = o; n.style.transform = 'translateY(' + (-zoom * 14).toFixed(1) + 'px)'; });
      }
      const fr = ov > 0 && api && api.getFaceRect ? api.getFaceRect() : null;
      back.style.transform = 'none';
      if (ov > 0 && fr) {
        /* the dark panel grows out of the 3D card face */
        const ir = ifr.getBoundingClientRect(), k = ir.width / Math.max(1, ifr.offsetWidth), br = back.getBoundingClientRect();
        const c = (v) => Math.max(0, v);
        const L = c(ir.left + fr.left * k - br.left), T = c(ir.top + fr.top * k - br.top);
        const Rr = c(br.right - (ir.left + (fr.left + fr.width) * k)), B = c(br.bottom - (ir.top + (fr.top + fr.height) * k));
        if (Rf == null) Rf = parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 40;
        const m = 1 - pn, rad = 10 * k + (Rf - 10 * k) * pn, radB = 10 * k * m;
        back.style.clipPath = pn >= 1 ? 'none' : 'inset(' + (T * m).toFixed(1) + 'px ' + (Rr * m).toFixed(1) + 'px ' + (B * m).toFixed(1) + 'px ' + (L * m).toFixed(1) + 'px round ' + rad.toFixed(1) + 'px ' + rad.toFixed(1) + 'px ' + radB.toFixed(1) + 'px ' + radB.toFixed(1) + 'px)';
        back.style.opacity = ov.toFixed(3); back.style.visibility = 'visible';
      } else if (ov > 0) {
        back.style.clipPath = ''; back.style.opacity = (ov * pn).toFixed(3); back.style.visibility = 'visible';
      } else back.style.visibility = 'hidden';
      kids().forEach((n) => { if (n !== grid) n.style.opacity = (0.25 + 0.75 * pn).toFixed(3); });
      if (grid) [...grid.children].forEach((n, i) => {
        const v = i === 0 ? c1 : c2;
        n.style.opacity = v.toFixed(3);
        n.style.transform = i === 0 ? 'translateX(' + ((1 - v) * -24).toFixed(1) + 'px)' : 'translateY(' + ((1 - v) * 36).toFixed(1) + 'px) scale(' + (0.96 + 0.04 * v).toFixed(4) + ')';
      });
      front.style.visibility = pn >= 1 ? 'hidden' : 'visible';
    };
    requestAnimationFrame(tick);
  }

  /* ---- starfield behind the FAQ ---------------------------------------------- */
  function startStars() {
    const canvas = ref('star');
    if (!canvas) return;
    const mob = innerWidth <= 640;
    const dpr = mob ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    const ctx = canvas.getContext('2d');
    let cw = 0, ch = 0, visible = true;
    const sync = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      if (cw !== w || ch !== h) {
        cw = w; ch = h;
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      return true;
    };
    if ('IntersectionObserver' in window) {
      visible = false;
      new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; }, { rootMargin: '120px' }).observe(canvas);
    }
    const level = MOTION;
    const count = Math.round((70 + 110 * level) * (mob ? 1.1 : 2.4) / 1.7);
    const stars = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), tw: Math.random() * Math.PI * 2 }));
    const nodes = Array.from({ length: mob ? 5 : 9 }, () => ({ x: 0.1 + Math.random() * 0.8, y: 0.12 + Math.random() * 0.76, ph: Math.random() * Math.PI * 2 }));
    let shoot = null;
    const t0 = performance.now();
    const frame = (t) => {
      if (!sync()) return;
      const w = cw, h = ch, e = (t - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      /* stars start white on the dark tail and ink in toward grey further down */
      const G = innerWidth <= 640 ? 250 : 400;
      const ink = (y) => { const k = clamp01(y / G); return k * k * (3 - 2 * k); };
      const mix = (k) => 'rgb(' + Math.round(255 + (132 - 255) * k) + ',' + Math.round(255 + (138 - 255) * k) + ',' + Math.round(255 + (147 - 255) * k) + ')';
      const spark = (x, y, L, wd) => {
        ctx.beginPath();
        ctx.moveTo(x, y - L); ctx.lineTo(x + wd, y); ctx.lineTo(x, y + L); ctx.lineTo(x - wd, y); ctx.closePath();
        ctx.moveTo(x - L, y); ctx.lineTo(x, y - wd); ctx.lineTo(x + L, y); ctx.lineTo(x, y + wd); ctx.closePath();
        ctx.fill();
      };
      for (const s of stars) {
        const drift = ((s.x + e * 0.004 * (0.3 + s.z)) % 1 + 1) % 1;
        const tw = 0.45 + 0.55 * Math.sin(s.tw + e * (1 + s.z * 2));
        const x = drift * w, y = s.y * h;
        ctx.fillStyle = mix(ink(y));
        ctx.globalAlpha = (0.28 + s.z * 0.62) * tw;
        if (s.z > 0.8) spark(x, y, 2.4 + (s.z - 0.8) * 26 * (0.55 + 0.45 * tw), 0.75);
        else { const d = 0.9 + s.z * 1.4; ctx.fillRect(x - d / 2, y - d / 2, d, d); }
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i], ax = a.x * w, ay = a.y * h;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], bx = b.x * w, by = b.y * h;
          const d = Math.hypot(ax - bx, ay - by), lim = Math.min(w, h) * 0.3;
          if (d < lim) {
            ctx.strokeStyle = 'rgba(138,144,152,' + (0.18 * (1 - d / lim)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          }
        }
        const pulse = 0.5 + 0.5 * Math.sin(a.ph + e * 1.6);
        const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, 14 + pulse * 10);
        g.addColorStop(0, 'rgba(176,182,190,' + (0.12 + 0.12 * pulse).toFixed(2) + ')');
        g.addColorStop(1, 'rgba(176,182,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(ax, ay, 14 + pulse * 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ay < G * 0.5 ? '#fff' : '#848a93';
        ctx.globalAlpha = 0.65 + 0.35 * pulse;
        spark(ax, ay, 5 + pulse * 3, 1);
        ctx.globalAlpha = 1;
      }
      if (!shoot && Math.random() < 0.006 * (0.4 + level)) {
        shoot = { x: Math.random() * w * 0.7, y: (innerWidth <= 640 ? 300 : 460) + Math.random() * h * 0.4, l: 0 };
      }
      if (shoot) {
        shoot.l += 9;
        const len = 90;
        const g = ctx.createLinearGradient(shoot.x + shoot.l, shoot.y + shoot.l * 0.4, shoot.x + shoot.l - len, shoot.y + (shoot.l - len) * 0.4);
        g.addColorStop(0, 'rgba(132,138,147,.6)');
        g.addColorStop(1, 'rgba(132,138,147,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(shoot.x + shoot.l, shoot.y + shoot.l * 0.4);
        ctx.lineTo(shoot.x + shoot.l - len, shoot.y + (shoot.l - len) * 0.4);
        ctx.stroke();
        if (shoot.l > w) shoot = null;
      }
    };
    const interval = 1000 / 30;
    let prev = 0;
    const step = (t) => {
      requestAnimationFrame(step);
      if (t - prev < interval) return;
      prev = t;
      if (visible && !document.hidden) frame(t);
    };
    requestAnimationFrame(step);
  }

  /* ---- revenue-share calculator + invoice ------------------------------------ */
  function startCalculator() {
    const inv = ref('inv');
    if (!inv) return;
    const RATE = 7.5; /* Gold tier, $ per lot */
    const cfg = { lots: { min: 10, max: 5000, step: 10 }, traders: { min: 1, max: 300, step: 1 } };
    const state = { lots: 600, traders: 13 };
    const inputs = {}, sliders = {};
    $$('[data-calc-input]').forEach((el) => { inputs[el.dataset.calcInput] = el; });
    $$('[data-calc-slider]').forEach((el) => { sliders[el.dataset.calcSlider] = el; });

    const d = new Date();
    const setText = (sel, v) => { const el = $(sel, inv); if (el) el.textContent = v; };
    setText('[data-inv-issued]', pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear());
    setText('[data-inv-period]', d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear());

    /* money figures count up/down to the new total */
    const tot = $('[data-inv-total]', inv);
    let live = null, to = null, raf = 0, colT = 0;
    const write = (v) => $$('[data-inv-money]', inv).forEach((el) => { el.textContent = money(v * parseFloat(el.dataset.mul || '1')); });
    const tween = (target) => {
      if (live == null) { live = to = target; write(target); return; }
      if (to === target) return;
      to = target;
      const from = live, t0 = performance.now(), DUR = 650;
      if (tot) tot.style.color = target >= from ? '#e7131b' : '#0a0a0a';
      cancelAnimationFrame(raf);
      const step = (now) => {
        const p = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
        live = from + (target - from) * e;
        write(live);
        if (p < 1) raf = requestAnimationFrame(step);
        else { clearTimeout(colT); colT = setTimeout(() => { if (tot) tot.style.color = '#0a0a0a'; }, 260); }
      };
      raf = requestAnimationFrame(step);
    };

    const render = () => {
      const { lots, traders } = state;
      for (const key of ['lots', 'traders']) {
        const c = cfg[key], s = sliders[key];
        if (!s) continue;
        const pct = ((state[key] - c.min) / (c.max - c.min) * 100).toFixed(2) + '%';
        $('[data-calc-fill]', s).style.width = pct;
        $('[data-calc-knob]', s).style.left = pct;
      }
      setText('[data-inv-lots]', (lots * traders).toLocaleString('en-US'));
      setText('[data-inv-no]', 'TQ-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + '-' + String(traders).padStart(3, '0'));
      tween(lots * traders * RATE);
    };

    for (const key of ['lots', 'traders']) {
      const c = cfg[key], input = inputs[key], slider = sliders[key];
      if (input) {
        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          state[key] = isNaN(v) ? 0 : Math.min(c.max, Math.max(0, v));
          render();
        });
        input.addEventListener('blur', () => {
          state[key] = Math.max(c.min, Math.min(c.max, Math.round(state[key] || c.min)));
          input.value = String(state[key]);
          render();
        });
      }
      if (slider) {
        slider.addEventListener('pointerdown', (e) => {
          const rect = slider.getBoundingClientRect();
          const apply = (clientX) => {
            const t = clamp01((clientX - rect.left) / rect.width);
            const v = Math.max(c.min, Math.min(c.max, Math.round((c.min + t * (c.max - c.min)) / c.step) * c.step));
            state[key] = v;
            if (input) input.value = String(v);
            render();
          };
          apply(e.clientX);
          const move = (ev) => apply(ev.clientX);
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
      }
    }
    render();
  }

  /* ---- sign-up form: the pen signs, dates, then the envelope flies --------- */
  function startForm() {
    const form = $('form[data-agreement]');
    const stage = ref('stage'), pen = ref('pen'), path = ref('sigPath'), sigBox = ref('sigBox');
    const name = ref('name'), date = ref('date'), datePlace = ref('datePlace'), dateBox = ref('dateBox');
    if (!form || !stage) return;
    const envBtn = $('.tq-env', form);
    const envTxt = envBtn && $('.tq-env__txt', envBtn);
    let submitted = false;

    if (date) {
      const d = new Date();
      date.textContent = pad(d.getDate()) + ' / ' + pad(d.getMonth() + 1) + ' / ' + d.getFullYear();
    }

    const penTransform = (x, y, deg) => 'translate(' + (x - 24).toFixed(1) + 'px, ' + (y - 245).toFixed(1) + 'px) rotate(' + deg + 'deg)';
    const poses = () => {
      const S = stage.getBoundingClientRect();
      const rel = (b) => ({ x: b.left - S.left, y: b.top - S.top, w: b.width, h: b.height });
      const P = { rest: { x: S.width + 70, y: S.height * 0.97, deg: 4 } };
      if (sigBox) {
        const o = rel(sigBox.getBoundingClientRect());
        P.writeY = o.y + o.h * 0.62; P.x0 = o.x + o.w * 0.04; P.x1 = o.x + o.w * 0.94;
      }
      if (dateBox) {
        const o = rel(dateBox.getBoundingClientRect());
        P.date = { x: o.x + o.w * 0.3, y: o.y + o.h * 0.78, deg: -30 };
      }
      return P;
    };
    const placePenRest = () => {
      if (!pen) return;
      const P = poses();
      pen.style.transition = 'none';
      pen.style.transform = penTransform(P.rest.x, P.rest.y, P.rest.deg);
      pen.style.opacity = '1';
    };
    requestAnimationFrame(() => requestAnimationFrame(placePenRest));
    window.addEventListener('resize', () => { if (!submitted) placePenRest(); });

    /* "Request sent": the label slides to the centre once the envelope is gone */
    const center = () => {
      if (!envTxt) return;
      const br = envBtn.getBoundingClientRect(), tr = envTxt.getBoundingClientRect();
      const cur = new DOMMatrixReadOnly(getComputedStyle(envTxt).transform).m41 || 0;
      envTxt.style.transform = 'translateX(' + ((br.left + br.width / 2) - (tr.left - cur + tr.width / 2)).toFixed(1) + 'px)';
    };
    const sendEnvelope = () => {
      const done = () => {
        if (envBtn) { envBtn.classList.remove('is-sealed', 'is-sent'); envBtn.classList.add('is-done'); }
        if (envTxt) envTxt.style.opacity = '0';
        setTimeout(() => {
          if (envTxt) envTxt.textContent = 'Request sent';
          if (envBtn) envBtn.setAttribute('aria-label', 'Request sent');
          requestAnimationFrame(() => { center(); if (envTxt) envTxt.style.opacity = '1'; });
        }, 220);
        window.addEventListener('resize', () => {
          if (!envTxt) return;
          envTxt.style.transition = 'none'; center(); void envTxt.offsetWidth; envTxt.style.transition = '';
        });
      };
      if (!envBtn || reducedMotion()) return done();
      envBtn.classList.add('is-sent');
      setTimeout(done, 1000);
    };
    const afterSign = (P) => {
      if (pen && P.date) {
        pen.style.transition = 'transform 364ms cubic-bezier(.4,0,.2,1)';
        pen.style.transform = penTransform(P.date.x, P.date.y, P.date.deg);
      }
      setTimeout(() => {
        if (datePlace) datePlace.style.opacity = '0';
        if (date) { date.style.opacity = '1'; date.style.transform = 'translateY(0)'; }
      }, 266);
      setTimeout(() => {
        if (!pen) return;
        pen.style.transition = 'transform 448ms cubic-bezier(.4,0,.2,1)';
        pen.style.transform = penTransform(P.rest.x, P.rest.y, P.rest.deg);
      }, 532);
      setTimeout(() => setTimeout(sendEnvelope, 500), 630);
    };
    const sign = () => {
      if (!pen || !path) return sendEnvelope();
      requestAnimationFrame(() => {
        const P = poses();
        const len = path.getTotalLength();
        path.style.transition = 'none';
        path.style.strokeDasharray = len + ' ' + len;
        path.style.strokeDashoffset = len;
        void path.getBoundingClientRect();
        pen.style.opacity = '1';
        pen.style.transition = 'transform 322ms cubic-bezier(.4,0,.2,1)';
        pen.style.transform = penTransform(P.x0, P.writeY, -46);
        const DUR = 1050;
        setTimeout(() => {
          const t0 = performance.now();
          const draw = (t) => {
            const k = clamp01((t - t0) / DUR);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            path.style.strokeDashoffset = (len * (1 - e)).toFixed(1);
            pen.style.transition = 'none';
            pen.style.transform = penTransform(P.x0 + (P.x1 - P.x0) * e, P.writeY - Math.sin(e * Math.PI * 3) * 4, -46);
            if (name) name.style.opacity = String(Math.min(1, e * 1.5));
            if (k < 1) requestAnimationFrame(draw);
            else afterSign(P);
          };
          requestAnimationFrame(draw);
        }, 329);
      });
    };

    /* Delivery: the fields are POSTed to data-endpoint while the animation plays.
     * "/" = Netlify Forms (form name "partner-request"); any form backend that
     * accepts urlencoded POSTs (Formspree, a CRM webhook) works the same way. */
    const endpoint = form.dataset.endpoint;
    const showError = (msg) => {
      let p = $('.tq-form-error', form);
      if (!p) { p = document.createElement('p'); p.className = 'tq-form-error'; p.setAttribute('role', 'alert'); form.appendChild(p); }
      p.textContent = msg;
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (submitted) return;
      if (endpoint) {
        const email = form.elements.email;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { email.focus(); showError('Please enter a valid email address.'); return; }
        const prev = $('.tq-form-error', form); if (prev) prev.remove();
        fetch(endpoint, { method: 'POST', body: new URLSearchParams(new FormData(form)), headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' } })
          .then((r) => { if (!r.ok) throw new Error(r.status); })
          .catch(() => showError('We couldn’t send your request. Please reload the page and try again.'));
      }
      submitted = true;
      if (envBtn) envBtn.classList.add('is-sealed');
      sign();
    });
  }

  /* ---- FAQ accordion (one open at a time) ------------------------------------- */
  function startFaq() {
    const cards = $$('[data-faq-card]');
    const set = (card, open) => {
      $('[data-faq-toggle]', card).setAttribute('aria-expanded', String(open));
      $('[data-faq-panel]', card).style.gridTemplateRows = open ? '1fr' : '0fr';
      $('[data-faq-chev]', card).style.transform = 'rotate(' + (open ? 180 : 0) + 'deg)';
      $('[data-faq-edge]', card).style.opacity = open ? '1' : '0';
    };
    cards.forEach((card) => {
      $('[data-faq-toggle]', card).addEventListener('click', () => {
        const open = $('[data-faq-toggle]', card).getAttribute('aria-expanded') !== 'true';
        cards.forEach((c) => set(c, c === card && open));
      });
    });
  }

  startFanMenu();
  startFab();
  startDock();
  startIframeFit();
  startFanTap();
  startIframePause();
  startFlip();
  startHowLine();
  startStars();
  startCalculator();
  startForm();
  startFaq();
})();
