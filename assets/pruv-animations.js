document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined') return;

  var hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Hero entrance */
  var heroItems = document.querySelectorAll(
    '.pruv-hero__eyebrow, .pruv-hero__heading, .pruv-hero__subheading, .pruv-hero__buttons'
  );
  if (heroItems.length) {
    gsap.set(heroItems, { opacity: 0, y: 28 });
    gsap.to(heroItems, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.12,
      delay: 0.15,
    });
  }

  var pressBar = document.querySelector('.pruv-hero__press');
  if (pressBar) {
    gsap.set(pressBar, { opacity: 0, y: 16 });
    gsap.to(pressBar, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.55 });
  }

  /* Hero image parallax */
  var heroImage = document.querySelector('.pruv-hero__image');
  var heroVisual = document.querySelector('.pruv-hero__visual');
  if (heroImage && heroVisual && hasScrollTrigger) {
    gsap.set(heroImage, { scale: 1.12, transformOrigin: 'center center' });
    gsap.to(heroImage, {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: heroVisual,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  if (!hasScrollTrigger) return;

  /* Groups whose direct children stagger in together */
  document.querySelectorAll('[data-animate="stagger"]').forEach(function (container) {
    var items = container.children;
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: 36 });
    ScrollTrigger.create({
      trigger: container,
      start: 'top 85%',
      once: true,
      onEnter: function () {
        gsap.to(items, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08 });
      },
    });
  });

  /* Single fade-up reveals */
  document.querySelectorAll('[data-animate="fade-up"]').forEach(function (el) {
    gsap.set(el, { opacity: 0, y: 32 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: function () {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
      },
    });
  });

  /* Side reveals, used for paired columns */
  document.querySelectorAll('[data-animate="from-left"]').forEach(function (el) {
    gsap.set(el, { opacity: 0, x: -40 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: function () {
        gsap.to(el, { opacity: 1, x: 0, duration: 0.9, ease: 'power2.out' });
      },
    });
  });

  document.querySelectorAll('[data-animate="from-right"]').forEach(function (el) {
    gsap.set(el, { opacity: 0, x: 40 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: function () {
        gsap.to(el, { opacity: 1, x: 0, duration: 0.9, ease: 'power2.out' });
      },
    });
  });
});
