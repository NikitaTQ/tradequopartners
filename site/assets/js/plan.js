/* partner-terms/ (the commission page): the payout process. A red pulse runs step to step while the section is on
 * screen, then rewinds and runs again. (The calculator on this page is the landing's one, driven
 * by startCalculator in landing.js.) */
(() => {
  const flow = document.querySelector('[data-flow]');
  if (!flow) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  if (reduce) { mark(N - 1); flow.style.setProperty('--p', 1); return; }
  new IntersectionObserver((entries) => {
    const vis = entries[0].isIntersecting;
    if (vis && !running) { running = true; k = -1; flow.style.setProperty('--p', 0); mark(-1); timer = setTimeout(tick, 250); }
    if (!vis && running) { running = false; clearTimeout(timer); }
  }, { threshold: 0.35 }).observe(flow);
})();

/* The hero's earnings examples (TradeQuo_Earnings_Hero design). A card tilts toward the mouse with a
 * glare; a click, Enter or Space selects it and dims the others, again to clear. The candles on each
 * back card are drawn here (decorative). Under 1040px the row is a swiper (partner.css): here the cards
 * beside the middle one get --off (0 in the middle, 1 a card away) and --ox (the edge they shrink toward),
 * the dots follow, a dot brings its card in, a tap on a side card brings it in instead of selecting, and
 * moving to another card clears the choice. */
(() => {
  const cards = [...document.querySelectorAll('[data-earn-card]')];
  if (!cards.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SERIES = [52, 48, 55, 50, 44, 47, 41, 45, 52, 49, 57, 61, 58, 64, 60, 68, 72, 70];
  const n = SERIES.length, lo = 34, hi = 80, Y = (v) => (1 - (v - lo) / (hi - lo)) * 100;
  const candles = SERIES.map((c, i) => {
    const o = i ? SERIES[i - 1] : c - 3, top = Math.max(o, c), bot = Math.min(o, c), cl = c >= o ? '#0a0a0a' : '#e7131b';
    const wTop = top + 2.5 + (i % 3), wBot = bot - 2 - (i % 2) * 2, x = (i + 0.5) / n * 100, bw = 100 / n * 0.56;
    const wick = 'left:' + x + '%;top:' + Y(wTop) + '%;height:' + (Y(wBot) - Y(wTop)) + '%;width:1px;background:' + cl;
    const body = 'left:' + (x - bw / 2) + '%;top:' + Y(top) + '%;height:' + Math.max(1, Y(bot) - Y(top)) + '%;width:' + bw + '%;min-height:2px;border-radius:1px;background:' + cl;
    return '<i style="' + wick + '"></i><i style="' + body + '"></i>';
  }).join('');
  document.querySelectorAll('[data-earn-chart]').forEach((el) => { el.innerHTML = candles; });

  let sel = -1;
  const paint = () => cards.forEach((c, i) => {
    c.classList.toggle('is-sel', i === sel);
    c.classList.toggle('is-dim', sel >= 0 && i !== sel);
    c.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
  });
  const pick = (i) => { sel = sel === i ? -1 : i; paint(); };

  const grid = document.querySelector('[data-earn-grid]'), dots = [...document.querySelectorAll('[data-earn-dots] button')];
  const swipe = matchMedia('(max-width: 1039px)');
  const mid = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
  let on = 0, raf = 0;
  const sync = () => {
    raf = 0;
    if (!swipe.matches) { cards.forEach((c) => { c.style.removeProperty('--off'); c.style.removeProperty('--ox'); }); return; }
    const c0 = mid(grid), step = cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left || 1;
    let best = Infinity;
    cards.forEach((c, i) => {
      const d = mid(c) - c0;
      c.style.setProperty('--off', Math.min(1, Math.abs(d / step)).toFixed(3));
      c.style.setProperty('--ox', d < 0 ? '100%' : '0%');
      if (Math.abs(d) < best) { best = Math.abs(d); on = i; }
    });
    dots.forEach((b, i) => { if (i === on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (sel >= 0 && sel !== on) { sel = -1; paint(); }   /* swiped to another card: the choice goes, nothing stays dimmed in the middle */
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(sync); };
  /* scrollTo, not scrollBy: a relative scroll stops at every card on the way */
  const go = (i) => grid.scrollTo({ left: grid.scrollLeft + mid(cards[i]) - mid(grid), behavior: reduce ? 'auto' : 'smooth' });
  if (grid) {
    grid.addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    if (swipe.addEventListener) swipe.addEventListener('change', queue);
    dots.forEach((b, i) => b.addEventListener('click', () => go(i)));
    sync();
  }

  cards.forEach((c, i) => {
    c.addEventListener('click', () => { if (grid && swipe.matches && i !== on) go(i); else pick(i); });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } });
    if (reduce) return;
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--rx', ((x - 0.5) * 8).toFixed(2));
      c.style.setProperty('--ry', ((0.5 - y) * 6).toFixed(2));
      c.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      c.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      c.classList.add('is-hov');
    });
    c.addEventListener('pointerleave', () => { c.classList.remove('is-hov'); c.style.setProperty('--rx', '0'); c.style.setProperty('--ry', '0'); });
  });
})();
