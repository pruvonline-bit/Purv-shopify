/* Prüv — GSAP open/close animation for the mobile menu drawer.

   The panel is revealed by an ellipse anchored just above the top centre of
   the screen, growing from zero height until it overflows the viewport - the
   graphite overlay reads as spilling down from the top. The links then swing
   up into place from below with a slight rotation, staggered, each masked by
   its own overflow-hidden anchor.

   How this cooperates with Dawn: MenuDrawer (assets/global.js) toggles a
   `menu-opening` class on the drawer's <details>, and CSS in
   component-menu-drawer.css slides the panel in with `translateX`. We mirror
   that class with a MutationObserver and drive clip-path from GSAP instead -
   inline styles outrank the stylesheet, and `html.pruv-drawer-gsap` (added
   only when we're actually in control) is what switches the panel to its
   full-screen overlay layout in component-pruv-drawer.css and suppresses
   Dawn's transition so the two don't fight.

   Deliberately plain `gsap.fromTo` calls with `immediateRender: true` rather
   than a timeline: in testing, a timeline whose first step was a `.set()`
   applied that set but left the following `fromTo` unrendered, so the panel
   snapped open with no animation.

   If GSAP failed to load, or the viewport is desktop-width, or the visitor
   prefers reduced motion, this bails out entirely - `pruv-drawer-gsap` is
   never added, so Dawn's original panel and slide are left untouched. */
(function () {
  var gsap = window.gsap;
  if (!gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var details = document.querySelector('header-drawer > details.menu-drawer-container');
  if (!details) return;

  var drawer = details.querySelector('#menu-drawer') || details.querySelector('.menu-drawer');
  if (!drawer) return;

  var CLIP_CLOSED = 'ellipse(75% 0% at 50% -5%)';
  var CLIP_OPEN = 'ellipse(110% 150% at 50% -5%)';

  var reveals = Array.prototype.slice.call(drawer.querySelectorAll('.pruv-drawer__link-reveal'));
  var utility = drawer.querySelector('.menu-drawer__utility-links');
  var targets = [drawer].concat(reveals);
  if (utility) targets.push(utility);

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

    gsap.set(drawer, { visibility: 'visible' });

    gsap.fromTo(
      drawer,
      { clipPath: CLIP_CLOSED },
      {
        clipPath: CLIP_OPEN,
        duration: 0.8,
        ease: 'power3.inOut',
        immediateRender: true,
        overwrite: 'auto',
      }
    );

    if (reveals.length) {
      gsap.fromTo(
        reveals,
        { yPercent: 165, rotate: 4 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 0.7,
          stagger: 0.06,
          delay: 0.18,
          ease: 'power3.out',
          immediateRender: true,
          overwrite: 'auto',
        }
      );
    }

    if (utility) {
      gsap.fromTo(
        utility,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          delay: 0.45,
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
      clipPath: CLIP_CLOSED,
      duration: 0.32,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: function () {
        // Hand the closed state back to CSS.
        reset();
      },
    });

    if (reveals.length) {
      gsap.to(reveals, {
        yPercent: 165,
        rotate: 4,
        duration: 0.22,
        stagger: { each: 0.03, from: 'end' },
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: function () {
          // Cleared here rather than leaning on the panel tween's reset():
          // clearProps issued from inside another tween's callback left the
          // last rendered offsets behind on these.
          gsap.set(reveals, { clearProps: 'all' });
        },
      });
    }
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
