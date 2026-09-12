/* Prüv — GSAP open/close animation for the mobile menu drawer.

   The panel slides in from the right while scaling up from its bottom edge
   (transform-origin bottom centre), with the nav links staggering in behind
   it from the same direction.

   How this cooperates with Dawn: MenuDrawer (assets/global.js) toggles a
   `menu-opening` class on the drawer's <details>, and CSS in
   component-menu-drawer.css slides the panel in from the left with
   `transform: translateX(0)`. We mirror that class with a MutationObserver
   and drive the transform from GSAP instead - inline styles outrank the
   stylesheet, and `html.pruv-drawer-gsap` (added only when we're actually
   in control) suppresses Dawn's CSS transition so the two don't fight.

   Deliberately plain `gsap.fromTo` calls with `immediateRender: true`
   rather than a timeline: in testing, a timeline whose first step was a
   `.set()` applied that set but left the following `fromTo` unrendered, so
   the panel snapped open with no animation. Direct tweens apply their from
   state on the spot and don't depend on timeline render order.

   If GSAP failed to load, or the viewport is desktop-width, or the visitor
   prefers reduced motion, this bails out entirely and Dawn's original slide
   is left untouched. */
(function () {
  var gsap = window.gsap;
  if (!gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var details = document.querySelector('header-drawer > details.menu-drawer-container');
  if (!details) return;

  var drawer = details.querySelector('#menu-drawer') || details.querySelector('.menu-drawer');
  if (!drawer) return;

  var items = Array.prototype.slice.call(
    drawer.querySelectorAll('.menu-drawer__navigation > .menu-drawer__menu > li, .menu-drawer__utility-links > *')
  );
  var targets = [drawer].concat(items);

  // The drawer only exists below the tablet breakpoint; above it the header
  // uses its own dropdown menu and we must leave the panel alone.
  var mq = window.matchMedia('(max-width: 989px)');

  function reset() {
    gsap.killTweensOf(targets);
    gsap.set(targets, { clearProps: 'all' });
  }

  function syncBreakpoint() {
    if (mq.matches) {
      document.documentElement.classList.add('pruv-drawer-gsap');
    } else {
      document.documentElement.classList.remove('pruv-drawer-gsap');
      reset();
    }
  }

  function animateOpen() {
    if (!mq.matches) return;
    gsap.killTweensOf(targets);

    gsap.set(drawer, { visibility: 'visible', transformOrigin: '50% 100%' });

    gsap.fromTo(
      drawer,
      { xPercent: 100, scale: 0.6, opacity: 0 },
      {
        xPercent: 0,
        scale: 1,
        opacity: 1,
        duration: 0.55,
        ease: 'power3.out',
        immediateRender: true,
        overwrite: 'auto',
      }
    );

    if (items.length) {
      gsap.fromTo(
        items,
        { x: 40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.05,
          delay: 0.15,
          ease: 'power2.out',
          immediateRender: true,
          overwrite: 'auto',
        }
      );
    }
  }

  function animateClose() {
    if (!mq.matches) return;
    gsap.killTweensOf(targets);

    // Dawn's closeAnimation() strips the `open` attribute 400ms after
    // `menu-opening` is removed, so this has to finish inside that window.
    gsap.to(drawer, {
      xPercent: 100,
      scale: 0.6,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: function () {
        // Hand the closed state back to Dawn's CSS (translateX(-100%), hidden).
        reset();
      },
    });
  }

  if (mq.addEventListener) {
    mq.addEventListener('change', syncBreakpoint);
  } else if (mq.addListener) {
    mq.addListener(syncBreakpoint);
  }
  syncBreakpoint();

  var wasOpening = details.classList.contains('menu-opening');
  new MutationObserver(function () {
    var isOpening = details.classList.contains('menu-opening');
    if (isOpening === wasOpening) return;
    wasOpening = isOpening;
    if (isOpening) {
      animateOpen();
    } else {
      animateClose();
    }
  }).observe(details, { attributes: true, attributeFilter: ['class'] });
})();
