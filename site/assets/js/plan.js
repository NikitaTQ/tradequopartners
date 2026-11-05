/* Commission plan calculator (commission-plan/): active clients × lots per client × one rate
 * per lot — $7.50, the rate the landing's calculator has used since the original design. Change
 * RATE here (and the "$7.50" in tools/i18n/commission.html and the landing's inv.rebateCalc) if
 * the published rate changes. */
(() => {
  const box = document.querySelector('[data-plan]');
  if (!box) return;
  const $ = (sel, root = box) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const RATE = 7.5;
  /* typed values are practically unlimited; the sliders cover the usual range on a square-root
     scale (fine steps at the low end, 2,000 clients / 1,000 lots at the far right) */
  const LIMITS = { clients: [1, 1000000], lots: [1, 100000] };
  const SLIDE = { clients: [1, 2000], lots: [1, 1000] };
  const toPos = (key, v) => { const [a, b] = SLIDE[key]; return Math.min(1, Math.sqrt(Math.max(0, (v - a) / (b - a)))); };
  const fromPos = (key, p) => { const [a, b] = SLIDE[key]; return a + (b - a) * p * p; };
  const state = { clients: 100, lots: 10 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let numLocale = 'en-US';
  try { numLocale = Intl.NumberFormat.supportedLocalesOf([document.documentElement.lang + '-u-nu-latn'])[0] || 'en-US'; } catch (e) {}
  const count = (n) => Math.round(n).toLocaleString(numLocale);            /* lots, clients: local style */
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');          /* amounts stay en-US everywhere */

  const els = {
    total: $('[data-plan-total]'), day: $('[data-plan-day]'), year: $('[data-plan-year]'), volume: $('[data-plan-volume]'),
    rate: $('[data-plan-rate]'), clients: $('[data-plan-clients]'), lots: $('[data-plan-lots]'),
  };
  const inputs = {}, ranges = {};
  $$('[data-plan-input]', box).forEach((el) => { inputs[el.dataset.planInput] = el; });
  $$('[data-plan-range]', box).forEach((el) => { ranges[el.dataset.planRange] = el; });
  if (els.rate) els.rate.textContent = '$' + RATE.toFixed(2);

  /* the monthly total counts to its new value */
  let shown = null, raf = 0;
  /* a very long total shrinks so it never leaves the sheet */
  const writeTotal = (v) => {
    els.total.textContent = money(v);
    const n = els.total.textContent.length;
    els.total.style.setProperty('--k', n > 8 ? (8 / n).toFixed(3) : '1');
  };
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

  const render = (instant) => {
    const { clients, lots } = state;
    const monthly = clients * lots * RATE;
    tween(monthly, instant);
    els.day.textContent = money(monthly / 30);
    els.year.textContent = money(monthly * 12);
    els.volume.textContent = count(clients * lots);
    els.clients.textContent = count(clients);
    if (els.lots) els.lots.textContent = count(lots);
    for (const key of Object.keys(ranges)) ranges[key].parentNode.style.setProperty('--p', (toPos(key, state[key]) * 100).toFixed(2) + '%');
  };

  const clampTo = (key, v) => Math.max(LIMITS[key][0], Math.min(LIMITS[key][1], Math.round(v)));
  const setValue = (key, v, instant, fromRange) => {
    state[key] = clampTo(key, v);
    if (inputs[key] && document.activeElement !== inputs[key]) inputs[key].value = String(state[key]);
    if (ranges[key] && !fromRange) ranges[key].value = String(Math.round(toPos(key, state[key]) * 1000));
    render(instant);
  };

  for (const key of Object.keys(LIMITS)) {
    const input = inputs[key], range = ranges[key];
    if (range) range.addEventListener('input', () => setValue(key, fromPos(key, +range.value / 1000), false, true));
    if (input) {
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        if (isNaN(v)) return;
        setValue(key, v);
      });
      input.addEventListener('blur', () => { input.value = String(state[key]); });
    }
  }

  render(true);

  /* ---- payout process: the pulse runs step to step while the section is on screen ---- */
  const flow = document.querySelector('[data-flow]');
  if (flow) {
    const fsteps = [...flow.querySelectorAll('[data-flow-step]')];
    const N = fsteps.length, MOVE = 850, STAY = 1300, HOLD = 2200;
    let k = -1, timer = 0, running = false;
    const mark = (on) => fsteps.forEach((s, j) => { s.classList.toggle('is-on', j === on); s.classList.toggle('is-done', on > j); });
    const tick = () => {
      k += 1;
      if (k >= N) {                                   /* rewind, then run again */
        flow.classList.add('is-reset');
        flow.style.setProperty('--p', 0);
        mark(-1);
        timer = setTimeout(() => { flow.classList.remove('is-reset'); k = -1; tick(); }, 650);
        return;
      }
      if (k === 0) { mark(0); timer = setTimeout(tick, STAY); return; }
      flow.style.setProperty('--p', k / (N - 1));
      fsteps[k - 1].classList.replace('is-on', 'is-done');
      timer = setTimeout(() => { mark(k); timer = setTimeout(tick, k === N - 1 ? HOLD : STAY); }, MOVE);
    };
    if (reduce) { mark(N - 1); flow.style.setProperty('--p', 1); }
    else {
      new IntersectionObserver((entries) => {
        const vis = entries[0].isIntersecting;
        if (vis && !running) { running = true; k = -1; flow.style.setProperty('--p', 0); mark(-1); timer = setTimeout(tick, 250); }
        if (!vis && running) { running = false; clearTimeout(timer); }
      }, { threshold: 0.35 }).observe(flow);
    }
  }
  const proofs = document.querySelector('.tp-proofs');
  if (proofs && !reduce && 'IntersectionObserver' in window) {
    proofs.classList.add('is-armed');
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { proofs.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(proofs);
  }
})();
