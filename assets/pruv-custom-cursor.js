/* Prüv — custom cursor behavior: dot tracks the pointer, ring eases after it.

   Two things here are deliberate:

   1. Visibility is toggled with the `is-active` class, not an inline style.
      These are empty divs, and Dawn's base.css carries `a:empty, ul:empty,
      div:empty, section:empty, ... { display: none }` - a 0-1-1 selector that
      beats a lone `.pruv-cursor-dot` at 0-1-0, which is why the cursor was
      invisible. `.pruv-cursor-dot.is-active` in pruv-custom-cursor.css is
      0-2-0 and outranks it, so no inline write and no !important are needed.

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
    dot.classList.add('is-active');
    ring.classList.add('is-active');
    document.documentElement.classList.add('pruv-cursor-active');
    frame = requestAnimationFrame(render);
  }

  function deactivate() {
    if (!active) return;
    active = false;
    document.documentElement.classList.remove('pruv-cursor-active');
    dot.classList.remove('is-active');
    ring.classList.remove('is-active');
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
