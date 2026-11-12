/* IB Tools, the Partnershield block (#partnershield): the intro of the mark, as in the design (Partnershield_Block_Animated).
   The IB sphere appears with a red glow, the two branches grow out of it with a spark at their ends, the two client
   spheres land, the frame draws itself from the top left round the tip (a ghost of it shows the way), then the glass
   polish, a light sweep and the reflection; the wordmark settles last. 3.5 s, once, when the block comes into view.
   The markup (tools/i18n/partials/ib-shield.html) holds the end state, which is what reduced motion keeps; the script
   loads the picture (the mark's and its reflection's) when the block nears, sets the start and plays the intro on the
   first sight of it. */
(function () {
  var root = document.querySelector('[data-ib-shield]');
  if (!root) return;
  var svg = root.querySelector('.tq-ibp__svg'), name = root.querySelector('.tq-ibp__name'), refl = root.querySelector('.tq-ibp__refl');
  var R = {};
  [].forEach.call(svg.querySelectorAll('[data-k]'), function (el) { R[el.getAttribute('data-k')] = el; });
  var S = { TL: [177, 141], TR: [492, 141], B: [334, 401] };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cl = function (t, a, b) { return Math.min(1, Math.max(0, (t - a) / (b - a))); };
  var eo = function (x) { return 1 - Math.pow(1 - x, 3); };
  var eio = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var back = function (x) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  var sc = function (el, c, s) { el.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + -c[0] + ' ' + -c[1] + ')'); };
  var op = function (el, v) { el.setAttribute('opacity', v); };
  var place = function (el, path, p) { var pt = path.getPointAtLength(path.getTotalLength() * p); el.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')'); };

  function tick(t) {
    // 1 · the IB sphere (blurred at first), its glow and its letters
    var pi = cl(t, 0, .7);
    sc(R.sB, S.B, .55 + .45 * back(pi)); op(R.sB, eo(cl(t, 0, .35)));
    R.blurF.setAttribute('stdDeviation', (10 * (1 - eo(pi))).toFixed(2));
    if (pi >= 1) R.sB.removeAttribute('filter'); else R.sB.setAttribute('filter', 'url(#ps-blur)');
    var g = cl(t, .05, .95);
    op(R.ibGlow, g < 1 ? .45 * g + .75 * Math.sin(Math.PI * g) : .45);
    sc(R.ibGlow, S.B, .55 + .45 * eo(g));
    op(R.ibT, eo(cl(t, .4, .8)));
    // 2 · the branches grow, a spark at their ends
    var pb = eio(cl(t, .6, 1.35));
    [R.b1, R.b2].forEach(function (b) { b.setAttribute('stroke-dasharray', pb + ' 2'); op(b, pb > 0 ? 1 : 0); });
    var sbo = pb > 0 && pb < 1 ? Math.sin(Math.PI * pb) : 0;
    op(R.sb1, sbo); op(R.sb2, sbo); place(R.sb1, R.b1, pb); place(R.sb2, R.b2, pb);
    // 3 · the clients
    [['TL', 1.18], ['TR', 1.26]].forEach(function (k) {
      sc(R['s' + k[0]], S[k[0]], .5 + .5 * back(cl(t, k[1], k[1] + .55))); op(R['s' + k[0]], eo(cl(t, k[1], k[1] + .3)));
      op(R['ic' + k[0]], eo(cl(t, k[1] + .25, k[1] + .65)));
    });
    // 4 · the frame draws itself: top left → the tip → top right → top left
    op(R.ghost, eo(cl(t, 1.3, 1.7)) * (1 - cl(t, 3.0, 3.3)));
    var pf = eio(cl(t, 1.65, 3.05));
    R.f.setAttribute('stroke-dasharray', pf + ' 2'); op(R.f, pf > 0 ? 1 : 0);
    op(R.sf, pf > 0 && pf < 1 ? Math.min(1, Math.sin(Math.PI * pf) * 1.6) : 0); place(R.sf, R.f, pf);
    // 5 · glass polish, the sweep, the reflection
    op(R.ovF, eo(cl(t, 2.85, 3.3))); op(R.ovB, eo(cl(t, 2.85, 3.3)));
    R.sweep.setAttribute('gradientTransform', 'translate(' + (-900 + 1800 * eio(cl(t, 2.9, 3.5))).toFixed(1) + ' 0)');
    root.style.setProperty('--ps-refl', (.14 * eo(cl(t, 2.95, 3.5))).toFixed(3));
    // the wordmark
    var p = eo(cl(t, 2.75, 3.4));
    name.style.opacity = p;
    name.style.letterSpacing = (.1 + .22 * (1 - p)).toFixed(3) + 'em';
    name.style.transform = 'translateY(' + (6 * (1 - p)).toFixed(1) + 'px)';
  }

  var ready = false, seen = false, played = false;
  function play() {
    if (played || !ready || !seen) return;
    played = true;
    var t0 = performance.now();
    (function step() {
      var t = (performance.now() - t0) / 1000;
      tick(t);
      if (t < 3.7) requestAnimationFrame(step);
      else { name.style.opacity = name.style.letterSpacing = name.style.transform = ''; root.style.removeProperty('--ps-refl'); }
    })();
  }

  // the picture: when the block is a screen or so away
  function load() {
    var src = svg.getAttribute('data-src'), img = new Image();
    var done = function () {
      [].forEach.call(svg.querySelectorAll('image'), function (el) { el.setAttribute('href', src); });
      refl.src = src;
      ready = true; play();
    };
    img.onload = img.onerror = done;
    img.src = src;
  }
  if (!('IntersectionObserver' in window)) { load(); return; }
  if (!reduce) tick(0);
  var near = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting; })) { near.disconnect(); load(); }
  }, { rootMargin: '900px 0px' });
  near.observe(root);
  if (reduce) return;
  var view = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting; })) { view.disconnect(); seen = true; play(); }
  }, { threshold: .35 });
  view.observe(svg);
})();
