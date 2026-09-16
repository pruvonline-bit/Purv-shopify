/* Prüv — GSAP hover fill for buttons.

   Opt in by putting `data-pruv-fill` on a button or link. A copper disc is
   injected behind the label and grows from wherever the pointer entered, so
   the fill follows the hand rather than always wiping the same way. Keyboard
   focus fills from the centre, so the effect is not mouse-only.

   The disc is sized to the button's diagonal, which is what guarantees it
   covers the corners from any entry point, and it is a plain scale tween - no
   clip-path, so nothing depends on how a browser interpolates shapes.

   Buttons keep their CSS hover colours as the no-JS fallback. `html` gets
   `pruv-fill-ready` once this runs, and the stylesheet uses that to hand the
   background over to the disc instead. */
(function () {
  var SELECTOR = '[data-pruv-fill]';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function enhance(el) {
    if (el.dataset.pruvFillReady === 'true') return;
    var gsap = window.gsap;
    if (!gsap) return;
    el.dataset.pruvFillReady = 'true';

    // A span, not a div: Dawn's base.css hides every empty div.
    var fill = document.createElement('span');
    fill.className = 'pruv-fill';
    fill.setAttribute('aria-hidden', 'true');
    el.insertBefore(fill, el.firstChild);

    var size = 0;

    function place(event) {
      var box = el.getBoundingClientRect();
      size = Math.hypot(box.width, box.height) * 1.2;
      var x = event ? event.clientX - box.left : box.width / 2;
      var y = event ? event.clientY - box.top : box.height / 2;
      fill.style.width = size + 'px';
      fill.style.height = size + 'px';
      fill.style.left = x - size / 2 + 'px';
      fill.style.top = y - size / 2 + 'px';
    }

    function grow(event) {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
      place(event);
      gsap.killTweensOf(fill);
      if (reduced) {
        gsap.set(fill, { scale: 1, opacity: 1 });
        return;
      }
      gsap.fromTo(
        fill,
        { scale: 0, opacity: 1 },
        { scale: 1, duration: 0.5, ease: 'power3.out', overwrite: true }
      );
    }

    function shrink() {
      gsap.killTweensOf(fill);
      if (reduced) {
        gsap.set(fill, { scale: 0 });
        return;
      }
      gsap.to(fill, { scale: 0, duration: 0.35, ease: 'power3.inOut', overwrite: true });
    }

    // pointerenter/leave rather than mouseover: no bubbling from the label, and
    // a touch tap gets the fill once without it sticking afterwards.
    el.addEventListener('pointerenter', grow);
    el.addEventListener('pointerleave', shrink);
    el.addEventListener('focus', function () {
      if (el.matches(':focus-visible')) grow(null);
    });
    el.addEventListener('blur', shrink);
  }

  function enhanceAll(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(SELECTOR), enhance);
    document.documentElement.classList.add('pruv-fill-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      enhanceAll();
    });
  } else {
    enhanceAll();
  }

  // Sections re-render in the theme editor, and carts/quick-adds inject buttons.
  document.addEventListener('shopify:section:load', function (event) {
    enhanceAll(event.target);
  });
  document.addEventListener('pruv:fill:refresh', function (event) {
    enhanceAll(event.target === document ? document : event.target);
  });
})();
