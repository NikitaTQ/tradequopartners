/* /for-influencers/: "Creators on platforms" (owner's design "Creator Platforms Scene", ported from its component).
 * Three pictures, one per platform; a tab plays the change: a flash and two shock rings from the planet, the new
 * picture opening out from the planet in a ring of its colour while the old one drifts off tinted and blurred, the
 * orbit drawn again in the new tint, the platform's icon and title coming in, a light across each creator's plate.
 * The section's data-pal follows, so the colours flowing in above and out below glide to the new palette
 * (influencers.css .inf-orbit). A comet runs the orbit while the block is on screen (paused off it). Reduced motion:
 * a plain cross-fade and no comet. */
(function () {
  'use strict';
  const sec = document.querySelector('[data-orbit]');
  if (!sec) return;
  const r = sec.querySelector('[data-orbit-root]');
  const tabs = [...sec.querySelectorAll('[data-tab]')];
  const NAMES = ['Instagram', 'Telegram', 'TikTok'];
  const TINT = ['#E08AA0', '#8EB2DC', '#86C4C6'];
  const OUT_FILTER = [
    'hue-rotate(-150deg) saturate(1.25) brightness(1.15) blur(4px)',
    'hue-rotate(150deg) saturate(1.25) brightness(1.15) blur(4px)',
    'saturate(.55) brightness(.5) contrast(1.2) blur(4px)',
  ];
  const HOLE = 'radial-gradient(ellipse 25% 27% at 49.9% 16%,transparent 72%,#000 100%)';
  const REVEAL = 'radial-gradient(circle at 47.91% 67.64%,#000 calc(var(--r) - 240px),transparent var(--r))';
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const F = (n) => r.querySelector('[data-fx="' + n + '"]');
  const G = (i) => r.querySelector('[data-group="' + i + '"]');
  const L = (g, n) => g.querySelector('[data-l="' + n + '"]');
  const mask = (el, v) => { el.style.webkitMaskImage = v; el.style.maskImage = v; };
  let active = 0, busy = false;

  /* the comet: a light and its trail running the orbit (9 s a lap), only while the block is on screen */
  let amb = [];
  const startComet = () => {
    if (amb.length || still()) return;
    const o = { duration: 9000, iterations: Infinity, easing: 'linear' };
    amb = [
      ...[...r.querySelectorAll('[data-amb="trail"]')].map((el) => el.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -1000 }], o)),
      ...[...r.querySelectorAll('[data-amb="head"]')].map((el) => el.animate([{ strokeDashoffset: -114 }, { strokeDashoffset: -1114 }], o)),
    ];
  };
  const pauseComet = () => amb.forEach((a) => a.pause());
  const playComet = () => (amb.length ? amb.forEach((a) => a.play()) : startComet());
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? playComet() : pauseComet())), { rootMargin: '100px 0px' }).observe(r);
  } else startComet();

  const select = (i) => {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
    r.setAttribute('aria-label', (r.dataset.aria || 'Creators on') + ' ' + NAMES[i]);
    sec.dataset.pal = String(i);
  };

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
    const cx = rect.width * 0.4791, cy = rect.height * 0.6764;
    const R = Math.max(...[[0, 0], [rect.width, 0], [0, rect.height], [rect.width, rect.height]].map(([x, y]) => Math.hypot(x - cx, y - cy))) + 260;
    const tint = TINT[ti];
    mask(to, REVEAL);
    to.classList.add('is-playing');
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
    A(L(to, 'icon'), [{ opacity: 0, filter: 'blur(20px) brightness(3)' }, { opacity: 1, filter: 'blur(0px) brightness(1)' }], { duration: 1400, delay: 750, easing: 'cubic-bezier(.3,0,.2,1)' });
    A(L(to, 'title'), [
      { opacity: 1, clipPath: 'inset(24.2% 64.5% 68.8% 35.5%)', filter: 'brightness(2.6)' },
      { opacity: 1, clipPath: 'inset(24.2% 35.7% 68.8% 35.5%)', filter: 'brightness(1)' },
    ], { duration: 1000, delay: 1000, easing: wipe });
    A(F('streak'), [{ left: '35.5%', opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { left: '64.3%', opacity: 0 }], { duration: 1000, delay: 1000, easing: wipe });
    A(F('draw'), [{ strokeDashoffset: 1000, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.75 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 2100, delay: 250, easing: 'cubic-bezier(.5,0,.3,1)' });
    A(F('ftrail'), [{ strokeDashoffset: 0, opacity: 0.8 }, { opacity: 0.8, offset: 0.9 }, { strokeDashoffset: -1000, opacity: 0 }], { duration: 1700, delay: 200, easing: 'cubic-bezier(.4,0,.3,1)' });
    A(F('fhead'), [{ strokeDashoffset: -214, opacity: 1 }, { opacity: 1, offset: 0.9 }, { strokeDashoffset: -1214, opacity: 0 }], { duration: 1700, delay: 200, easing: 'cubic-bezier(.4,0,.3,1)' });
    r.querySelectorAll('[data-sheen]').forEach((el, i) =>
      A(el, [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 800, delay: 1500 + i * 110, easing: 'cubic-bezier(.5,0,.3,1)' }));

    await Promise.all(anims.map((a) => a.finished.catch(() => {})));
    from.style.visibility = 'hidden';
    mask(to, 'none'); mask(bg, 'none');
    to.classList.remove('is-playing');
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
