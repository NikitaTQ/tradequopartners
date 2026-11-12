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
      const el = e.target.closest && e.target.closest('.tq-dock, .tq-env, .tq-launch, .tq-logo, .tq-crys');
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
      if (d && d.tqReady) {
        /* an embed drew its first frame: fade it in over its poster */
        $$('iframe').forEach((f) => {
          if (f.contentWindow !== e.source) return;
          f.style.opacity = '1';
          /* a transparent scene must not show its still underneath: hide the poster */
          const poster = f.parentNode && f.parentNode.querySelector('[data-poster]');
          if (poster) poster.style.opacity = '0';
        });
        return;
      }
      if (!d || typeof d.tqFrameH !== 'number' || d.tqFrameH < 50) return;
      $$('iframe').forEach((f) => {
        if (f.contentWindow === e.source) { f.style.height = Math.ceil(d.tqFrameH) + 'px'; f.style.aspectRatio = 'auto'; }
      });
    });
  }

  /* ---- embeds: load on approach, pause off-screen ----------------------------
   * The embeds are same-origin, so they share the page's main thread: anything
   * they do while out of view costs scroll smoothness. They only load about a
   * screen before they are reached (a display:none embed — the other film
   * layout — never loads), and stop rendering once out of view: they poll
   * window.__tqPaused. `data-covered` marks an embed hidden under other content. */
  function setEmbedPaused(f) {
    try { if (f.contentWindow) f.contentWindow.__tqPaused = f.dataset.inview !== '1' || f.hasAttribute('data-covered'); } catch (e) {}
  }
  function startEmbeds() {
    const frames = $$('iframe[data-embed]');
    const pending = new Set(frames);
    const start = (f) => {
      if (!pending.has(f)) return;
      pending.delete(f);
      load.unobserve(f);
      f.src = f.dataset.src;
    };
    const load = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) start(en.target); });
    }, { rootMargin: '50% 0px' });
    /* Nothing heavy starts before the visitor does something: the first screen
     * paints and becomes interactive with the main thread to itself. After the
     * first scroll/touch/key, the rest warm up one by one in idle time, so their
     * start-up (shaders, React mount) doesn't land mid-scroll. Skips the film
     * layout that is display:none, and data-saver connections. */
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const warm = () => {
      const next = [...pending].find((f) => f.getClientRects().length);
      if (!next) return;
      start(next);
      next.addEventListener('load', () => setTimeout(() => idle(warm, { timeout: 3000 }), 600), { once: true });
    };
    const saveData = navigator.connection && navigator.connection.saveData;
    const events = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'];
    let started = false;
    const first = () => {
      if (started) return;
      started = true;
      events.forEach((ev) => window.removeEventListener(ev, first, { passive: true }));
      frames.forEach((f) => load.observe(f));
      if (!saveData) idle(warm, { timeout: 2000 });
    };
    events.forEach((ev) => window.addEventListener(ev, first, { passive: true }));
    if (scrollY > 0) first(); /* reload half-way down the page */
    /* frames marked data-eager sit in the first screen and show a matching poster meanwhile (none at
       the moment: the program cards' art is a still image now): they also start on the first mouse movement */
    const eager = frames.filter((f) => f.hasAttribute('data-eager'));
    if (eager.length && !saveData) {
      const go = () => { window.removeEventListener('pointermove', go); idle(() => eager.forEach((f) => { if (f.getClientRects().length) start(f); }), { timeout: 600 }); };
      window.addEventListener('pointermove', go, { passive: true });
      /* touch screens have no pointer to move: the art in view starts once the page has loaded, so it moves
         from the start instead of waiting on its still for the first touch */
      if (matchMedia('(hover: none)').matches) {
        const inView = (f) => { const r = f.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
        const t = () => idle(() => eager.forEach((f) => { if (inView(f)) start(f); }), { timeout: 1200 });
        if (document.readyState === 'complete') t(); else window.addEventListener('load', t, { once: true });
      }
    }
    const view = new IntersectionObserver((entries) => {
      entries.forEach((en) => { en.target.dataset.inview = en.isIntersecting ? '1' : '0'; setEmbedPaused(en.target); });
    }, { rootMargin: '80px 0px' });
    frames.forEach((f) => {
      f.addEventListener('load', () => setEmbedPaused(f));
      view.observe(f);
    });
  }

  /* Run `start`/`stop` as `el` enters/leaves the viewport (± margin). */
  function whileVisible(el, margin, start, stop) {
    new IntersectionObserver((en) => { (en[en.length - 1].isIntersecting ? start : stop)(); }, { rootMargin: margin }).observe(el);
  }

  /* Infinite CSS animations (breathing CTAs, pulses, marquee) idle off-screen. */
  function startAnimationGate() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.toggleAttribute('data-offscreen', !en.isIntersecting));
    }, { rootMargin: '100px 0px' });
    $$('#signup, #how, #calculator, #reviews, #film, [data-flip-track], #faq, #reach').forEach((el) => io.observe(el));
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
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.addEventListener('pageshow', (e) => { if (e.persisted) set(false); });
  }

  /* ---- landing: partner events in the corner (Partner_Event_Toasts) ---------------------------------------
   * While the first screen is in view on a desktop from 1280px, an event line slides up from the bottom-left
   * corner every 3.2 s; three stand at a time, the oldest fades out. The events are generated as the design
   * does it: a name, one of its forty lines (wording per language in assets/js/toasts/<lang>.js, loaded the first
   * time the stack shows) and a figure in the line's range; the caption under the stack says they are examples.
   * Hovering a line pauses the stream; it also stops while the tab is hidden, and the stack fades out once the
   * first screen has scrolled away. */
  function startToasts() {
    const box = $('[data-toasts]'), hero = document.getElementById('signup');
    const stack = box && $('[data-toasts-stack]', box);
    if (!box || !hero || !stack) return;
    const wide = matchMedia('(min-width: 1280px)');
    const NAMES = ['Jack', 'Nick', 'Amir', 'Sofia', 'Lukas', 'Mei', 'Ravi', 'Omar', 'Elena', 'Kwame', 'Diego', 'Yuki', 'Fatima', 'Tomás', 'Anya', 'Chen', 'Priya', 'Mateo',
      'Leila', 'Hassan', 'Marco', 'Ines', 'Daniel', 'Aisha', 'Viktor', 'Hana', 'Carlos', 'Nadia', 'Samuel', 'Julia', 'Arjun', 'Zara', 'Felix', 'Lina', 'Youssef', 'Emma',
      'Kenji', 'Sara', 'Pavel', 'Grace', 'Adam', 'Maya', 'Ivan', 'Noor', 'Leo', 'Chloe', 'Tariq', 'Rosa', 'Ethan', 'Amina', 'Bruno', 'Olga', 'Kai', 'Selin', 'Hugo',
      'Dina', 'Mohammed', 'Lucia', 'Sami', 'Vera'];
    const SYMS = ['XAUUSD', 'EURUSD', 'GBPJPY', 'USDJPY', 'NAS100', 'BTCUSD', 'GBPUSD', 'US30', 'XAGUSD', 'AUDUSD'];
    /* the figure of each of the forty lines, in the design's order: [kind, from, to] */
    const SPEC = [['usd', 800, 12000], ['num', 4, 40], ['usd', 120, 4200], ['usd', 60, 2600], ['usd', 400, 9000], ['usd', 1500, 22000], ['num', 3, 48],
      ['num', 2, 12], [''], ['num', 40, 600], ['usd', 50000, 400000], ['usd', 200, 6000], ['fix', '87%'], ['num', 120, 3800], ['num', 1000, 25000],
      ['usd', 150, 3800], [''], ['num', 8, 90], ['num', 5, 70], ['usd', 90, 2400], [''], ['usd', 10000, 90000], ['num', 10, 160], ['usd', 300, 5000],
      ['usd', 500, 7000], ['usd', 300, 6000], ['usd', 80, 1900], ['num', 6, 60], ['num', 2, 9], ['num', 12, 140], ['num', 8, 95], ['usd', 1200, 9000],
      ['usd', 40, 900], ['usd', 200, 5000], ['num', 100, 999], [''], ['num', 200, 4000], [''], ['usd', 500, 8000], ['usd', 50, 1200]];
    const MAX = 3, GAP = 9, EVERY = 3200;
    const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    let words = null, loading = false, deck = [], timer = 0, inView = false, hover = false;
    const deal = () => {
      const d = [];
      for (let i = 0; i < 120; i++) {
        const k = i % SPEC.length, [kind, a, b] = SPEC[k];
        const v = kind === 'usd' ? '$' + fmt(rnd(a, b)) : kind === 'num' ? fmt(rnd(a, b)) : kind === 'fix' ? a : '';
        d.push({ p: words.t[k], v, money: kind === 'usd', big: kind === 'usd' && parseFloat(v.replace(/[$,]/g, '')) >= 7000, name: pick(NAMES), sym: pick(SYMS) });
      }
      for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
      return d;
    };
    const make = (ev) => {
      const el = document.createElement('div');
      el.className = 'tq-toast' + (ev.big ? ' is-big' : '');
      const dot = document.createElement('i');
      if (ev.money) dot.className = 'is-money';
      const txt = document.createElement('span');
      ev.p.split(/(\{[nvs]\})/).forEach((part) => {
        if (!part) return;
        if (part === '{n}' || part === '{v}') {
          const b = document.createElement('b');
          b.textContent = part === '{n}' ? ev.name : ev.v;
          if (part === '{v}') b.className = 'v';
          txt.appendChild(b);
        } else txt.appendChild(document.createTextNode(part === '{s}' ? ev.sym : part));
      });
      el.append(dot, txt);
      return el;
    };
    /* the newest at the bottom; each one above the next by its own height (a long line may take two) */
    const layout = () => {
      let y = 0;
      [...stack.children].filter((el) => !el.dataset.gone).forEach((el, i) => {
        const out = i >= MAX;
        el.style.transform = 'translate3d(0,' + (-y) + 'px,0) scale(' + (out ? 0.96 : 1) + ')';
        el.style.opacity = out ? '0' : i === MAX - 1 ? '0.72' : '1';
        if (out) { el.dataset.gone = '1'; setTimeout(() => el.remove(), 650); }
        y += el.offsetHeight + GAP;
      });
    };
    const push = () => {
      if (!deck.length) deck = deal();
      const el = make(deck.pop());
      el.style.opacity = '0'; el.style.transform = 'translate3d(0,12px,0)'; el.style.filter = 'blur(4px)';
      el.addEventListener('pointerenter', () => { hover = true; });
      el.addEventListener('pointerleave', () => { hover = false; });
      stack.prepend(el);
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.filter = ''; layout(); }));
    };
    const tick = () => { timer = setTimeout(tick, EVERY); if (!hover && !document.hidden) push(); };
    const update = async () => {
      const on = inView && wide.matches;
      if (on && !words) {
        if (loading) return;
        loading = true;
        try { words = (await import(new URL(box.dataset.src, document.baseURI).href)).default; } catch (e) { return; }   /* from the page's URL, not the script's */
        $('[data-toasts-cap]', box).textContent = words.label;
        return update();
      }
      box.classList.toggle('is-on', on);
      if (on && !timer) timer = setTimeout(tick, 600);
      if (!on && timer) { clearTimeout(timer); timer = 0; }
    };
    /* the first screen: until three quarters of a screen has scrolled by (the form's section runs on far below it) */
    const check = () => { const v = scrollY < innerHeight * 0.75; if (v !== inView) { inView = v; update(); } };
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    if (wide.addEventListener) wide.addEventListener('change', update);
    check();
  }

  /* ---- sticky header: shorter once the page scrolls, out of the way while a full-screen scene holds the screen
   * (the landing's flip track: only where it pins, i.e. position: sticky) ---- */
  function startStickyHead() {
    const head = $('header.tq-head');
    if (!head) return;
    const stages = $$('[data-flip-sticky]');
    let pinned = [], raf = 0;
    const measure = () => { pinned = stages.filter((s) => getComputedStyle(s).position === 'sticky').map((s) => s.parentElement); };
    const update = () => {
      raf = 0;
      head.classList.toggle('is-stuck', scrollY > 4);
      const h = head.offsetHeight;
      head.classList.toggle('is-away', pinned.some((t) => { const r = t.getBoundingClientRect(); return r.top < h && r.bottom > innerHeight * 0.6; }));
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(update); };
    measure();
    addEventListener('scroll', later, { passive: true });
    addEventListener('resize', () => { measure(); later(); });
    update();
  }

  /* ---- this page's table of contents (the fan on desktop, the red menu on phones) --------------------
   * A link scrolls smoothly to its section (and the menu closes); while a menu is open, the section on screen
   * is marked (aria-current="location"). The header's link to the page you are on takes you back to its top. */
  function startToc() {
    const links = $$('[data-toc-link]');
    const secs = [...new Set(links.map((a) => a.getAttribute('href').slice(1)))].map((id) => document.getElementById(id)).filter(Boolean);
    const go = (y) => window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' });
    links.forEach((a) => a.addEventListener('click', (e) => {
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (!t) return;
      e.preventDefault();
      /* clear of the sticky header (68px once scrolled); a stop inside a full-screen scene goes exactly there,
         the header steps aside for the scene anyway */
      const head = $('header.tq-head');
      const off = head && !t.closest('[data-flip-track]') ? 68 : 0;
      go(t.getBoundingClientRect().top + scrollY - off);
      history.replaceState(null, '', '#' + t.id);
    }));
    $$('[data-to-top]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(0); }));
    let raf = 0;
    const mark = () => {
      raf = 0;
      let cur = secs[0];
      secs.forEach((s) => { if (s.getBoundingClientRect().top <= innerHeight * 0.4) cur = s; });
      links.forEach((a) => { if (cur && a.getAttribute('href') === '#' + cur.id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    };
    $$('[data-fan-toggle], [data-fab-toggle]').forEach((b) => b.addEventListener('click', () => requestAnimationFrame(mark)));
    window.addEventListener('scroll', () => {
      if (!raf && document.querySelector('[data-fanmenu][data-open], [data-fab][data-open]')) raf = requestAnimationFrame(mark);
    }, { passive: true });
  }

  /* ---- mobile quick menu --------------------------------------------------- */
  function startFab() {
    const fab = $('[data-fab]'), btn = $('[data-fab-toggle]');
    if (!fab || !btn) return;
    const set = (open) => { fab.toggleAttribute('data-open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(!fab.hasAttribute('data-open')));
    $$('.tq-fab-link', fab).forEach((a) => a.addEventListener('click', () => set(false)));
    /* a tap anywhere else, or Escape, closes it (Escape hands the focus back to the button) */
    document.addEventListener('pointerdown', (e) => { if (fab.hasAttribute('data-open') && !fab.contains(e.target)) set(false); }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fab.hasAttribute('data-open')) { set(false); btn.focus(); } });
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
    let raf = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
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
      /* all layout reads first, then writes — no forced re-layout per dot */
      const rtl = document.documentElement.dir === 'rtl';   /* step 1 sits on the right, the fill grows from there */
      const reached = dots.map((d) => { const dr = d.getBoundingClientRect(); return w >= (rtl ? lr.right - dr.right : dr.left - lr.left); });
      if (fill) { fill.style.width = w + 'px'; fill.style.opacity = op; }
      reached.forEach((on, i) => set(i, op > .5 && on));
    };
    /* animate only while the section is on screen; resume the cycle near where it was */
    let pausedAt = 0;
    whileVisible(sec, '0px',
      () => { if (raf) return; if (pausedAt) t0 += performance.now() - pausedAt; pausedAt = 0; raf = requestAnimationFrame(tick); },
      () => { if (!raf) return; cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now(); });
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
    let pS = -1, hd = null, Rf = null, apiReset = false, raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
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
      const fh = front.offsetHeight;
      const ir = ifr.getBoundingClientRect(), iw = ifr.offsetWidth, br = back.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) { pS = -1; return; }
      const pT = clamp(-r.top / Math.max(1, r.height - vh));
      pS = pS < 0 ? pT : pS + (pT - pS) * 0.06;
      if (Math.abs(pT - pS) < 0.0004) pS = pT;
      const p = pS;
      const zoom = io3(p / 0.3);
      const fl = io3((p - 0.22) / 0.36), fi = io3((p - 0.3) / 0.34);
      const ov = ss((p - 0.52) / 0.08), pn = io4((p - 0.56) / 0.3);
      const c1 = out3((p - 0.76) / 0.18), c2 = out3((p - 0.82) / 0.18);
      const s0 = Math.min(1, (vh - 40) / Math.max(1, fh));
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
        const k = ir.width / Math.max(1, iw);
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
      if ((pn >= 1) !== ifr.hasAttribute('data-covered')) { ifr.toggleAttribute('data-covered', pn >= 1); setEmbedPaused(ifr); }
    };
    whileVisible(track, '50px 0px',
      () => { if (!raf) raf = requestAnimationFrame(tick); },
      () => { if (raf) { cancelAnimationFrame(raf); raf = 0; pS = -1; } });
    /* crossing the mobile breakpoint while the track is off-screen still resets it */
    window.addEventListener('resize', () => {
      if (raf || innerWidth > 640 || pS === -2) return;
      tick(); cancelAnimationFrame(raf); raf = 0;
    }, { passive: true });
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
    const box = inv && inv.closest('[data-calc]');
    if (!inv || !box) return;
    /* one rate per lot, $7.50, as in the design; the same as partner-terms/ (plan.js) */
    const RATE = 7.5;
    const cfg = { lots: { min: 10, max: 1000 }, traders: { min: 1, max: 300 } };
    const state = { lots: 130, traders: 60 };
    const ranges = {}, sliders = {}, vals = {};
    $$('[data-calc-range]', box).forEach((el) => { ranges[el.dataset.calcRange] = el; });
    $$('[data-calc-slider]', box).forEach((el) => { sliders[el.dataset.calcSlider] = el; });
    $$('[data-calc-val]', box).forEach((el) => { vals[el.dataset.calcVal] = el; });

    const d = new Date();
    const yymm = String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1);
    let numLocale = 'en-US';
    try { numLocale = Intl.NumberFormat.supportedLocalesOf([document.documentElement.lang + '-u-nu-latn'])[0] || 'en-US'; } catch (e) {}
    const setText = (sel, v, root) => { const el = $(sel, root || inv); if (el) el.textContent = v; };
    setText('[data-inv-issued]', pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear());
    setText('[data-calc-tid]', 'TQ-' + yymm, box);
    /* the receipt covers a day, a month or a year (the Day / Month / Year switch): the amounts, the lot
       count, the PERIOD field and the caption over the total follow it. A day is a thirtieth of the month,
       a year twelve months. */
    const PER = { day: 1 / 30, month: 1, year: 12 };
    let per = 'month';
    /* period in the page language, Western digits (amounts stay $ / en-US everywhere) */
    const PERIOD_FMT = { day: { day: 'numeric', month: 'short', year: 'numeric' }, month: { month: 'short', year: 'numeric' }, year: { year: 'numeric' } };
    const periodText = () => {
      try { return new Intl.DateTimeFormat(document.documentElement.lang + '-u-nu-latn', PERIOD_FMT[per]).format(d); }
      catch (e) { return d.toLocaleString('en-US', PERIOD_FMT[per]); }
    };
    const cap = $('[data-inv-cap]', inv);
    const showPeriod = () => { setText('[data-inv-period]', periodText()); if (cap && cap.dataset[per]) cap.textContent = cap.dataset[per]; };
    showPeriod();

    /* money figures count up/down to the new total */
    const tot = $('[data-inv-total]', inv);
    const totals = tot && tot.closest('[data-inv-totals]');
    /* the big total steps down to fit when a long figure (a year of a big network) would run past the receipt */
    const fit = (v) => {
      if (!tot || !totals) return;
      tot.style.removeProperty('font-size');
      const keep = tot.textContent;
      tot.textContent = money(v);
      const room = totals.clientWidth, need = tot.scrollWidth;
      if (room && need > room) tot.style.setProperty('font-size', Math.floor(parseFloat(getComputedStyle(tot).fontSize) * room / need * 0.98) + 'px');
      tot.textContent = keep;
    };
    let live = null, to = null, raf = 0, colT = 0;
    const write = (v) => $$('[data-inv-money]', inv).forEach((el) => { el.textContent = money(v); });
    const tween = (target) => {
      if (live == null) { live = to = target; fit(target); write(target); return; }
      if (to === target) return;
      to = target;
      const from = live, t0 = performance.now(), DUR = 650;
      fit(Math.max(from, target));
      if (tot) tot.style.color = target >= from ? '#0f9a52' : '#0a0a0a';   /* money up: green */
      cancelAnimationFrame(raf);
      const step = (now) => {
        const p = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
        live = from + (target - from) * e;
        write(live);
        if (p < 1) raf = requestAnimationFrame(step);
        else { fit(target); clearTimeout(colT); colT = setTimeout(() => { if (tot) tot.style.color = '#0a0a0a'; }, 260); }
      };
      raf = requestAnimationFrame(step);
    };
    let fitT = 0;
    addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => { if (to != null) fit(to); }, 120); });

    const render = () => {
      const { lots, traders } = state;
      for (const key of ['lots', 'traders']) {
        const c = cfg[key], s = sliders[key];
        const pct = ((state[key] - c.min) / (c.max - c.min) * 100).toFixed(2) + '%';
        if (s) { $('[data-calc-fill]', s).style.width = pct; $('[data-calc-knob]', s).style.left = pct; }
        if (vals[key]) vals[key].textContent = state[key].toLocaleString(numLocale);
      }
      /* lot count in local style (a day can be a fraction of a lot); $ amounts stay en-US */
      setText('[data-inv-lots]', (lots * traders * PER[per]).toLocaleString(numLocale, { maximumFractionDigits: 1 }));
      const no = String(traders).padStart(3, '0');
      setText('[data-inv-no]', 'TQ-' + yymm + '-' + no);
      setText('[data-inv-code]', 'TQ ' + yymm + ' ' + no);
      setText('[data-inv-rate]', '$' + RATE.toFixed(2));
      tween(lots * traders * RATE * PER[per]);
    };

    const perBox = $('[data-inv-per]', box);
    if (perBox) {
      const btns = $$('button[data-per]', perBox);
      btns.forEach((b, i) => b.addEventListener('click', () => {
        if (per === b.dataset.per) return;
        per = b.dataset.per;
        btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        perBox.style.setProperty('--i', String(i));
        showPeriod();
        render();
      }));
    }

    for (const key of ['lots', 'traders']) {
      const r = ranges[key];
      if (!r) continue;
      state[key] = Number(r.value) || state[key];
      r.addEventListener('input', () => { state[key] = Number(r.value); render(); });
    }
    render();
  }

  /* ---- sign-up form: the envelope flies off the button, then the success screen --- */
  function startForm() {
    const form = $('form[data-agreement]');
    const stage = ref('stage'), date = ref('date');
    if (!form || !stage) return;
    const done = $('[data-form-done]', stage);
    const envBtn = $('.tq-env', form);
    /* copy comes from the page so every language build carries its own */
    const msg = {
      email: form.dataset.msgEmail || 'Please enter a valid email address.',
      error: form.dataset.msgError || 'We couldn’t send your request. Please reload the page and try again.',
    };
    let submitted = false;

    /* The date is filled in for the visitor: today's, kept current if the tab stays open past midnight. */
    const writeDate = () => {
      if (!date) return;
      const d = new Date();
      date.textContent = pad(d.getDate()) + ' / ' + pad(d.getMonth() + 1) + ' / ' + d.getFullYear();
      date.style.color = '#0a0a0a';
    };
    writeDate();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !submitted) writeDate(); });

    /* Success screen (Partner_Form_Success design): personalised, unhidden, then .is-done on the
     * stage fades the form back and builds the screen up in its place (CSS does the timing). */
    const showSuccess = () => {
      if (!done) return;
      const typed = form.elements.name ? form.elements.name.value.trim() : '';
      const first = typed.split(/\s+/)[0] || done.dataset.fallback || '';
      const thanks = $('[data-done-thanks]', done);
      if (thanks) thanks.textContent = thanks.textContent.replace('{name}', first);
      const d = new Date();
      $$('[data-done-date]', done).forEach((n) => { n.textContent = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); });
      done.hidden = false;
      void done.offsetWidth;   // start the transitions from the hidden state
      stage.classList.add('is-done');
      const title = $('.tq-done__title', done);
      setTimeout(() => { if (title) title.focus({ preventScroll: true }); }, 700);
      /* on a short screen the screen may start above the fold: bring its top into view */
      const top = stage.getBoundingClientRect().top;
      if (top < 0) window.scrollBy({ top: top - 24, behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    const showError = (text) => {
      let p = $('.tq-form-error', form);
      if (!p) { p = document.createElement('p'); p.className = 'tq-form-error'; p.setAttribute('role', 'alert'); form.appendChild(p); }
      p.textContent = text;
    };
    /* the request didn't go through: say so and give the button back, so the visitor can retry */
    const fail = () => {
      showError(msg.error);
      if (envBtn) { envBtn.classList.remove('is-sealed', 'is-sent', 'is-done'); envBtn.removeAttribute('aria-busy'); }
      submitted = false;
    };

    /* Delivery: the fields are POSTed to data-endpoint while the envelope flies.
     * "/" = Netlify Forms (form name "partner-request"); any form backend that
     * accepts urlencoded POSTs (Formspree, a CRM webhook) works the same way.
     * The success screen waits for both the envelope and the server's answer.
     * ?preview=sent skips the POST, to look at the success screen without sending anything. */
    const endpoint = form.dataset.endpoint;
    const preview = /[?&]preview=sent(&|$)/.test(location.search);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (submitted) return;
      const email = form.elements.email;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { email.focus(); showError(msg.email); return; }
      const prev = $('.tq-form-error', form); if (prev) prev.remove();
      submitted = true;
      writeDate();

      let flown = false, ok = null;
      const settle = () => { if (flown && ok !== null) (ok ? showSuccess : fail)(); };
      const request = (!endpoint || preview) ? Promise.resolve()
        : fetch(endpoint, { method: 'POST', body: new URLSearchParams(new FormData(form)), headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' } })
          .then((r) => { if (!r.ok) throw new Error(r.status); });
      /* a failed send names its cause in the console (e.g. 404 = the form isn't registered on Netlify) */
      request.then(() => { ok = true; settle(); }, (err) => { ok = false; console.warn('[TradeQuo] form not sent:', (err && err.message) || err); settle(); });

      if (envBtn) { envBtn.classList.add('is-sealed'); envBtn.setAttribute('aria-busy', 'true'); }
      const still = !envBtn || reducedMotion();
      if (!still) envBtn.classList.add('is-sent');   // the letter flies off the button (1 s)
      setTimeout(() => {
        flown = true;
        if (envBtn) { envBtn.classList.remove('is-sent'); envBtn.classList.add('is-done'); }
        settle();
      }, still ? 0 : 1000);
    });
  }

  /* ---- FAQ accordion (one open at a time) ------------------------------------- */
  /* ---- language switcher ------------------------------------------------------ */
  function startLang() {
    const box = $('[data-lang]');
    if (!box) return;
    const btn = $('.tq-lang__btn', box), menu = $('.tq-lang__menu', box);
    const set = (open) => {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) { const cur = $('[aria-current="true"]', menu); if (cur) cur.scrollIntoView({ block: 'nearest' }); }
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(menu.hidden); });
    document.addEventListener('click', (e) => { if (!menu.hidden && !box.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });

    /* Browser auto-translate is allowed by default; a visitor who reads the page in its own
     * language can switch it off. The <head> script applies the choice (translate="no",
     * <meta name="google" content="notranslate">) before the browser looks at the page,
     * so changing it reloads: that also undoes a translation already on screen. */
    const tr = $('[data-translate-toggle]', box);
    if (tr) {
      let off = false;
      try { off = !!localStorage.getItem('tqNoTranslate'); } catch (e) {}
      tr.setAttribute('aria-checked', String(!off));
      tr.addEventListener('click', () => {
        try {
          if (off) localStorage.removeItem('tqNoTranslate');
          else localStorage.setItem('tqNoTranslate', '1');
        } catch (e) { return; }
        tr.setAttribute('aria-checked', String(off));
        setTimeout(() => location.reload(), 180);
      });
    }
  }

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

  /* 3D call-to-action buttons on /programs/ (CTA_Ionic_Capital, CTA_Pedestal, CTA_Trust_Dome):
   * hover or keyboard focus eases --ch to 1, the button leans toward the pointer
   * (--ctx/--cty) and dips on press (--cd); the CSS does the rest. The Ionic volutes are
   * drawn in the button's own coordinates, so they are refitted to the label's width. */
  /* Liquid glass (Glass_Card_Grid_Liquid design); the frosted reviews (.tq-frost) share the pointer light. The refraction is an SVG filter used from
   * backdrop-filter, which only Chromium draws: there the filter goes into the page and html gets
   * .tq-liquid; other browsers keep the plain blur. The highlight follows the mouse; on touch the
   * glass simply rests. */
  function startGlass() {
    if (!$$('.tq-glass, .tp-glass, .tq-frost, .tp-cut').length) return;
    if (navigator.userAgentData && $$('.tq-glass, .tp-glass, .tp-cut').length && !document.getElementById('tq-liquid')) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      svg.innerHTML = '<filter id="tq-liquid" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">'
        + '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="11" result="n"/>'
        + '<feGaussianBlur in="n" stdDeviation="3" result="nb"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="nb" scale="46" xChannelSelector="R" yChannelSelector="G"/></filter>';
      document.body.appendChild(svg);
      document.documentElement.classList.add('tq-liquid');
    }
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    $$('.tq-glass, .tp-glass, .tq-frost').forEach((el) => {
      const set = (k, v) => el.style.setProperty(k, v);
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        set('--tqgx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        set('--tqgy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        set('--tqgh', '1');
      });
      el.addEventListener('pointerleave', () => { set('--tqgx', '30%'); set('--tqgy', '0%'); set('--tqgh', '0'); });
    });
  }

  /* ---- captions under headings: always two lines -----------------------------------------
   * Each caption's box is narrowed (in rem) to a little over half of its one-line width, so it breaks
   * into two lines at any screen size and in any language; text-wrap: balance evens the two lines.
   * Where the column is narrower than that half (tablets, side columns) the caption's type steps down,
   * at most to 65% of its size (never below its size before the
   * headings grew 1.6x), until two lines fit; if even that is not enough (phones, long copy)
   * it keeps its size and wraps with the column. A caption split by hand (a visible <br>) keeps its
   * own break. Measured again on resize, since the caption sizes follow the viewport. */
  function startTwoLine() {
    const els = $$('[data-sub2], .tp-sub, .tp-final__sub, .tp-dome-copy__sub');
    if (!els.length) return;
    const lines = (el) => { const lh = parseFloat(getComputedStyle(el).lineHeight); return lh ? Math.round(el.offsetHeight / lh) : 0; };
    const put = (el, k, v) => { if (v) el.style.setProperty(k, v, 'important'); else el.style.removeProperty(k); };
    const fitOne = (el, rem) => {
      if (el.dataset.mw0 == null) el.dataset.mw0 = el.style.maxWidth || '';
      if (el.dataset.fs0 == null) el.dataset.fs0 = el.style.fontSize || '';
      el.style.maxWidth = el.dataset.mw0; el.style.fontSize = el.dataset.fs0;
      if (!el.offsetParent) return;                                     /* hidden, e.g. the hero lead on phones */
      const split = [...el.querySelectorAll('br')].some((b) => getComputedStyle(b).display !== 'none');
      const base = parseFloat(getComputedStyle(el).fontSize);
      put(el, 'max-width', 'none');
      const room = el.offsetWidth;                                      /* the widest the column lets it be */
      for (const k of [1, .95, .9, .85, .8, .75, .7, .65]) {
        if (base * k < 15) break;                                       /* never under 15px: more lines instead */
        if (k < 1) put(el, 'font-size', (base * k).toFixed(1) + 'px');
        if (!split) {                                                   /* split by hand: the <br> makes the two lines */
          el.style.whiteSpace = 'nowrap'; el.style.width = 'max-content'; put(el, 'max-width', 'none');
          const one = el.offsetWidth;                                   /* layout width: transforms don't count */
          el.style.whiteSpace = ''; el.style.width = '';
          let w = Math.min(one / 2 + 8, room);
          put(el, 'max-width', (w / rem).toFixed(2) + 'rem');
          /* a long word at the break can push a third line: widen a little while the column allows */
          for (let i = 0; i < 12 && lines(el) > 2 && w < room; i++) { w = Math.min(room, w + one * 0.03); put(el, 'max-width', (w / rem).toFixed(2) + 'rem'); }
        }
        if (lines(el) <= 2) return;
      }
      el.style.removeProperty('font-size'); if (el.dataset.fs0) el.style.fontSize = el.dataset.fs0;   /* two lines can't be had here: keep the size */
      el.style.removeProperty('max-width'); if (el.dataset.mw0) el.style.maxWidth = el.dataset.mw0;
    };
    const fit = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      els.forEach((el) => fitOne(el, rem));
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 150); });
  }

  /* ---- processes that light up step by step: marketing-tools/ "From your portal to your audience"
   * (Process_Ignition_Section) and partner-terms/ "Paid every day" (Paid_Daily_Silver) ------------------------------
   * [data-stepper] holds [data-step] items. Every data-every ms the next step gets .is-on and the ones before it
   * .is-done; --k (0…1) on the stepper sizes its rail; after the last step it starts over. It runs only while on
   * screen (.is-live then, which also lets the CSS loops play) and starts from the first step each time it comes in.
   * Reduced motion: the last step lit, the rail full, still. */
  function startSteppers() {
    $$('[data-stepper]').forEach((box) => {
      const steps = $$('[data-step]', box), n = steps.length;
      if (!n) return;
      let on = 0, iv = 0;
      const set = (k) => {
        on = k;
        steps.forEach((s, i) => { s.classList.toggle('is-on', i === k); s.classList.toggle('is-done', i < k); });
        box.style.setProperty('--k', n > 1 ? (k / (n - 1)).toFixed(3) : '1');
      };
      if (reducedMotion()) { set(n - 1); return; }
      set(0);
      whileVisible(box, '0px', () => {
        if (iv) return;
        box.classList.add('is-live'); set(0);
        iv = setInterval(() => set((on + 1) % n), +box.dataset.every || 1600);
      }, () => { box.classList.remove('is-live'); clearInterval(iv); iv = 0; });
    });
  }

  /* ---- marketing-tools/: the partner dashboard in "Data and people" ticks along --------------------------
   * Every 1.6 s, while it is on screen: the bars shift left and a new one comes in red on the right, sign-ups,
   * lots and earnings creep up (the Data_and_People_Section design's numbers). Bars move by transform only.
   * The figures are bidi-isolated (LRI…PDI) so "+46" stays "+46" in Arabic; a label or figure too wide for its
   * box (long words on narrow phones) is shrunk to fit. Reduced motion: drawn once, then still. */
  function startLiveDash() {
    const dash = $('[data-live-dash]');
    if (!dash) return;
    const bars = $$('[data-ld-bars] i', dash);
    let h = bars.map((b) => Math.round(parseFloat((/scaleY\(([\d.]+)\)/.exec(b.style.transform) || [0, 0.5])[1]) * 100));
    let numLocale = 'en-US';
    try { numLocale = Intl.NumberFormat.supportedLocalesOf([document.documentElement.lang + '-u-nu-latn'])[0] || 'en-US'; } catch (e) {}
    const iso = (s) => '⁦' + s + '⁩';
    const n = (v) => v.toLocaleString(numLocale), usd = (v) => '$' + Math.round(v).toLocaleString('en-US');
    const set = (k, v) => { const el = $('[data-ld="' + k + '"]', dash); if (el) el.textContent = v; };
    const today = dash.dataset.today || '+{n}';
    const fitEls = $$('.tp-dp__stats span, .tp-dp__stats b, .tp-dp__stats em', dash);
    const fit = () => fitEls.forEach((el) => {
      el.style.fontSize = '';
      const room = el.clientWidth, w = el.scrollWidth;
      if (!room || w <= room + 1) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = Math.max(fs * 0.6, fs * room / w - 0.3).toFixed(1) + 'px';
    });
    let tick = 0, iv = 0;
    const draw = () => {
      bars.forEach((b, i) => {
        b.style.transform = 'scaleY(' + (Math.min(100, h[i]) / 100).toFixed(2) + ')';
        b.className = i === h.length - 1 ? 'is-red' : h[i] > (h[i - 1] || 0) ? 'is-up' : '';
      });
      set('signups', iso(n(184 + Math.floor(tick / 3))));
      set('signupsD', today.replace('+{n}', iso('+' + n(3 + Math.floor(tick / 3)))));
      set('lots', iso(n(7800 + tick * 2))); set('lotsD', iso('+' + n(42 + tick * 2)));
      set('earned', iso(usd(58500 + tick * 15))); set('earnedD', iso('+' + usd(1950 + tick * 15)));
      fit();
    };
    const step = () => {
      tick++;
      const last = h[h.length - 1];
      h = h.slice(1).concat(Math.max(14, Math.min(100, last + Math.round((Math.random() - 0.4) * 18))));
      draw();
    };
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 150); });
    if (reducedMotion()) return;
    whileVisible(dash, '0px', () => { if (!iv) iv = setInterval(step, 1600); }, () => { clearInterval(iv); iv = 0; });
  }

  /* ---- /programs/: a program card's big figure ("87%", "∞ tiers", "Yours.") keeps one line ------
   * It is set large (partner.css .tp-pc__big); where a language's wording is wider than its card, the
   * type steps down to fit, at most to 40%. Measured again once the fonts are in and on resize. */
  function startFitWide() {
    const els = $$('[data-fitw]');
    if (!els.length) return;
    const fit = () => els.forEach((el) => {
      el.style.fontSize = '';
      const fs0 = parseFloat(getComputedStyle(el).fontSize);
      for (let i = 0; i < 4; i++) {           /* a wrapped name may re-break as it shrinks: measure again */
        const room = el.clientWidth, w = el.scrollWidth;
        if (!room || w <= room + 1) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = Math.max(fs0 * 0.4, fs * room / w - 0.5).toFixed(1) + 'px';
      }
    });
    const all = () => { fit(); if (window.tqCutCards) window.tqCutCards(); };
    all();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(all, 150); });
  }

  /* ---- /programs/: the program cards' facets (Partner_Cards_8) ------------------------------------------
   * Each card is a slab of glass cut into facets: a corner from the top edge to a point on the side edge, and a
   * plate under the figure whose top runs from that point back across the card and whose side runs down to the
   * plate's bottom. The edges are drawn in the card's SVG (.tp-pc__cut, inside the leaning slab that clips it) in the card's own px, from where the plate
   * (.tp-pc__lead) sits, as in the design's 517px card; a shadow and a highlight per edge, red sparks where they
   * meet. Mirrored for right-to-left. Drawn again whenever a card changes size. Also levels the cards' rows. */
  function startProgCards() {
    const rail = $('[data-progs]');
    if (!rail) return;
    const cards = $$('.tp-pc', rail);
    const f = (n) => Math.round(n * 10) / 10;
    const draw = (card, i) => {
      const svg = $('.tp-pc__cut', card), lead = $('.tp-pc__lead', card);
      const W = card.offsetWidth, H = card.offsetHeight;
      if (!svg || !lead || !W || !H) return;
      const c = card.getBoundingClientRect(), l = lead.getBoundingClientRect(), k = c.width / W || 1;
      const s = W / 517, rtl = getComputedStyle(card).direction === 'rtl';
      const X = (x) => f(rtl ? W - x : x);
      const yL = (l.top - c.top) / k + 9 * s, yR = yL - 55 * s, yB = (l.bottom - c.top) / k;
      const T = [X(0.516 * W), 0], C = [X(W), 0], R = [X(W - 7 * s), f(yR)], E = [X(W), f(yR)], L = [X(0), f(yL)], Q = [X(0.74 * W), f(yB)], B = [X(0), f(yB)];
      const pt = (p) => p[0] + ' ' + p[1], seg = (a, b) => 'M' + pt(a) + 'L' + pt(b), poly = (...p) => 'M' + p.map(pt).join('L') + 'Z';
      const along = (a, b, len) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [f(a[0] + dx / d * len), f(a[1] + dy / d * len)]; };
      const id = 'tpc' + i, w1 = Math.max(1, s);
      /* an edge: its shadow on the lower-left side, a bright line, a fainter second line on the other side (the
         facet's thickness) */
      const edge = (a, b) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        let nx = -dy / d, ny = dx / d;
        if (ny - nx < 0) { nx = -nx; ny = -ny; }
        const o = (p, k) => [f(p[0] + nx * k), f(p[1] + ny * k)];
        return { sh: seg(o(a, 1.6 * s), o(b, 1.6 * s)), hi: seg(a, b), hi2: seg(o(a, -3.2 * s), o(b, -3.2 * s)) };
      };
      const es = [edge(T, R), edge(R, L), edge(R, Q), edge(Q, B)];
      const sh = es.map((e) => e.sh).join(''), hi = es.map((e) => e.hi).join(''), hi2 = es.map((e) => e.hi2).join('');
      /* a red stroke that fades out along an edge from a spark */
      const red = (a, b, len, n) => {
        const e = along(a, b, len);
        return '<linearGradient id="' + id + 'r' + n + '" gradientUnits="userSpaceOnUse" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + e[0] + '" y2="' + e[1] + '"><stop offset="0" stop-color="#ff1d26"/><stop offset="1" stop-color="#ff1d26" stop-opacity="0"/></linearGradient>'
          + '<path d="' + seg(a, e) + '" stroke="url(#' + id + 'r' + n + ')" stroke-width="' + f(1.7 * w1) + '" stroke-linecap="round"/>';
      };
      const lin = (n, x1, y1, x2, y2, stops) => '<linearGradient id="' + id + n + '" gradientUnits="userSpaceOnUse" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '">'
        + stops.map((t) => '<stop offset="' + t[0] + '" stop-color="' + t[1] + '" stop-opacity="' + t[2] + '"/>').join('') + '</linearGradient>';
      const mid = [(T[0] + R[0]) / 2, (T[1] + R[1]) / 2];
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.innerHTML = '<defs>'
        /* the light falls from the top left: the head facet darkens toward the corner's edge */
        + lin('h', X(0), 0, mid[0], mid[1], [[0, '#fff', .5], [.7, '#fff', .08], [1, '#262a34', .06]])
        + lin('c', T[0], 0, X(W), f(yR), [[0, '#fff', .42], [1, '#fff', .16]])
        + lin('p', X(0), 0, R[0], 0, [[0, '#fff', .12], [1, '#262a34', .05]])
        + lin('s', R[0], 0, Q[0], 0, [[0, '#262a34', .07], [1, '#262a34', .02]])
        /* under the plate: its shadow, then a light band, then darker toward the foot */
        + lin('b', 0, yB, 0, H, [[0, '#262a34', .1], [Math.min(.99, 24 * s / (H - yB || 1)), '#fff', .35], [Math.min(.995, 90 * s / (H - yB || 1)), '#fff', .3], [1, '#262a34', .03]])
        + lin('k', X(0), 0, X(W), 0, [[0, '#fff', .12], [.6, '#fff', 0], [1, '#262a34', .06]])
        + '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="#ff1d26" stop-opacity=".75"/><stop offset=".35" stop-color="#ff1d26" stop-opacity=".22"/><stop offset="1" stop-color="#ff1d26" stop-opacity="0"/></radialGradient>'
        + '<filter id="' + id + 'f" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="' + f(Math.max(0.7, 1.1 * s)) + '"/></filter>'
        + '</defs>'
        + '<path d="' + poly([X(0), 0], T, R, L) + '" fill="url(#' + id + 'h)"/>'
        + '<path d="' + poly(T, C, E) + '" fill="url(#' + id + 'c)"/>'
        + '<path d="' + poly(L, R, Q, B) + '" fill="url(#' + id + 'p)"/>'
        + '<path d="' + poly(R, E, [E[0], Q[1]], Q) + '" fill="url(#' + id + 's)"/>'
        + '<rect x="0" y="' + f(yB) + '" width="' + W + '" height="' + f(H - yB) + '" fill="url(#' + id + 'b)"/>'
        + '<rect x="0" y="' + f(yB) + '" width="' + W + '" height="' + f(H - yB) + '" fill="url(#' + id + 'k)"/>'
        + '<path d="' + sh + '" fill="none" stroke="#4a505c" stroke-opacity=".34" stroke-width="' + f(1.6 * w1) + '" filter="url(#' + id + 'f)"/>'
        + '<path d="' + hi2 + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="' + f(1.1 * w1) + '" stroke-linecap="round"/>'
        + '<path d="' + hi + '" fill="none" stroke="#fff" stroke-opacity=".97" stroke-width="' + f(1.8 * w1) + '" stroke-linecap="round"/>'
        + red(R, T, 30 * s, 1) + red(R, L, 34 * s, 2) + red(R, Q, 28 * s, 3) + red(Q, R, 24 * s, 4) + red(Q, B, 30 * s, 5)
        + '<circle cx="' + R[0] + '" cy="' + R[1] + '" r="' + f(15 * s) + '" fill="url(#' + id + 'g)"/>'
        + '<circle cx="' + R[0] + '" cy="' + R[1] + '" r="' + f(1.8 * w1) + '" fill="#ff3940"/>'
        + '<circle cx="' + Q[0] + '" cy="' + Q[1] + '" r="' + f(24 * s) + '" fill="url(#' + id + 'g)" opacity=".6"/>';
    };
    /* the rows (head, plate, line, points) as tall as the tallest of the three, so they line up; not on phones,
       where one card shows at a time */
    const wide = matchMedia('(min-width: 641px)');
    const level = () => ['.tp-pc__head', '.tp-pc__lead', '.tp-pc__sub', '.tp-pc__pts'].forEach((sel) => {
      const els = cards.map((c) => $(sel, c)).filter(Boolean);
      els.forEach((e) => { e.style.minHeight = ''; });
      if (!wide.matches) return;
      const h = Math.max(...els.map((e) => e.getBoundingClientRect().height));
      els.forEach((e) => { e.style.minHeight = h + 'px'; });
    });
    const all = () => { level(); cards.forEach(draw); };
    window.tqCutCards = all;
    all();
    if ('ResizeObserver' in window) {
      let q = 0;
      const ro = new ResizeObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; all(); }); });
      cards.forEach((c) => ro.observe(c));
    }
  }

  /* ---- /programs/ on phones: the three program cards swipe sideways -------------------------
   * The row is a native scroller with snap points (partner.css); this only keeps the dots under it
   * in step with the card in the middle and lets a dot bring its card in. */
  function startProgSwiper() {
    const rail = $('[data-progs]'), dots = $$('[data-progdots] button');
    if (!rail || !dots.length) return;
    const cards = [...rail.children];
    const mid = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
    let raf = 0;
    const sync = () => {
      raf = 0;
      const c = mid(rail);
      let on = 0, best = Infinity;
      cards.forEach((card, i) => { const d = Math.abs(mid(card) - c); if (d < best) { best = d; on = i; } });
      dots.forEach((b, i) => { if (i === on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    };
    rail.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });
    dots.forEach((b, i) => b.addEventListener('click', () => {
      /* scrollTo, not scrollBy: a relative scroll stops at every card on the way */
      rail.scrollTo({ left: rail.scrollLeft + mid(cards[i]) - mid(rail), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }));
  }

  /* ---- /marketing-tools/: promo materials, a slab of cut glass (Marketing_Materials_Cut_Glass_2) ------------
   * Desktop: the design's five curves cut the 1000x460 slab into six pieces (clip-paths in % of the slab, the lines
   * in an SVG of the same box). Under 1024px the formats stack as bands and the cuts are waves at the bands' edges,
   * measured again whenever the slab changes size. Pointing at a piece (or tapping it) lights it and its format;
   * the last one stays lit. */
  function startCutGlass() {
    const root = $('[data-cut]');
    if (!root) return;
    const panel = $('.tp-cut__panel', root), pieces = $$('[data-cut-p]', root), items = $$('[data-cut-i]', root);
    const svg = $('.tp-cut__lines', root), rect = $('rect', svg), lines = $$('[data-cut-line]', svg);
    const stacked = matchMedia('(max-width: 1023px)');
    const ss = (t) => t * t * (3 - 2 * t);
    const W0 = 1000, H0 = 460, N = 28;
    const DESIGN = [
      (x) => 70 + 100 * Math.pow(x / W0, 1.25),
      (x) => 200 + 10 * Math.sin(Math.PI * x / W0) - 22 * (x / W0),
      (x) => 345 - 155 * ss(x / W0),
      (x) => 346 - 36 * Math.pow(x / W0, 2),
      (x) => { const u = x / W0; return u < 0.4 ? 440 - 56 * ss(u / 0.4) : u < 0.55 ? 384 : 384 + 58 * ss((u - 0.55) / 0.45); },
    ];
    /* the waves between stacked bands: around each band's lower edge, a different gentle shape each time */
    const WAVE = [
      (u, a) => -a + 2 * a * Math.pow(u, 1.25),
      (u, a) => a * Math.sin(Math.PI * u) - a * 0.6 * u,
      (u, a) => a - 2 * a * ss(u),
      (u, a) => -a * 0.4 + a * 1.2 * u * u,
      (u, a) => a * 0.8 * Math.sin(2 * Math.PI * u),
    ];
    const draw = () => {
      let W, H, cuts;
      if (stacked.matches) {
        W = panel.clientWidth; H = panel.clientHeight;
        if (!W || !H) return;
        const amp = Math.min(14, W / 40);
        cuts = items.slice(0, -1).map((it, i) => { const y = it.offsetTop + it.offsetHeight; return (x) => y + WAVE[i % WAVE.length](x / W, amp); });
      } else { W = W0; H = H0; cuts = DESIGN; }
      const xs = Array.from({ length: N + 1 }, (_, i) => i / N * W);
      const bounds = [() => 0, ...cuts, () => H];
      pieces.forEach((p, i) => {
        const a = bounds[i], b = bounds[i + 1];
        /* stacked, a piece is only as tall as its band (its glass filter then works on the band alone) */
        let y0 = 0, hh = H;
        if (stacked.matches) { y0 = Math.floor(Math.min(...xs.map(a))); hh = Math.ceil(Math.max(...xs.map(b))) - y0; }
        p.style.top = stacked.matches ? y0 + 'px' : ''; p.style.height = stacked.matches ? hh + 'px' : ''; p.style.bottom = stacked.matches ? 'auto' : '';
        const P = (x, y) => (x / W * 100).toFixed(2) + '% ' + ((y - y0) / hh * 100).toFixed(2) + '%';
        p.style.clipPath = 'polygon(' + xs.map((x) => P(x, a(x))).concat(xs.slice().reverse().map((x) => P(x, b(x)))).join(',') + ')';
      });
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      rect.setAttribute('width', W - 2); rect.setAttribute('height', H - 2);
      lines.forEach((g, i) => {
        const f = cuts[i], d = 'M' + xs.map((x) => x.toFixed(1) + ' ' + f(x).toFixed(1)).join(' L');
        $$('path', g).forEach((p) => p.setAttribute('d', d));
      });
      root.classList.add('is-cut');
    };
    const light = (i) => {
      pieces.forEach((p, k) => p.classList.toggle('is-on', k === i));
      items.forEach((it, k) => it.classList.toggle('is-on', k === i));
    };
    pieces.forEach((p, i) => {
      p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') light(i); });
      p.addEventListener('click', () => light(i));
    });
    draw();
    if ('ResizeObserver' in window) new ResizeObserver(() => draw()).observe(panel);
    else addEventListener('resize', draw);
    stacked.addEventListener('change', draw);
  }

  /* ---- phone: country code -------------------------------------------------------------
   * A native <select> lies invisibly over the flag and the code, so every phone gets its own picker.
   * The list: every country with its calling code (from libphonenumber-js), named in the page
   * language (Intl.DisplayNames) and sorted by that name; the flag of the chosen one is loaded from
   * assets/flags (flag-icons), and the number field's placeholder becomes that country's example
   * mobile number as it reads after the code (libphonenumber-js examples: "50 123 4567" for +971,
   * "201 555 0123" for +1). The form sends the choice as phone_code, e.g. "DE +49".
   * DIAL: ISO|calling code|example;… — regenerate both lists from libphonenumber-js if they change. */
  const DIAL = 'AD|376|312 345;AE|971|50 123 4567;AF|93|70 123 4567;AG|1|268 464 1234;AI|1|264 235 1234;AL|355|67 212 3456;AM|374|77 123456;AO|244|923 123 456;AR|54|9 11 2345 6789;AS|1|684 733 1234;AT|43|664 123456;AU|61|412 345 678;AW|297|560 1234;AX|358|41 2345678;AZ|994|40 123 45 67;BA|387|61 123 456;BB|1|246 250 1234;BD|880|1812 345678;BE|32|450 00 12 34;BF|226|70 12 34 56;BG|359|43 012 345;BH|973|3600 1234;BI|257|79 56 12 34;BJ|229|01 95 12 34 56;BL|590|690 00 12 34;BM|1|441 370 1234;BN|673|712 3456;BO|591|71234567;BQ|599|318 1234;BR|55|11 96123 4567;BS|1|242 359 1234;BT|975|17 12 34 56;BW|267|71 123 456;BY|375|29 491 19 11;BZ|501|622 1234;CA|1|506 234 5678;CC|61|412 345 678;CD|243|991 234 567;CF|236|70 01 23 45;CG|242|06 123 4567;CH|41|78 123 45 67;CI|225|01 23 45 6789;CK|682|71 234;CL|56|2 2123 4567;CM|237|6 71 23 45 67;CN|86|131 2345 6789;CO|57|321 1234567;CR|506|8312 3456;CU|53|5 1234567;CV|238|991 12 34;CW|599|9 518 1234;CX|61|412 345 678;CY|357|96 123456;CZ|420|601 123 456;DE|49|1512 3456789;DJ|253|77 83 10 01;DK|45|34 41 23 45;DM|1|767 225 1234;DO|1|809 234 5678;DZ|213|551 23 45 67;EC|593|99 123 4567;EE|372|5123 4567;EG|20|10 01234567;EH|212|6 50 12 34 56;ER|291|7 123 456;ES|34|612 34 56 78;ET|251|91 123 4567;FI|358|41 2345678;FJ|679|701 2345;FK|500|51234;FM|691|350 1234;FO|298|21 12 34;FR|33|6 12 34 56 78;GA|241|06 03 12 34;GB|44|7400 123456;GD|1|473 403 1234;GE|995|555 12 34 56;GF|594|694 20 12 34;GG|44|7781 123456;GH|233|23 123 4567;GI|350|57123456;GL|299|22 12 34;GM|220|301 2345;GN|224|601 12 34 56;GP|590|690 00 12 34;GQ|240|222 123 456;GR|30|691 234 5678;GT|502|5123 4567;GU|1|671 300 1234;GW|245|955 012 345;GY|592|609 1234;HK|852|5123 4567;HN|504|9123 4567;HR|385|92 123 4567;HT|509|34 10 1234;HU|36|20 123 4567;ID|62|812 345 678;IE|353|85 012 3456;IL|972|50 234 5678;IM|44|7924 123456;IN|91|81234 56789;IO|246|380 1234;IQ|964|791 234 5678;IR|98|912 345 6789;IS|354|611 1234;IT|39|312 345 6789;JE|44|7797 712345;JM|1|876 210 1234;JO|962|7 9012 3456;JP|81|90 1234 5678;KE|254|712 123456;KG|996|700 123 456;KH|855|91 234 567;KI|686|72001234;KM|269|321 23 45;KN|1|869 765 2917;KP|850|192 123 4567;KR|82|10 2000 0000;KW|965|500 12345;KY|1|345 323 1234;KZ|7|771 000 9998;LA|856|20 23 123 456;LB|961|71 123 456;LC|1|758 284 5678;LI|423|660 234 567;LK|94|71 234 5678;LR|231|77 012 3456;LS|266|5012 3456;LT|370|612 34567;LU|352|628 123 456;LV|371|21 234 567;LY|218|91 2345678;MA|212|6 50 12 34 56;MC|377|6 12 34 56 78;MD|373|621 12 345;ME|382|60 123 456;MF|590|690 00 12 34;MG|261|32 12 345 67;MH|692|235 1234;MK|389|72 345 678;ML|223|65 01 23 45;MM|95|9 212 3456;MN|976|8812 3456;MO|853|6612 3456;MP|1|670 234 5678;MQ|596|696 20 12 34;MR|222|22 12 34 56;MS|1|664 492 3456;MT|356|9696 1234;MU|230|5251 2345;MV|960|771 2345;MW|265|991 23 45 67;MX|52|222 123 4567;MY|60|12 345 6789;MZ|258|82 123 4567;NA|264|81 123 4567;NC|687|75 12 34;NE|227|93 12 34 56;NF|672|3 81234;NG|234|802 123 4567;NI|505|8123 4567;NL|31|6 12345678;NO|47|40 61 23 45;NP|977|984 1234567;NR|674|555 1234;NU|683|888 4012;NZ|64|21 123 4567;OM|968|9212 3456;PA|507|6123 4567;PE|51|912 345 678;PF|689|87 12 34 56;PG|675|7012 3456;PH|63|905 123 4567;PK|92|301 2345678;PL|48|512 345 678;PM|508|55 12 34;PR|1|787 234 5678;PS|970|599 123 456;PT|351|912 345 678;PW|680|620 1234;PY|595|961 456789;QA|974|3312 3456;RE|262|692 12 34 56;RO|40|712 034 567;RS|381|60 1234567;RU|7|912 345 67 89;RW|250|720 123 456;SA|966|51 234 5678;SB|677|74 21234;SC|248|2 510 123;SD|249|91 123 1234;SE|46|70 123 45 67;SG|65|8123 4567;SH|290|51234;SI|386|31 234 567;SJ|47|41 23 45 67;SK|421|912 123 456;SL|232|25 123456;SM|378|66 66 12 12;SN|221|70 123 45 67;SO|252|7 1123456;SR|597|741 2345;SS|211|977 123 456;ST|239|981 2345;SV|503|7012 3456;SX|1|721 520 5678;SY|963|944 567 890;SZ|268|7612 3456;TC|1|649 231 1234;TD|235|63 01 23 45;TG|228|90 11 23 45;TH|66|81 234 5678;TJ|992|91 712 3456;TK|690|7290;TL|670|7721 2345;TM|993|66 123456;TN|216|20 123 456;TO|676|771 5123;TR|90|501 234 56 78;TT|1|868 291 1234;TV|688|90 1234;TW|886|912 345 678;TZ|255|621 234 567;UA|380|50 123 4567;UG|256|712 345678;US|1|201 555 0123;UY|598|94 231 234;UZ|998|91 234 56 78;VA|39|312 345 6789;VC|1|784 430 1234;VE|58|412 1234567;VG|1|284 300 1234;VI|1|340 642 1234;VN|84|912 345 678;VU|678|591 2345;WF|681|82 12 34;WS|685|72 12345;XK|383|43 201 234;YE|967|712 345 678;YT|262|639 01 23 45;ZA|27|71 123 4567;ZM|260|95 5123456;ZW|263|71 234 5678';
  function startDial() {
    const box = $('[data-dial]');
    if (!box) return;
    const sel = $('select', box), flag = $('[data-dial-flag]', box), code = $('[data-dial-code]', box);
    const num = $('input[name="phone"]', box.closest('form') || document);
    const lang = document.documentElement.lang || 'en';
    let names = null;
    try { names = new Intl.DisplayNames([lang, 'en'], { type: 'region' }); } catch (e) {}
    let cmp = (a, b) => a.localeCompare(b);
    try { cmp = new Intl.Collator(lang).compare; } catch (e) {}
    const example = {};
    const list = DIAL.split(';').map((x) => {
      const [iso, dial, ex] = x.split('|');
      example[iso] = ex;
      let name = iso;
      try { name = (names && names.of(iso)) || iso; } catch (e) {}
      return { iso, dial, name };
    }).sort((a, b) => cmp(a.name, b.name));
    const cur = (sel.value || 'AE +971').split(' ')[0];
    const frag = document.createDocumentFragment();
    for (const c of list) {
      const o = document.createElement('option');
      o.value = c.iso + ' +' + c.dial;
      o.textContent = c.name + ' (\u200e+' + c.dial + ')';
      if (c.iso === cur) o.selected = true;
      frag.appendChild(o);
    }
    sel.textContent = '';
    sel.appendChild(frag);
    const base = flag.getAttribute('src').replace(/[a-z]{2}\.svg(\?.*)?$/, '');
    const show = () => {
      const [iso, dial] = sel.value.split(' ');
      const src = base + iso.toLowerCase() + '.svg';
      if (!flag.getAttribute('src').startsWith(src)) flag.src = src;   /* the page's own flag (with ?v=) is not fetched twice */
      code.textContent = dial;
      if (num && example[iso]) num.placeholder = example[iso];
    };
    sel.addEventListener('change', show);
    show();
  }

  /* ---- reviews: a marquee you can grab ---------------------------------------------------------
   * The track holds the cards twice; x wraps at one set's width, so it never runs out. It drifts left at
   * the old CSS marquee's pace (one set per 64 s). A drag (mouse) or a sideways swipe (touch) moves it
   * 1:1 either way, and on release the flick carries on and eases back into the drift. A sideways
   * trackpad swipe moves it too. A mouse resting on it stops the drift, as before. Vertical swipes still
   * scroll the page (touch-action: pan-y). Without JS the CSS marquee runs; with reduced motion the row
   * is a plain scroller and this stays off. */
  function startReviewsDrag() {
    const view = $('[data-rep-viewport]'), track = $('[data-rep-track]');
    if (!view || !track || !track.firstElementChild || reducedMotion()) return;
    const SECS = 64, MAXV = 4000;
    let W = track.firstElementChild.offsetWidth;
    let x = 0, v = -W / SECS, last = 0, raf = 0, on = false, hover = false, drag = null, swallow = false;
    const wrap = () => { if (W > 0) { x %= W; if (x > 0) x -= W; } };
    const put = () => { track.style.transform = 'translate3d(' + x.toFixed(2) + 'px, 0, 0)'; };
    track.style.animation = 'none';
    view.setAttribute('data-rep-live', '');
    put();
    const frame = (t) => {
      raf = 0;
      if (!on) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (!drag || !drag.live) {
        const target = hover || drag ? 0 : -W / SECS;
        v += (target - v) * (1 - Math.exp(-dt * 2.2));
        x += v * dt; wrap(); put();
      }
      raf = requestAnimationFrame(frame);
    };
    whileVisible(view, '100px 0px', () => { if (!on) { on = true; last = 0; raf = requestAnimationFrame(frame); } },
      () => { on = false; cancelAnimationFrame(raf); raf = 0; });

    view.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
    view.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hover = false; });
    view.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const mouse = e.pointerType === 'mouse';
      drag = { id: e.pointerId, px: e.clientX, py: e.clientY, t: performance.now(), vx: 0, moved: 0, live: mouse };
      if (mouse) { e.preventDefault(); view.setPointerCapture(e.pointerId); view.classList.add('is-drag'); }
    });
    view.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.px, dy = e.clientY - drag.py;
      if (!drag.live) {                                   /* touch: only a sideways swipe takes the row */
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
        drag.live = true;
        try { view.setPointerCapture(e.pointerId); } catch (err) {}
        view.classList.add('is-drag');
      }
      const now = performance.now(), dt = Math.max(8, now - drag.t) / 1000;
      drag.vx = drag.vx * 0.5 + (dx / dt) * 0.5;
      drag.moved += Math.abs(dx);
      drag.px = e.clientX; drag.py = e.clientY; drag.t = now;
      x += dx; wrap(); put();
    });
    const end = (e, cancelled) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.live && !cancelled) {
        /* the flick's speed, unless the pointer stood still before letting go */
        v = performance.now() - drag.t > 90 ? 0 : Math.max(-MAXV, Math.min(MAXV, drag.vx));
      }
      swallow = drag.moved > 6;
      drag = null;
      view.classList.remove('is-drag');
    };
    view.addEventListener('pointerup', (e) => end(e, false));
    view.addEventListener('pointercancel', (e) => end(e, true));
    view.addEventListener('click', (e) => { if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false; } }, true);
    track.addEventListener('dragstart', (e) => e.preventDefault());
    view.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;    /* vertical wheel: the page scrolls */
      e.preventDefault();
      x -= e.deltaX * (e.deltaMode === 1 ? 16 : 1); wrap(); put();
      v = 0;
    }, { passive: false });
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { W = track.firstElementChild.offsetWidth; wrap(); put(); }, 120); });
  }

  /* ---- programs/: Who it's for (Who_Its_For_Drum), then Why partners choose -------------------------------
   * The card: the five kinds of partner as chips and one sentence whose halves roll like a drum to the chosen
   * one. It rolls on every 3.3 s while on screen until a chip or the sentence is clicked (a click on the sentence
   * moves on one). A sentence too long for the card (a long language) steps its size down to fit.
   * The perks section below it: its six cards are dealt in a fan once it is well in view; with reduced motion they
   * simply stand, and on phones (<900px) the CSS lays them out in a grid. */
  function startWhoFlow() {
    const block = document.getElementById('pf-who'), fan = document.getElementById('pf-fan');
    if (!block || !fan) return;
    const cards = $$('[data-pf-perk]', fan), N = cards.length;

    /* the drum */
    const chips = $$('[data-dr-chip]', block), sent = $('[data-dr-sent]', block);
    const verb = $('[data-dr-verb]', block), goal = $('[data-dr-goal]', block), num = $('[data-dr-num]', block);
    const gains = $$('[data-dr-gain]', block), sr = $('[data-dr-sr]', block);
    const I = ($('[data-dr-i]', block) || {}).textContent || '', SO = ($('[data-dr-so]', block) || {}).textContent || '';
    let cur = 0, user = false, iv = 0;
    const roll = (i) => {
      cur = i;
      chips.forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
      verb.style.transform = goal.style.transform = 'translateY(calc(var(--drl) * ' + (-i) + '))';
      if (num) num.textContent = ('0' + (i + 1)).slice(-2);
      gains.forEach((g, k) => { g.hidden = k !== i; });
      if (sr) sr.textContent = I + ' ' + verb.children[i].textContent + ' — ' + SO + ' ' + goal.children[i].textContent;
    };
    chips.forEach((c, i) => c.addEventListener('click', () => { user = true; roll(i); }));
    if (sent) sent.addEventListener('click', () => { user = true; roll((cur + 1) % chips.length); });
    if (!reducedMotion()) {
      whileVisible(block, '0px',
        () => { if (!iv) iv = setInterval(() => { if (!user) roll((cur + 1) % chips.length); }, 3300); },
        () => { clearInterval(iv); iv = 0; });
    }
    const fitDrum = () => {
      if (!sent) return;
      sent.style.removeProperty('--drf');
      for (let n = 0; n < 3; n++) {                   /* measure again: kerning doesn't scale quite linearly */
        const room = sent.clientWidth, need = Math.max(...$$('.pf-dr__line', sent).map((l) => l.scrollWidth));
        if (!room || need <= room) return;
        sent.style.setProperty('--drf', (parseFloat(getComputedStyle(sent).fontSize) * room / need * 0.98).toFixed(1) + 'px');
      }
    };

    const mq = matchMedia('(max-width: 899px)');
    /* the fan: six cards on an arc, dealt one after another. B is the line the cards stand on (from the
       fan's bottom): the design's 16% + 15px, raised 72px, but never so high that the cards come
       closer than G to the heading */
    let dealt = null, K = 1, B = 0;
    const place = (on) => cards.forEach((c, i) => {
      const d = i - (N - 1) / 2, z = mq.matches ? 1 : K;
      c.style.transitionDelay = (on ? i * 70 : 0) + 'ms';
      c.style.opacity = on ? 1 : 0;
      /* in the phone grid the CSS sizes the cards */
      c.style.width = mq.matches ? '' : (220 * z) + 'px'; c.style.height = mq.matches ? '' : (340 * z) + 'px'; c.style.marginLeft = mq.matches ? '' : (-110 * z) + 'px';
      c.style.bottom = mq.matches ? '' : B + 'px';
      c.firstElementChild.style.zoom = mq.matches ? '' : z;
      c.style.transform = on
        ? 'translate3d(' + Math.round(d * 192 * K) + 'px,' + Math.round(d * d * 11 * K) + 'px,0) rotate(' + (d * 8) + 'deg)'
        : 'translate3d(0,60px,0) scale(0.86)';
    });
    const deal = (on) => { if (dealt === on) return; dealt = on; place(on); };
    const sizeCards = () => {
      const fh = fan.clientHeight || innerHeight * 0.5;
      const G = Math.max(36, Math.min(72, innerHeight * 0.065));
      K = Math.max(0.45, Math.min(1.15, fh * 0.74 / 340, innerWidth * 0.84 / (192 * 5 + 320)));
      B = Math.min(fh * 0.16 + 15 + 72, Math.max(fh * 0.16 + 15, fh - G - 340 * K));
      if (dealt != null) place(dealt);
    };
    const all = () => { fitDrum(); sizeCards(); };
    addEventListener('resize', all);
    if (mq.addEventListener) mq.addEventListener('change', all);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitDrum);
    roll(0);
    deal(false);
    all();
    if (mq.matches || reducedMotion() || !('IntersectionObserver' in window)) deal(true);
    else new IntersectionObserver((en, ob) => { if (en.some((e) => e.isIntersecting)) { deal(true); ob.disconnect(); } }, { threshold: 0.35 }).observe(fan);
  }

  function startCta3d() {
    $$('[data-c3d]').forEach((el) => {
      const set = (k, v) => el.style.setProperty(k, v);
      const rest = () => { set('--ch', '0'); set('--ctx', '0px'); set('--cty', '0px'); set('--cd', '0'); };
      el.addEventListener('pointerenter', () => set('--ch', '1'));
      el.addEventListener('pointerleave', rest);
      el.addEventListener('pointermove', (e) => {
        const b = el.getBoundingClientRect();
        set('--ctx', (((e.clientX - b.left) / b.width - 0.5) * 10).toFixed(1) + 'px');
        set('--cty', (((e.clientY - b.top) / b.height - 0.5) * 6).toFixed(1) + 'px');
      });
      el.addEventListener('pointerdown', () => { set('--ch', '1'); set('--cd', '1'); });
      el.addEventListener('pointerup', () => set('--cd', '0'));
      el.addEventListener('pointercancel', rest);
      el.addEventListener('focus', () => { if (el.matches(':focus-visible')) set('--ch', '1'); });
      el.addEventListener('blur', rest);
    });
  }

  startFanMenu();
  startFab();
  startToc();
  startStickyHead();
  startDock();
  startIframeFit();
  startFanTap();
  startEmbeds();
  startAnimationGate();
  startFlip();
  startHowLine();
  startStars();
  startCalculator();
  startDial();
  startForm();
  startFaq();
  startCta3d();
  startWhoFlow();
  startToasts();
  startProgSwiper();
  startProgCards();
  startFitWide();
  startLiveDash();
  startSteppers();
  startGlass();
  startReviewsDrag();
  startTwoLine();
  startLang();
  startCutGlass();
})();
