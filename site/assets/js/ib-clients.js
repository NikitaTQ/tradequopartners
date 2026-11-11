/* IB Tools, the Clients & earnings block (#clients, IB_Clients_Earnings design), ported from the design's React component.
   One client is picked: its row turns red, its commission records stay bright (the rest dim), and lines run from the
   client to each of its records (drawn in, then a dot travels along each). The pick moves to the next client of the
   current filter that has records every 4.2 s, while the block is on screen and the pointer is not over the panels; a
   click on a client or a filter picks by hand and stops the turns. Wide (the picture 640px+): the two panels stand
   tilted, bob slowly and turn a little after the pointer. Below 760px (the phone layout): two client rows, the picked
   client's records (up to two) and their sum. With "reduce motion" nothing moves; picks still work.
   Also sets the page's language on the demo figures: counts, volumes and lots in its number format, dates and the month
   by Intl; the patterns come from data-total / data-via / data-lots / data-from on the section ("{n}" = the value).
   Dollar sums stay as written. */
(function () {
  var s = document.querySelector('[data-ib-ce]');
  if (!s) return;
  var stage = s.querySelector('.tq-ibc__stage'), p1 = s.querySelector('.tq-ibc__panel--cl'), p2 = s.querySelector('.tq-ibc__panel--cm'), svg = s.querySelector('.tq-ibc__lines');
  var cls = [].slice.call(s.querySelectorAll('.tq-ibc__cl')), recs = [].slice.call(s.querySelectorAll('.tq-ibc__rec'));
  var chips = s.querySelectorAll('.tq-ibc__chip'), tabs = s.querySelectorAll('.tq-ibc__tab');
  var sumEl = s.querySelector('.tq-ibc__sum'), fromEl = s.querySelector('.tq-ibc__from');
  var FK = ['', 'a', 'd', 'i'];
  var mq = function (q) { return window.matchMedia ? matchMedia(q) : { matches: false }; };
  var narrowQ = mq('(max-width: 759px)'), reduced = mq('(prefers-reduced-motion: reduce)').matches;
  var pat = function (a, v) { return (s.getAttribute(a) || '{n}').replace('{n}', v); };

  /* the page's language on the figures */
  (function () {
    var lang = document.documentElement.lang || 'en', loc = /^ar/.test(lang) ? lang + '-u-nu-latn' : lang;
    var each = function (sel, fn) { var e = s.querySelectorAll(sel); for (var i = 0; i < e.length; i++) fn(e[i]); };
    try {
      var n0 = new Intl.NumberFormat(loc), n1 = new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      var day = new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric' }), mon = new Intl.DateTimeFormat(loc, { month: 'long' });
      var at = function (iso) { return new Date(iso + 'T12:00:00'); };
      each('[data-total-n]', function (e) { e.textContent = pat('data-total', n0.format(+e.getAttribute('data-total-n'))); });
      each('.tq-ibc__chip small[data-n]', function (e) { e.textContent = n0.format(+e.getAttribute('data-n')); });
      each('.tq-ibc__vol[data-n]', function (e) { e.textContent = n1.format(+e.getAttribute('data-n')); });
      each('[data-lots]', function (e) { e.textContent = pat('data-lots', n1.format(+e.getAttribute('data-lots'))); });
      each('[data-date]', function (e) { e.textContent = day.format(at(e.getAttribute('data-date'))); });
      each('[data-month]', function (e) { var m = mon.format(at(e.getAttribute('data-month'))); e.textContent = m.charAt(0).toLocaleUpperCase(lang) + m.slice(1); });
    } catch (err) {}
    each('small[data-via]', function (e) { e.textContent = pat('data-via', e.getAttribute('data-via')); });
    /* the status column: as wide as its longest word */
    var c = document.createElement('canvas').getContext('2d'); c.font = '700 11px Inter, system-ui, sans-serif';
    [p1, p2].forEach(function (p) {
      var w = 0, pills = p.querySelectorAll('.tq-ibc__pill');
      for (var i = 0; i < pills.length; i++) w = Math.max(w, c.measureText(pills[i].textContent).width);
      p.style.setProperty('--stw', Math.ceil(Math.max(p === p1 ? 96 : 76, w + 9 * 2 + 6 + 6 + 2 + 2)) + 'px');
    });
  })();

  var f = 0, sel = 'D. Moreau', manual = false, hover = false, vis = false, selT = 0, at = 0;
  var list = function (k) { return cls.filter(function (c) { return !FK[k] || c.getAttribute('data-st') === FK[k]; }); };
  var cyc = function (k) { return list(k).filter(function (c) { return c.hasAttribute('data-has'); }).map(function (c) { return c.getAttribute('data-name'); }); };

  function render() {
    var L = list(f), shown = L.slice(0, 2);
    if (sel && !shown.some(function (c) { return c.getAttribute('data-name') === sel; })) { var x = L.filter(function (c) { return c.getAttribute('data-name') === sel; })[0]; if (x) shown[1] = x; }
    cls.forEach(function (c) {
      c.classList.toggle('is-out', L.indexOf(c) < 0);
      c.classList.toggle('is-shown', shown.indexOf(c) >= 0);
      c.classList.toggle('is-sel', c.getAttribute('data-name') === sel);
    });
    var mine = recs.filter(function (r) { return r.getAttribute('data-name') === sel; }), sum = 0;
    recs.forEach(function (r) { var i = mine.indexOf(r); r.classList.toggle('is-sel', i >= 0); r.classList.toggle('is-shown', i >= 0 && i < 2); });
    mine.forEach(function (r) { sum += parseFloat(r.getAttribute('data-amt')); });
    sumEl.textContent = '$' + sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    fromEl.textContent = pat('data-from', sel || '—');
    s.classList.toggle('no-sel', !sel);
    [chips, tabs].forEach(function (g) { for (var i = 0; i < g.length; i++) { g[i].classList.toggle('is-act', i === f); g[i].setAttribute('aria-pressed', i === f ? 'true' : 'false'); } });
    selT = 0;
    if (reduced) frame(0);
  }
  function filter(k) { manual = true; clearTimeout(at); f = k; sel = cyc(k)[0] || null; render(); }
  function pick(name) { manual = true; clearTimeout(at); sel = name; render(); }
  function arm() {
    clearTimeout(at);
    at = setTimeout(function () {
      if (manual) return;
      if (!hover && vis) { var C = cyc(f); if (C.length > 1) { sel = C[(C.indexOf(sel) + 1) % C.length]; render(); } }
      arm();
    }, 4200);
  }
  [chips, tabs].forEach(function (g) { for (var i = 0; i < g.length; i++) g[i].addEventListener('click', filter.bind(null, i)); });
  cls.forEach(function (c) { if (c.hasAttribute('data-has')) c.addEventListener('click', pick.bind(null, c.getAttribute('data-name'))); });

  /* the lines: three sets (a soft wide stroke, the line, an end ring, a travelling dot) and the source dot */
  var NS = 'http://www.w3.org/2000/svg';
  var mk = function (tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  var paths = [0, 1, 2].map(function () {
    return {
      glow: mk('path', { fill: 'none', stroke: 'rgba(10,10,10,0.12)', 'stroke-width': '6', 'stroke-linecap': 'round', pathLength: '1', 'stroke-dasharray': '1' }),
      line: mk('path', { fill: 'none', stroke: '#0A0A0A', 'stroke-width': '1.6', 'stroke-linecap': 'round', pathLength: '1', 'stroke-dasharray': '1' }),
      end: mk('circle', { r: '4', fill: '#FFFFFF', stroke: '#0A0A0A', 'stroke-width': '2' }),
      dot: mk('circle', { r: '3', fill: '#0A0A0A' })
    };
  });
  var src = mk('circle', { r: '5', fill: '#0A0A0A', stroke: '#FFFFFF', 'stroke-width': '2' });
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  var hide = function (p) { [p.glow, p.line, p.end, p.dot].forEach(function (e) { e.setAttribute('opacity', '0'); }); };

  function frame(T) {
    var wide = stage.clientWidth >= 640, narrow = narrowQ.matches, still = reduced;
    tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
    var b1 = still ? 0 : Math.sin(T * 0.9) * 6, b2 = still ? 0 : Math.sin(T * 0.9 + 1.6) * 6;
    if (wide) {
      p1.style.transform = 'perspective(1500px) rotateY(' + (14 + tilt.x * 4).toFixed(2) + 'deg) rotateX(' + (4 - tilt.y * 3).toFixed(2) + 'deg) translateY(' + b1.toFixed(2) + 'px)';
      p2.style.transform = 'perspective(1500px) rotateY(' + (-12 + tilt.x * 4).toFixed(2) + 'deg) rotateX(' + (4 - tilt.y * 3).toFixed(2) + 'deg) translateY(' + b2.toFixed(2) + 'px)';
    } else { p1.style.transform = 'translateY(' + (b1 * 0.4).toFixed(2) + 'px)'; p2.style.transform = 'translateY(' + (b2 * 0.4).toFixed(2) + 'px)'; }
    var sr = stage.getBoundingClientRect();
    var srcEl = sel ? cls.filter(function (c) { return c.getAttribute('data-name') === sel && c.offsetParent; })[0] : null;
    if (!srcEl) { src.setAttribute('opacity', '0'); paths.forEach(hide); return; }
    src.setAttribute('opacity', '1');
    var a = srcEl.getBoundingClientRect(), S = { x: a.right - sr.left - 10, y: a.top + a.height / 2 - sr.top };
    var targets = recs.filter(function (r) { return r.classList.contains('is-sel') && r.offsetParent; });
    var prog = still ? 1 : Math.min(1, selT / 0.15);
    src.setAttribute('cx', S.x); src.setAttribute('cy', S.y); src.setAttribute('r', (5 * prog).toFixed(2));
    paths.forEach(function (p, i) {
      var t = targets[i];
      if (!t) { hide(p); return; }
      var r = t.getBoundingClientRect(), E, d, c;
      if (!narrow && wide) {
        E = { x: r.left - sr.left + 8, y: r.top + r.height / 2 - sr.top };
        var dx = Math.max(40, (E.x - S.x) * 0.55);
        c = [S, { x: S.x + dx, y: S.y }, { x: E.x - dx, y: E.y }, E];
      } else {
        E = { x: r.right - sr.left - 8, y: r.top + r.height / 2 - sr.top };
        var ox = Math.min(sr.width - 4, Math.max(S.x, E.x) + 28);
        c = [S, { x: ox, y: S.y }, { x: ox, y: E.y }, E];
      }
      d = 'M' + c[0].x + ' ' + c[0].y + ' C' + c[1].x + ' ' + c[1].y + ' ' + c[2].x + ' ' + c[2].y + ' ' + c[3].x + ' ' + c[3].y;
      var lp = still ? 1 : Math.max(0, Math.min(1, (selT - 0.1 - i * 0.18) / 0.75)), lpe = 1 - Math.pow(1 - lp, 3);
      [p.glow, p.line].forEach(function (e) { e.setAttribute('d', d); e.setAttribute('stroke-dashoffset', (1 - lpe).toFixed(3)); e.setAttribute('opacity', '1'); });
      p.end.setAttribute('cx', E.x); p.end.setAttribute('cy', E.y); p.end.setAttribute('opacity', lp >= 1 ? '1' : '0');
      p.end.setAttribute('r', lp >= 1 && !still ? (4 + 2 * Math.max(0, 1 - (selT - 0.85 - i * 0.18) / 0.3)).toFixed(2) : '4');
      var u = (T * 0.45 + i * 0.33) % 1, it = 1 - u;
      p.dot.setAttribute('cx', it * it * it * c[0].x + 3 * it * it * u * c[1].x + 3 * it * u * u * c[2].x + u * u * u * c[3].x);
      p.dot.setAttribute('cy', it * it * it * c[0].y + 3 * it * it * u * c[1].y + 3 * it * u * u * c[2].y + u * u * u * c[3].y);
      p.dot.setAttribute('opacity', lp >= 1 && !still ? Math.sin(Math.PI * u).toFixed(2) : '0');
    });
  }

  stage.addEventListener('mouseenter', function () { hover = true; });
  stage.addEventListener('mouseleave', function () { hover = false; tilt.tx = 0; tilt.ty = 0; });
  stage.addEventListener('mousemove', function (e) { var r = stage.getBoundingClientRect(); tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }, { threshold: 0.15 }).observe(s);
  else vis = true;

  render();
  if (reduced) {
    var redraw = function () { frame(0); };
    if (window.ResizeObserver) new ResizeObserver(redraw).observe(stage); else window.addEventListener('resize', redraw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
    return;
  }
  var last = performance.now(), T = 0;
  var loop = function (now) {
    requestAnimationFrame(loop);
    if (!vis) { last = now; return; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt; selT += dt;
    frame(T);
  };
  requestAnimationFrame(loop);
  arm();
})();
