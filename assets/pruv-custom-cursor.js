/* Prüv — custom cursor: a solid dot that tracks the mouse exactly, and a
   ring that eases toward it for a soft trailing effect. Desktop-with-mouse
   only (guarded by the same media query the CSS uses), so touch devices are
   never touched and never lose their native cursor. */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'pruv-cursor-dot';
  var ring = document.createElement('div');
  ring.className = 'pruv-cursor-ring';

  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.documentElement.classList.add('pruv-cursor-enabled');

  var mouseX = 0;
  var mouseY = 0;
  var ringX = 0;
  var ringY = 0;
  var isActive = false;

  function activate() {
    if (isActive) return;
    isActive = true;
    dot.classList.add('is-active');
    ring.classList.add('is-active');
  }

  function deactivate() {
    isActive = false;
    dot.classList.remove('is-active');
    ring.classList.remove('is-active');
  }

  window.addEventListener('mousemove', function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    activate();
    dot.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0) translate(-50%,-50%)';
  });

  document.addEventListener('mouseleave', deactivate);
  window.addEventListener('blur', deactivate);

  function render() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0) translate(-50%,-50%)';
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
