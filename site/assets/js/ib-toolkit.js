/* IB Tools: the Branded toolkit block (IB_Branded_Toolkit_1, #toolkit in ibtools.html). The section's data-tool says
   which of the four tools is shown (op, ze, bfs, ut); the CSS does the rest (partner.css, "the Branded toolkit block").
   The tools take turns every 5.2 s while the block is on screen, held while the pointer is over the panels; a click (or
   Enter / Space) on a scanner row, a tool in the list or a switch label picks that tool and stops the turns. With
   "reduce motion" it stays on the first tool. The scaling of the two compositions is the inline script in the section. */
(function () {
  var root = document.querySelector('[data-ib-tk]');
  if (!root) return;
  var order = ['op', 'ze', 'bfs', 'ut'], tool = root.getAttribute('data-tool') || 'op';
  var paused = false, manual = false, seen = false, timer = 0;
  var sels = Array.prototype.slice.call(root.querySelectorAll('[data-tk-sel]'));
  var reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function set(k) {
    tool = k;
    root.setAttribute('data-tool', k);
    sels.forEach(function (e) { e.setAttribute('aria-pressed', e.getAttribute('data-tk-sel') === k ? 'true' : 'false'); });
  }
  function pick(e) { manual = true; set(e.getAttribute('data-tk-sel')); }
  sels.forEach(function (e) {
    e.addEventListener('click', function () { pick(e); });
    e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(e); } });
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-tk-hover]'), function (e) {
    e.addEventListener('mouseenter', function () { paused = true; });
    e.addEventListener('mouseleave', function () { paused = false; });
  });
  function tick() { if (paused || manual || !seen || reduce.matches) return; set(order[(order.indexOf(tool) + 1) % order.length]); }
  set(tool);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      seen = es[0].isIntersecting;
      if (seen && !timer) timer = setInterval(tick, 5200);
      else if (!seen && timer) { clearInterval(timer); timer = 0; }
    }, { threshold: 0.25 }).observe(root);
  }
})();
