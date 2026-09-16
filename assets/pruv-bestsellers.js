/* Prüv — Bestsellers: product loading animation + carousel.

   Two things live here.

   Loading. Cards start hidden and rise into place in sequence once the section
   scrolls into view, and each product image fades up out of a shimmer as it
   finishes loading. The initial hidden state is set from JS, never CSS, so
   without JavaScript (or with GSAP missing) every card is simply visible.

   Carousel. Below the desktop breakpoint the track is a native scroll-snap
   strip: touch drag, momentum and keyboard scrolling come free from the
   browser, which is why the old pointer-drag handler is gone. This script only
   keeps the dots in sync and scrolls on a dot click. At 990px and up the track
   is a grid, so the dots are hidden and nothing here scrolls. */
(function () {
  var DESKTOP = '(min-width: 990px)';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function init(section) {
    if (section.dataset.pruvBestsellersReady === 'true') return;
    section.dataset.pruvBestsellersReady = 'true';

    var track = section.querySelector('[data-pruv-bs-track]');
    var slides = toArray(section.querySelectorAll('[data-pruv-bs-slide]'));
    var dots = toArray(section.querySelectorAll('[data-pruv-bs-dot]'));
    if (!track || !slides.length) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var animate = !!gsap && !reduced;
    var mq = window.matchMedia(DESKTOP);

    section.classList.add('pruv-bestsellers--live');

    /* ---- loading ---------------------------------------------------------- */

    if (animate) {
      gsap.set(slides, { opacity: 0, y: 28 });

      var reveal = function () {
        gsap.to(slides, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.09,
          clearProps: 'transform',
        });
      };

      if (ScrollTrigger) {
        ScrollTrigger.create({ trigger: section, start: 'top 85%', once: true, onEnter: reveal });
      } else {
        reveal();
      }

      // Each image fades up as it arrives, so a slow connection shows a shimmer
      // rather than a hole in the card.
      toArray(section.querySelectorAll('[data-pruv-bs-media]')).forEach(function (media) {
        var img = media.querySelector('img');
        if (!img) return;

        var show = function () {
          media.classList.remove('is-loading');
          gsap.to(img, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out', clearProps: 'opacity,transform' });
        };

        if (img.complete && img.naturalWidth) return;
        media.classList.add('is-loading');
        gsap.set(img, { opacity: 0, scale: 0.94 });
        img.addEventListener('load', show, { once: true });
        // A broken image must not leave the card stuck behind a shimmer.
        img.addEventListener('error', show, { once: true });
      });
    }

    /* ---- carousel --------------------------------------------------------- */

    var step = 0;
    var pages = 1;

    function measure() {
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 0;
      step = slides[0].getBoundingClientRect().width + gap;
      // How many fit at once, and therefore how many scroll positions exist.
      var perView = step > 0 ? Math.max(1, Math.round((track.clientWidth + gap) / step)) : 1;
      pages = Math.max(1, slides.length - perView + 1);

      dots.forEach(function (dot, i) {
        dot.hidden = mq.matches || i >= pages;
      });
    }

    function syncDots() {
      if (mq.matches || step <= 0) return;
      var index = Math.max(0, Math.min(Math.round(track.scrollLeft / step), pages - 1));
      dots.forEach(function (dot, i) {
        dot.classList.toggle('pruv-bestsellers__dot--active', i === index);
        dot.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        track.scrollTo({ left: i * step, behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    var ticking = false;
    track.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          syncDots();
        });
      },
      { passive: true }
    );

    function resync() {
      measure();
      syncDots();
    }

    if (mq.addEventListener) {
      mq.addEventListener('change', resync);
    } else if (mq.addListener) {
      mq.addListener(resync);
    }
    window.addEventListener('resize', resync);
    window.addEventListener('load', resync);
    resync();
  }

  function initAll() {
    toArray(document.querySelectorAll('[data-pruv-bestsellers]')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector
      ? event.target.querySelector('[data-pruv-bestsellers]')
      : null;
    if (section) init(section);
  });
})();
