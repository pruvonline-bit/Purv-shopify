/* Prüv — custom luxury cursor: solid copper dot + trailing halo ring.
   Bulletproof pointer handling for desktop, trackpads, and hybrid Windows touch devices. */
(function () {
  // Guard against touch-only small screens
  if (window.innerWidth < 750 && ('ontouchstart' in window) && !window.matchMedia('(any-pointer: fine)').matches) {
    return;
  }

  var dot = document.createElement('div');
  dot.className = 'pruv-cursor-dot is-hidden';
  var ring = document.createElement('div');
  ring.className = 'pruv-cursor-ring is-hidden';

  function mount() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', mount);
      return;
    }
    if (!dot.parentNode) {
      document.body.appendChild(dot);
      document.body.appendChild(ring);
    }
  }

  mount();

  var mouseX = -100;
  var mouseY = -100;
  var ringX = -100;
  var ringY = -100;
  var isVisible = false;
  var isHovering = false;

  function place(el, x, y) {
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
  }

  function render() {
    if (isVisible) {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      place(ring, ringX, ringY);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function show(x, y) {
    if (!isVisible) {
      isVisible = true;
      document.documentElement.classList.add('pruv-cursor-enabled');
      dot.classList.remove('is-hidden');
      ring.classList.remove('is-hidden');
      ringX = x;
      ringY = y;
    }
  }

  function hide() {
    isVisible = false;
    document.documentElement.classList.remove('pruv-cursor-enabled');
    dot.classList.add('is-hidden');
    ring.classList.add('is-hidden');
  }

  function onMove(e) {
    if (e.pointerType === 'touch') return;
    show(e.clientX, e.clientY);
    mouseX = e.clientX;
    mouseY = e.clientY;
    place(dot, mouseX, mouseY);

    // Check if hovering interactive element
    var target = e.target;
    var isInteractive = target && (
      target.matches('a, button, input, select, textarea, [role="button"], label, summary, .cursor-pointer') ||
      target.closest('a, button, input, select, textarea, [role="button"], label, summary, .cursor-pointer')
    );

    if (isInteractive && !isHovering) {
      isHovering = true;
      ring.classList.add('is-hovering');
    } else if (!isInteractive && isHovering) {
      isHovering = false;
      ring.classList.remove('is-hovering');
    }
  }

  // Use capturing phase so no page script can swallow the event
  window.addEventListener('pointermove', onMove, { capture: true, passive: true });
  window.addEventListener('mousemove', onMove, { capture: true, passive: true });

  window.addEventListener('blur', hide);
  document.addEventListener('mouseleave', hide);

  // Restore native behavior immediately on touch
  window.addEventListener('touchstart', function () {
    hide();
  }, { passive: true });
})();
