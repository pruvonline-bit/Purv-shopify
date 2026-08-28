document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined') return;

  var hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Home Hero entrance */
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

  /* About Hero entrance */
  var aboutHeroElements = document.querySelectorAll(
    '.pruv-about-hero__eyebrow, .pruv-about-hero__heading, .pruv-about-hero__text'
  );
  if (aboutHeroElements.length) {
    gsap.set(aboutHeroElements, { opacity: 0, y: 32 });
    gsap.to(aboutHeroElements, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.14,
      delay: 0.15,
    });
  }

  var aboutHeroImage = document.querySelector('.pruv-about-hero__media');
  if (aboutHeroImage) {
    gsap.set(aboutHeroImage, { opacity: 0, scale: 0.96, y: 20 });
    gsap.to(aboutHeroImage, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 1,
      ease: 'power2.out',
      delay: 0.35,
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

  /* Timeline Items GSAP Scroll Animation */
  var timelineItems = document.querySelectorAll('.pruv-timeline__item');
  if (timelineItems.length) {
    timelineItems.forEach(function (item) {
      var date = item.querySelector('.pruv-timeline__date');
      var marker = item.querySelector('.pruv-timeline__marker');
      var content = item.querySelector('.pruv-timeline__content');

      if (content) gsap.set(content, { opacity: 0, y: 32, x: 16 });
      if (date) gsap.set(date, { opacity: 0, y: 20 });
      if (marker) gsap.set(marker, { opacity: 0, scale: 0.4 });

      ScrollTrigger.create({
        trigger: item,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          if (date) gsap.to(date, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
          if (marker) gsap.to(marker, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.05 });
          if (content) gsap.to(content, { opacity: 1, y: 0, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 });
        },
      });
    });
  }

  /* Team Member Cards Animation */
  var teamMembers = document.querySelectorAll('.pruv-team__member');
  if (teamMembers.length) {
    teamMembers.forEach(function (member, i) {
      var photo = member.querySelector('.pruv-team__photo');
      var info = member.querySelectorAll('.pruv-team__name, .pruv-team__role');

      if (photo) gsap.set(photo, { opacity: 0, scale: 0.92, y: 24 });
      if (info.length) gsap.set(info, { opacity: 0, y: 16 });

      ScrollTrigger.create({
        trigger: member,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          if (photo) {
            gsap.to(photo, {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.8,
              ease: 'power3.out',
              delay: (i % 4) * 0.1,
            });
          }
          if (info.length) {
            gsap.to(info, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
              stagger: 0.06,
              delay: (i % 4) * 0.1 + 0.2,
            });
          }
        },
      });
    });
  }

  /* Groups whose direct children stagger in together */
  document.querySelectorAll('[data-animate="stagger"]').forEach(function (container) {
    if (container.classList.contains('pruv-timeline__list') || container.classList.contains('pruv-team__grid')) {
      return; // Handled specifically above for higher polish
    }
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

  /* Side reveals, used for paired columns (e.g. story splits) */
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

  /* Collection Grid Items Stagger Entrance */
  var collectionGridItems = document.querySelectorAll('.product-grid .grid__item');
  if (collectionGridItems.length && hasScrollTrigger) {
    collectionGridItems.forEach(function (item, i) {
      gsap.set(item, { opacity: 0, y: 28 });
      ScrollTrigger.create({
        trigger: item,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            delay: (i % 4) * 0.08,
          });
        },
      });
    });
  }
});
