/* Page transition shared by every page.
 * Leaving: the veil fades in while black ink pours into the TradeQuo mark (~0.46 s), then the
 * browser navigates. Arriving: <head> marks the document `tq-arriving`, so the full mark is up from
 * the first paint; the ink drains and the veil fades (~0.56 s). Links are prefetched on hover/touch,
 * so the next page is usually ready by the time the mark is full. */
(() => {
  const KEY = 'tqLoader';
  const FILL = 460, OUT = 560;
  const root = document.documentElement;
  const veil = document.querySelector('[data-loader]');
  const label = veil && veil.querySelector('[data-loader-label]');
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = () => {
    veil.hidden = true;
    veil.classList.remove('is-in', 'is-full', 'is-out');
    root.classList.remove('tq-arriving');
  };

  let incoming = null;
  try { incoming = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
  if (veil && incoming) {
    label.textContent = incoming;
    veil.hidden = false;
    veil.classList.add('is-full');
    requestAnimationFrame(() => {
      veil.classList.add('is-out');
      setTimeout(finish, OUT);
    });
  } else {
    root.classList.remove('tq-arriving');
  }

  const go = (href, text) => {
    if (!veil || reduce()) { location.href = href; return; }
    label.textContent = text || 'LOADING';
    veil.classList.remove('is-out', 'is-full');
    veil.hidden = false;
    void veil.offsetWidth;                 /* restart the pour if a previous one was cut short */
    veil.classList.add('is-in');
    try { sessionStorage.setItem(KEY, label.textContent); } catch (e) {}
    setTimeout(() => { location.href = href; }, FILL);
  };
  window.tqGo = go;

  const pageLink = (e) => {
    const a = e.target.closest && e.target.closest('a[data-page-link]');
    return a && a.origin === location.origin ? a : null;
  };

  document.addEventListener('click', (e) => {
    const a = pageLink(e);
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(a.href, a.dataset.label);
  });

  /* warm the next page while the pointer is on its way */
  const fetched = new Set();
  const prefetch = (e) => {
    const a = pageLink(e);
    if (!a) return;
    const url = a.href.split('#')[0];
    if (fetched.has(url) || url === location.href.split('#')[0]) return;
    fetched.add(url);
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = url;
    document.head.appendChild(l);
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);

  /* Back/forward cache restores the page exactly as it was left — veil up. */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted || !veil) return;
    finish();
  });
})();
