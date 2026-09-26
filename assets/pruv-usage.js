/**
 * Prüv Product Usage Section — GSAP ScrollTrigger Bento & Routine Animations
 */
document.addEventListener('DOMContentLoaded', function () {
  var sections = document.querySelectorAll('.pruv-usage');
  if (!sections.length) return;

  sections.forEach(function (section) {
    initUsageSection(section);
  });

  function initUsageSection(section) {
    var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!hasGsap || prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    // 1. Header Entrance
    var header = section.querySelector('[data-usage-header]');
    if (header) {
      gsap.from(header.children, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 28,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
      });
    }

    // 2. Bento Grid Tiles Stagger Entrance
    var bentoGrid = section.querySelector('.pruv-usage__bento');
    var tiles = section.querySelectorAll('[data-usage-tile]');
    if (bentoGrid && tiles.length) {
      gsap.from(tiles, {
        scrollTrigger: {
          trigger: bentoGrid,
          start: 'top 82%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 35,
        duration: 0.85,
        stagger: 0.14,
        ease: 'power3.out',
      });

      // Animate dose pipette liquid level on reveal
      var doseFill = section.querySelector('.pruv-usage__dose-fill');
      if (doseFill) {
        gsap.from(doseFill, {
          scrollTrigger: {
            trigger: doseFill,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          scaleY: 0,
          transformOrigin: 'bottom center',
          duration: 1.1,
          ease: 'power2.out',
          delay: 0.2,
        });
      }
    }
  }
});

