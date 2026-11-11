/* IB Tools, the Ask AI block (#ai): the four questions on the left drive the "Ask AI" chat on the right.
   The lit question has a red line filling under it (a 10 s CSS animation, .tq-iba__fill); when it ends, the next one
   lights up. Lighting a question (its turn, or a click on it or on its bar on narrow screens) clears the chat, types
   that same question into the box (42 ms a letter), sends it, and "IB Desk AI" answers: dots, a line, the chart /
   table / bars row by row, a follow-up offer. The line stops while the pointer is over the chat and while the block is
   off screen; it starts the first time the block is a third on screen. The log slides up if an answer is taller than
   the chat. With "reduce motion" there is no line and no typing: a question shows its whole answer at once, and
   only a click changes it. Parts of a turn carry data-s (the step they appear at); data-fit marks what the slide
   measures. */
(function () {
  var s = document.querySelector('[data-ib-ai]');
  if (!s) return;
  var items = s.querySelectorAll('.tq-iba__item'), segs = s.querySelectorAll('.tq-iba__seg'), turns = s.querySelectorAll('.tq-iba__turn');
  var area = s.querySelector('.tq-iba__area'), log = s.querySelector('.tq-iba__log'), chat = s.querySelector('.tq-iba__chat');
  var inp = s.querySelector('.tq-iba__in'), typed = s.querySelector('.tq-iba__typed');
  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var n = turns.length, a = 0, tm = [], iv = 0, off = 0, started = false, k;

  function at(ms, fn) { tm.push(setTimeout(fn, ms)); }
  function clear() { for (var j = 0; j < tm.length; j++) clearTimeout(tm[j]); tm = []; clearInterval(iv); }
  function fit() {
    var top = log.getBoundingClientRect().top, b = 0, sh = log.querySelectorAll('[data-fit].is-on');
    for (var j = 0; j < sh.length; j++) b = Math.max(b, sh[j].getBoundingClientRect().bottom - top);
    var o = Math.max(0, Math.round(b + 20 - area.clientHeight));
    if (o !== off) { off = o; log.style.transform = 'translateY(' + -o + 'px)'; }
  }
  /* show the parts of turn t up to step k (-1: none) */
  function step(t, k) {
    var p = turns[t].querySelectorAll('[data-s]');
    for (var j = 0; j < p.length; j++) p[j].classList.toggle('is-on', +p[j].getAttribute('data-s') <= k);
    turns[t].classList.toggle('is-think', k === 2);
    if (k > 0) inp.classList.remove('is-typing', 'is-caret');
    fit();
  }
  function last(t) { var m = 0, p = turns[t].querySelectorAll('[data-s]'); for (var j = 0; j < p.length; j++) m = Math.max(m, +p[j].getAttribute('data-s')); return m; }

  /* light question i: the list, the bars, the red line (restarted even for the same question) */
  function mark(i) {
    for (k = 0; k < n; k++) { items[k].classList.remove('is-act'); segs[k].classList.remove('is-act'); }
    void s.offsetWidth;
    for (k = 0; k < n; k++) {
      items[k].classList.toggle('is-act', k === i);
      segs[k].classList.toggle('is-act', k === i);
      segs[k].classList.toggle('is-past', k < i);
      var b = items[k].querySelector('button');
      if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    }
  }
  function select(i) {
    a = i; clear(); mark(i);
    inp.classList.remove('is-typing'); inp.classList.remove('is-caret'); typed.textContent = '';
    log.classList.add('is-out');
    at(reduced || !started ? 0 : 300, function () {
      for (var t = 0; t < n; t++) { turns[t].classList.toggle('is-live', t === i); step(t, -1); }
      log.style.transition = 'none'; log.style.transform = 'translateY(0px)'; off = 0; void log.offsetHeight; log.style.transition = '';
      log.classList.remove('is-out');
      started = true;
      if (reduced) step(i, 99); else type(i);
    });
  }
  function type(i) {
    var q = items[i].querySelector('.tq-iba__btn').textContent, c = 0;
    inp.classList.add('is-caret');
    at(350, function () {
      iv = setInterval(function () {
        c++;
        typed.textContent = q.slice(0, c);
        inp.classList.add('is-typing');
        if (c >= q.length) { clearInterval(iv); play(i); }
      }, 42);
    });
  }
  function play(i) {
    var m = last(i), follow = !!turns[i].querySelector('.tq-iba__follow'), w = 360;
    at(w, function () { step(i, 1); });
    w += 380; at(w, function () { step(i, 2); });
    w += 1100; at(w, function () { step(i, 3); });
    for (var j = 4; j <= m; j++) { w += j === m && follow ? 480 : j === 4 ? 300 : 240; at(w, step.bind(null, i, j)); }
  }

  function pick(list) { for (var j = 0; j < list.length; j++) list[j].addEventListener('click', select.bind(null, j)); }
  pick(items); pick(segs);
  s.addEventListener('animationend', function (e) {
    if (e.animationName === 'tqIbaFill' && e.target.parentNode.parentNode.classList.contains('is-act')) select((a + 1) % n);
  });
  chat.addEventListener('mouseenter', function () { s.setAttribute('data-hold', ''); });
  chat.addEventListener('mouseleave', function () { s.removeAttribute('data-hold'); });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(area);

  s.setAttribute('data-play', '');
  function begin() { s.classList.add('is-on'); select(0); }
  if ('IntersectionObserver' in window) {
    var first = true;
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { s.setAttribute('data-run', ''); if (first) { first = false; begin(); } } else s.removeAttribute('data-run');
    }, { threshold: 0.3 }).observe(s);
  } else { s.setAttribute('data-run', ''); begin(); }
})();
