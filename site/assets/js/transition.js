/* Between pages (November 2026: the logo animation between pages is gone, asked for; it held each page change back by
 * ~1 s: 0.46 s of ink before the browser even started, ~0.56 s of veil over the page that had arrived). Links now go
 * at once, as plain links; the next page is still fetched while the pointer is on its way (prefetch on hover, touch,
 * focus). The veil markup (partials/loader.html) and its styles stay, unused, should it come back. */
(() => {
  const KEY = 'tqLoader';
  const root = document.documentElement;
  const veil = document.querySelector('[data-loader]');
  try { sessionStorage.removeItem(KEY); } catch (e) {}
  if (veil) veil.hidden = true;
  root.classList.remove('tq-arriving');
  window.tqGo = (href) => { location.href = href; };

  const pageLink = (e) => {
    const a = e.target.closest && e.target.closest('a[data-page-link]');
    return a && a.origin === location.origin ? a : null;
  };
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
})();
