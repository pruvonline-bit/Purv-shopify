/* Prüv — custom cursor: a solid dot that tracks the mouse exactly, and a
   ring that eases toward it for a soft trailing effect. Desktop-with-mouse
   only (guarded by the same media query the CSS uses), so touch devices are
   never touched and never lose their native cursor.

   Visible immediately (centered) rather than waiting for the first
   mousemove, and only hidden on window blur/focus (tab switch) - not on
   document mouseleave, which several browsers fire spuriously when the
   pointer crosses into an <iframe> (video embeds, Shop Pay, etc.) and would
   otherwise leave the cursor stuck invisible. */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'pruv-cursor-dot';
  var ring = document.createElement('div');
  ring.className = 'pruv-cursor-ring';

  document.documentElement.appendChild(dot);
  document.documentElement.appendChild(ring);
  document.documentElement.classList.add('pruv-cursor-enabled');

  var mouseX = window.innerWidth / 2;
  var mouseY = window.innerHeight / 2;
  var ringX = mouseX;
  var ringY = mouseY;

  function place(el, x, y) {
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
  }

  place(dot, mouseX, mouseY);
  place(ring, ringX, ringY);

  window.addEventListener('mousemove', function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    place(dot, mouseX, mouseY);
  });

  window.addEventListener('blur', function () {
    dot.classList.add('is-hidden');
    ring.classList.add('is-hidden');
  });

  window.addEventListener('focus', function () {
    dot.classList.remove('is-hidden');
    ring.classList.remove('is-hidden');
  });

  function render() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    place(ring, ringX, ringY);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
