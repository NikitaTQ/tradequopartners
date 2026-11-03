/* Commission plan calculator (commission-plan/): active clients × lots per client × the
 * rate per lot of the tier those clients put you in. Tiers as published on the landing FAQ:
 * Starter 0–50 clients $5.00, Gold 51–200 $7.50, Elite 200+ $10.00. */
(() => {
  const box = document.querySelector('[data-plan]');
  if (!box) return;
  const $ = (sel) => box.querySelector(sel);
  const TIERS = [
    { name: 'Starter', rate: 5, upTo: 50 },
    { name: 'Gold', rate: 7.5, upTo: 200 },
    { name: 'Elite', rate: 10, upTo: Infinity },
  ];
  const LIMITS = { clients: [1, 400], lots: [1, 100] };
  const state = { clients: 100, lots: 10 };

  let numLocale = 'en-US';
  try { numLocale = Intl.NumberFormat.supportedLocalesOf([document.documentElement.lang + '-u-nu-latn'])[0] || 'en-US'; } catch (e) {}
  const count = (n) => Math.round(n).toLocaleString(numLocale);            /* lots, clients: local style */
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');          /* amounts stay en-US everywhere */
  const rate = (r) => '$' + r.toFixed(2);

  const els = {
    total: $('[data-plan-total]'), day: $('[data-plan-day]'), year: $('[data-plan-year]'), volume: $('[data-plan-volume]'),
    tier: $('[data-plan-tier]'), rate: $('[data-plan-rate]'), bar: $('[data-plan-bar]'), next: $('[data-plan-next]'),
  };
  const segs = [...box.querySelectorAll('[data-plan-tier-seg]')];
  const inputs = {}, ranges = {};
  box.querySelectorAll('[data-plan-input]').forEach((el) => { inputs[el.dataset.planInput] = el; });
  box.querySelectorAll('[data-plan-range]').forEach((el) => { ranges[el.dataset.planRange] = el; });

  /* the monthly total counts to its new value */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown = null, raf = 0;
  const tween = (to) => {
    if (shown == null || reduce) { shown = to; els.total.textContent = money(to); return; }
    const from = shown, t0 = performance.now(), DUR = 600;
    cancelAnimationFrame(raf);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
      shown = from + (to - from) * e;
      els.total.textContent = money(shown);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const render = () => {
    const { clients, lots } = state;
    const t = TIERS.findIndex((x) => clients <= x.upTo);
    const tier = TIERS[t];
    const monthly = clients * lots * tier.rate;
    tween(monthly);
    els.day.textContent = money(monthly / 30);
    els.year.textContent = money(monthly * 12);
    els.volume.textContent = count(clients * lots);
    els.tier.textContent = tier.name;
    els.rate.textContent = rate(tier.rate);
    segs.forEach((s, i) => (i === t ? s.setAttribute('aria-current', 'true') : s.removeAttribute('aria-current')));
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
  for (const key of Object.keys(LIMITS)) {
    const input = inputs[key], range = ranges[key];
    if (range) range.addEventListener('input', () => {
      state[key] = clampTo(key, +range.value);
      if (input) input.value = String(state[key]);
      render();
    });
    if (input) {
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        if (isNaN(v)) return;
        state[key] = clampTo(key, v);
        if (range) range.value = String(state[key]);
        render();
      });
      input.addEventListener('blur', () => { input.value = String(state[key]); });
    }
  }
  render();
})();
