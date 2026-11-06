/* commission-plan/: the payout process. A red pulse runs step to step while the section is on
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
