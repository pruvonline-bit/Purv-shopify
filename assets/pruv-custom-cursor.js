/* Prüv — custom cursor behavior: dot tracks the pointer, ring eases after it.

   Two things here are deliberate:

   1. `display` is set INLINE with !important. These elements were being
      hidden by a stylesheet outside document.styleSheets (browser/extension
      cosmetic filtering of small empty fixed-position divs) - no author rule
      declaring `display` matched them, yet computed display was `none`. An
      inline !important declaration is the only thing that reliably outranks
      author-origin CSS, so the visibility toggle lives here, not in the CSS.

   2. Activation is driven by real mouse/pen input, not a viewport-width
      breakpoint. A width guard meant a narrow desktop window or a zoomed-in
      display fell below the breakpoint, which hid the custom cursor while
      `cursor: none` was still applied - leaving no visible cursor at all.
      Touch never activates it, and the tap-synthesized mousemove that some
      mobile browsers fire is ignored via the touch timestamp. */
(function () {
  var dot = document.getElementById('PruvCursorDot');
  var ring = document.getElementById('PruvCursorRing');

  // Fallback for any layout that doesn't render the pruv-custom-cursor snippet.
  function create(id, className) {
    var el = document.createElement('div');
    el.id = id;
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }
  if (!dot) dot = create('PruvCursorDot', 'pruv-cursor-dot');
  if (!ring) ring = create('PruvCursorRing', 'pruv-cursor-ring');

  var INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], .cursor-pointer';

  var mouseX = 0;
  var mouseY = 0;
  var ringX = 0;
  var ringY = 0;
  var active = false;
  var hovering = false;
  var lastTouch = 0;
  var frame = null;

  function place(el, x, y) {
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
  }

  function render() {
    ringX += (mouseX - ringX) * 0.2;
    ringY += (mouseY - ringY) * 0.2;
    place(ring, ringX, ringY);
    frame = requestAnimationFrame(render);
  }

  function activate(x, y) {
    if (active) return;
    active = true;
    mouseX = ringX = x;
    mouseY = ringY = y;
    place(dot, x, y);
    place(ring, x, y);
    dot.style.setProperty('display', 'block', 'important');
    ring.style.setProperty('display', 'block', 'important');
    document.documentElement.classList.add('pruv-cursor-active');
    frame = requestAnimationFrame(render);
  }

  function deactivate() {
    if (!active) return;
    active = false;
    document.documentElement.classList.remove('pruv-cursor-active');
    dot.style.setProperty('display', 'none', 'important');
    ring.style.setProperty('display', 'none', 'important');
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function onMove(event) {
    if (event.pointerType === 'touch') return;
    if (Date.now() - lastTouch < 500) return;

    activate(event.clientX, event.clientY);
    mouseX = event.clientX;
    mouseY = event.clientY;
    place(dot, mouseX, mouseY);

    var target = event.target;
    var interactive = !!(target && target.closest && target.closest(INTERACTIVE));
    if (interactive !== hovering) {
      hovering = interactive;
      ring.classList.toggle('is-hovering', interactive);
    }
  }

  window.addEventListener('pointermove', onMove, { capture: true, passive: true });
  window.addEventListener('mousemove', onMove, { capture: true, passive: true });
  window.addEventListener(
    'touchstart',
    function () {
      lastTouch = Date.now();
      deactivate();
    },
    { capture: true, passive: true }
  );
  window.addEventListener('blur', deactivate);
})();
