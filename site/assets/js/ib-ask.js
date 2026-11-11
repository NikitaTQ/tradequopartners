/* IB Tools, the Four questions block (#ask, IB_Features_Four_Questions design): moves the lit question and the stack of
   IB Desk cards on. The question's red line is a CSS animation (5.5 s, .tq-ibq__fill); when it ends, the next question
   lights up. A click on a question, its bar (narrow screens) or a card lights that one. The turn holds while the pointer
   is over the cards and while the block is off screen; with "reduce motion" the line does not run, so nothing turns on
   its own. Each card gets data-off: 0 in front, 1 and 2 behind it, 3 the one that has just left (CSS places them). */
(function () {
  var s = document.querySelector('[data-ib-ask]');
  if (!s) return;
  var items = s.querySelectorAll('.tq-ibq__item'), segs = s.querySelectorAll('.tq-ibq__seg'), cards = s.querySelectorAll('.tq-ibq__card');
  var stage = s.querySelector('.tq-ibq__stage'), n = cards.length, a = 0, k;

  function set(i) {
    a = i;
    s.setAttribute('data-a', i);
    for (k = 0; k < n; k++) { items[k].classList.remove('is-act'); segs[k].classList.remove('is-act'); }
    void s.offsetWidth;   /* so the red line starts again even when the same question is picked */
    for (k = 0; k < n; k++) {
      items[k].classList.toggle('is-act', k === i);
      segs[k].classList.toggle('is-act', k === i);
      segs[k].classList.toggle('is-past', k < i);
      var b = items[k].querySelector('button');
      if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      cards[k].setAttribute('data-off', (k - i + n) % n);
    }
  }
  function pick(list) { for (var j = 0; j < list.length; j++) list[j].addEventListener('click', set.bind(null, j)); }
  pick(items); pick(segs); pick(cards);
  s.addEventListener('animationend', function (e) {
    if (e.animationName === 'tqIbqFill' && e.target.parentNode.parentNode.classList.contains('is-act')) set((a + 1) % n);
  });

  stage.addEventListener('mouseenter', function () { s.setAttribute('data-hold', ''); });
  stage.addEventListener('mouseleave', function () { s.removeAttribute('data-hold'); });
  if (window.matchMedia && matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      stage.style.setProperty('--qmx', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
      stage.style.setProperty('--qmy', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
    });
    stage.addEventListener('pointerleave', function () { stage.style.setProperty('--qmx', '0'); stage.style.setProperty('--qmy', '0'); });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { s.classList.add('is-on'); s.setAttribute('data-run', ''); } else s.removeAttribute('data-run');
    }, { threshold: 0.25 }).observe(s);
  } else { s.classList.add('is-on'); s.setAttribute('data-run', ''); }
})();
