/* Links between pages (every page). They are plain links (November 2026: the logo animation between pages is gone;
 * it held each page change back by ~1 s). The next page is fetched while the pointer is on its way: on hover, touch
 * and focus of a link marked data-page-link, so it is usually ready by the click. */
(() => {
  const pageLink = (e) => {
    const a = e.target.closest && e.target.closest('a[data-page-link]');
    return a && a.origin === location.origin ? a : null;
  };
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
