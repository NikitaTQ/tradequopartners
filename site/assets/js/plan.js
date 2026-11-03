/* Commission plan calculator (commission-plan/): active clients × lots per client × the
 * rate per lot of the tier those clients put you in. Tiers as published on the landing FAQ:
 * Starter 0–50 clients $5.00, Gold 51–200 $7.50, Elite 200+ $10.00 (Elite counted from 201).
 *
 * The tier switch under the sliders and the tier cards further down are buttons: they glide
 * the clients slider to a typical value for that tier (the cards first scroll up to here). */
(() => {
  const box = document.querySelector('[data-plan]');
  if (!box) return;
  const $ = (sel, root = box) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const TIERS = [
    { name: 'Starter', rate: 5, upTo: 50, pick: 25 },
    { name: 'Gold', rate: 7.5, upTo: 200, pick: 100 },
    { name: 'Elite', rate: 10, upTo: Infinity, pick: 260 },
  ];
  const LIMITS = { clients: [1, 400], lots: [1, 100] };
  const state = { clients: 100, lots: 10 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  let numLocale = 'en-US';
  try { numLocale = Intl.NumberFormat.supportedLocalesOf([document.documentElement.lang + '-u-nu-latn'])[0] || 'en-US'; } catch (e) {}
  const count = (n) => Math.round(n).toLocaleString(numLocale);            /* lots, clients: local style */
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');          /* amounts stay en-US everywhere */
  const rate = (r) => '$' + r.toFixed(2);

  const els = {
    total: $('[data-plan-total]'), day: $('[data-plan-day]'), year: $('[data-plan-year]'), volume: $('[data-plan-volume]'),
    tier: $('[data-plan-tier]'), rate: $('[data-plan-rate]'), clients: $('[data-plan-clients]'), bar: $('[data-plan-bar]'),
    next: $('[data-plan-next]'), stamp: $('[data-plan-stamp]'), stampTier: $('[data-plan-stamp-tier]'), strip: $('.tp-tiers'),
  };
  const steps = $$('[data-plan-step]', box);
  const switches = $$('.tp-tier[data-plan-goto]', box);
  const cards = $$('.tp-tiercard[data-plan-goto]');
  const inputs = {}, ranges = {};
  $$('[data-plan-input]', box).forEach((el) => { inputs[el.dataset.planInput] = el; });
  $$('[data-plan-range]', box).forEach((el) => { ranges[el.dataset.planRange] = el; });
  const tierOf = (clients) => TIERS.findIndex((x) => clients <= x.upTo);

  /* the monthly total counts to its new value (skipped while the slider glides: it moves every frame) */
  let shown = null, raf = 0;
  const writeTotal = (v) => { els.total.textContent = money(v); };
  const tween = (to, instant) => {
    cancelAnimationFrame(raf);
    if (shown == null || reduce || instant) { shown = to; writeTotal(to); return; }
    const from = shown, t0 = performance.now(), DUR = 600;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / DUR);
      shown = from + (to - from) * (1 - Math.pow(1 - p, 3));
      writeTotal(shown);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  let lastTier = -1;
  const render = (instant) => {
    const { clients, lots } = state;
    const t = tierOf(clients), tier = TIERS[t];
    const monthly = clients * lots * tier.rate;
    tween(monthly, instant);
    els.day.textContent = money(monthly / 30);
    els.year.textContent = money(monthly * 12);
    els.volume.textContent = count(clients * lots);
    els.clients.textContent = count(clients);
    if (t !== lastTier) {
      els.tier.textContent = tier.name;
      els.rate.textContent = rate(tier.rate);
      if (els.strip) els.strip.style.setProperty('--t', t);
      switches.forEach((b, i) => b.setAttribute('aria-pressed', String(i === t)));
      cards.forEach((c, i) => c.classList.toggle('is-current', i === t));
      steps.forEach((s, i) => { s.classList.toggle('is-reached', i <= t); s.classList.toggle('is-on', i === t); });
      if (els.stampTier) els.stampTier.textContent = tier.name.toUpperCase();
      if (els.stamp && lastTier !== -1 && !reduce) {
        els.stamp.classList.remove('is-stamped'); void els.stamp.getBoundingClientRect(); els.stamp.classList.add('is-stamped');
      }
      lastTier = t;
    }
    const next = TIERS[t + 1];
    if (next) {
      const from = t ? TIERS[t - 1].upTo : 0;
      els.bar.style.width = Math.max(4, ((clients - from) / (tier.upTo + 1 - from)) * 100) + '%';
      els.next.textContent = (els.next.dataset.next || '').replace('{tier}', next.name).replace('{n}', count(tier.upTo + 1));
    } else {
      els.bar.style.width = '100%';
      els.next.textContent = els.next.dataset.top || '';
    }
    for (const key of Object.keys(ranges)) {
      const [min, max] = LIMITS[key];
      ranges[key].parentNode.style.setProperty('--p', ((state[key] - min) / (max - min) * 100).toFixed(2) + '%');
    }
  };

  const clampTo = (key, v) => Math.max(LIMITS[key][0], Math.min(LIMITS[key][1], Math.round(v)));
  const setValue = (key, v, instant) => {
    state[key] = clampTo(key, v);
    if (inputs[key] && document.activeElement !== inputs[key]) inputs[key].value = String(state[key]);
    if (ranges[key]) ranges[key].value = String(state[key]);
    render(instant);
  };

  /* glide the clients slider to a value; the numbers follow frame by frame, then settle */
  let glide = 0;
  const glideTo = (target) => {
    cancelAnimationFrame(glide);
    const from = state.clients;
    if (reduce || from === target) { setValue('clients', target); return; }
    const t0 = performance.now(), DUR = Math.min(900, 420 + Math.abs(target - from) * 2.2);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / DUR);
      setValue('clients', from + (target - from) * easeInOut(p), true);
      if (p < 1) glide = requestAnimationFrame(step);
      else { shown = null; render(true); }
    };
    glide = requestAnimationFrame(step);
  };
  const goTier = (i) => {
    const t = TIERS[i];
    if (!t) return;
    const target = tierOf(state.clients) === i ? state.clients : t.pick;   /* already there: keep the user's number */
    glideTo(target);
  };

  for (const key of Object.keys(LIMITS)) {
    const input = inputs[key], range = ranges[key];
    if (range) range.addEventListener('input', () => { cancelAnimationFrame(glide); setValue(key, +range.value); });
    if (input) {
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        if (isNaN(v)) return;
        cancelAnimationFrame(glide);
        setValue(key, v);
      });
      input.addEventListener('blur', () => { input.value = String(state[key]); });
    }
  }

  switches.forEach((b) => b.addEventListener('click', () => goTier(+b.dataset.planGoto)));

  /* tier cards: scroll up to the calculator, then glide to that tier */
  cards.forEach((c) => c.addEventListener('click', (e) => {
    e.preventDefault();
    const i = +c.dataset.planGoto;
    const top = box.getBoundingClientRect().top + scrollY - Math.max(16, (innerHeight - box.offsetHeight) / 2);
    const distance = Math.abs(scrollY - top);
    if (reduce || distance < 40) { goTier(i); return; }
    let done = false;
    const go = () => { if (done) return; done = true; removeEventListener('scrollend', go); goTier(i); };
    addEventListener('scrollend', go, { once: true });
    setTimeout(go, Math.min(1100, 350 + distance / 3));   /* browsers without scrollend */
    scrollTo({ top, behavior: 'smooth' });
  }));

  render(true);
})();
