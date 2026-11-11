/* IB Tools, the AI assistant block (#ai, IB_AI_Assistant design): plays the "Ask AI" chat. For each of the four turns
   the question is typed into the box (42 ms a letter), sent, the assistant "thinks" (dots), answers with a line, then
   the rows of its table or bars one by one, and maybe a follow-up question; then the next turn. After the last one the
   chat fades and starts over. It starts when the block is first a third on screen; between turns it waits while the
   pointer is over the chat or the block is off screen. The log slides up so the newest line sits above the input.
   With "reduce motion" nothing plays: the whole conversation is shown, scrolled to its end. */
(function () {
  var s = document.querySelector('[data-ib-ai]');
  if (!s) return;
  var turns = s.querySelectorAll('.tq-iba__turn'), area = s.querySelector('.tq-iba__area'), log = s.querySelector('.tq-iba__log');
  var chat = s.querySelector('.tq-iba__chat'), inp = s.querySelector('.tq-iba__in'), typed = s.querySelector('.tq-iba__typed');
  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var tm = [], iv = 0, hover = false, vis = false, started = false, off = 0;

  function at(ms, fn) { tm.push(setTimeout(fn, ms)); }
  function parts(t) { return turns[t].querySelectorAll('[data-s]'); }
  /* show the parts of turn t up to this step */
  function step(t, k) {
    var p = parts(t);
    for (var j = 0; j < p.length; j++) p[j].classList.toggle('is-on', +p[j].getAttribute('data-s') <= k);
    turns[t].classList.toggle('is-think', k === 2);
    inp.classList.toggle('is-caret', k === 0);
    if (k > 0) inp.classList.remove('is-typing');
    fit();
  }
  function fit() {
    var top = log.getBoundingClientRect().top, b = 0, sh = log.querySelectorAll('[data-fit].is-on');
    for (var j = 0; j < sh.length; j++) b = Math.max(b, sh[j].getBoundingClientRect().bottom - top);
    var o = Math.max(0, Math.round(b + 20 - area.clientHeight));
    if (o !== off) { off = o; log.style.transform = 'translateY(' + -o + 'px)'; }
  }
  function turn(t) {
    var q = turns[t].querySelector('.tq-iba__q').textContent, n = 0;
    turns[t].classList.add('is-live');
    step(t, 0);
    typed.textContent = '';
    iv = setInterval(function () {
      n++;
      typed.textContent = q.slice(0, n);
      inp.classList.add('is-typing');
      if (n >= q.length) { clearInterval(iv); play(t); }
    }, 42);
  }
  function play(t) {
    var rows = turns[t].querySelectorAll('.tq-iba__r, .tq-iba__b').length, follow = !!turns[t].querySelector('.tq-iba__follow'), w = 360;
    at(w, function () { step(t, 1); });
    w += 380; at(w, function () { step(t, 2); });
    w += 1100; at(w, function () { step(t, 3); });
    for (var j = 0; j < rows; j++) { w += j ? 240 : 300; at(w, step.bind(null, t, 4 + j)); }
    if (follow) { w += 480; at(w, step.bind(null, t, 4 + rows)); }
    if (t < turns.length - 1) at(w + 2300, function () { wait(function () { turn(t + 1); }); });
    else at(w + 5500, function () { wait(restart); });
  }
  function wait(fn) { if (hover || !vis) at(800, function () { wait(fn); }); else fn(); }
  function restart() {
    log.classList.add('is-out');
    at(420, function () {
      for (var t = 0; t < turns.length; t++) { turns[t].classList.remove('is-live'); step(t, -1); }
      log.style.transition = 'none'; log.style.transform = 'translateY(0px)'; off = 0; void log.offsetHeight; log.style.transition = '';
      log.classList.remove('is-out');
      turn(0);
    });
  }
  function begin() {
    if (reduced) {   /* everything shown, scrolled to the end */
      for (var t = 0; t < turns.length; t++) { turns[t].classList.add('is-live'); step(t, 99); }
      inp.classList.remove('is-caret');
      return;
    }
    s.setAttribute('data-play', '');
    turn(0);
  }

  chat.addEventListener('mouseenter', function () { hover = true; });
  chat.addEventListener('mouseleave', function () { hover = false; });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(area);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      vis = e[0].isIntersecting;
      if (vis && !started) { started = true; begin(); }
    }, { threshold: 0.3 }).observe(s);
  } else { vis = started = true; begin(); }
})();
