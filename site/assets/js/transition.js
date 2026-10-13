/* Page transition shared by the landing and the concept pages.
 * Leaving: the loader veil fades in (320ms), then the browser navigates.
 * Arriving: <head> marks the document `tq-arriving` so the veil is up from the
 * first paint; it holds briefly, then fades out (480ms). */
(() => {
  const KEY = 'tqLoader';
  const IN = 320, HOLD = 1400, OUT = 480;
  const root = document.documentElement;
  const veil = document.querySelector('[data-loader]');
  const label = veil && veil.querySelector('[data-loader-label]');
  const frame = veil && veil.querySelector('iframe');
  const loadFrame = () => { if (frame && !frame.getAttribute('src')) frame.src = frame.dataset.src; };

  const hide = () => {
    veil.classList.add('is-out');
    root.classList.remove('tq-arriving');
    setTimeout(() => { veil.hidden = true; veil.classList.remove('is-out'); }, OUT);
  };

  let incoming = null;
  try { incoming = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
  if (veil && incoming) {
    label.textContent = incoming;
    loadFrame();
    veil.hidden = false;
    setTimeout(hide, HOLD);
  } else {
    root.classList.remove('tq-arriving');
  }

  const go = (href, text) => {
    if (!veil || matchMedia('(prefers-reduced-motion: reduce)').matches) { location.href = href; return; }
    label.textContent = text || 'LOADING';
    loadFrame();
    veil.classList.remove('is-out');
    veil.hidden = false;
    try { sessionStorage.setItem(KEY, label.textContent); } catch (e) {}
    setTimeout(() => { location.href = href; }, IN);
  };
  window.tqGo = go;

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-page-link]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(a.href, a.dataset.label);
  });

  /* Back/forward cache restores the page exactly as it was left — veil up. */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted || !veil) return;
    veil.hidden = true;
    veil.classList.remove('is-out');
    root.classList.remove('tq-arriving');
  });
})();
