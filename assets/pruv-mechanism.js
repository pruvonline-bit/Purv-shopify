/**
 * Prüv Mechanism Section — GSAP ScrollTrigger Animations & Mobile Horizontal Scroll Sync
 */
document.addEventListener('DOMContentLoaded', function () {
  var sections = document.querySelectorAll('.pruv-mechanism');
  if (!sections.length) return;

  sections.forEach(function (section) {
    initMechanismSection(section);
  });

  function initMechanismSection(section) {
    var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var grid = section.querySelector('.pruv-mechanism__grid');
    var cards = section.querySelectorAll('[data-mechanism-card]');
    var dots = section.querySelectorAll('[data-mechanism-dot]');

    // Mobile Horizontal Scroll & Dot Navigation Sync
    if (grid && dots.length && cards.length) {
      function updateActiveDot() {
        var scrollLeft = grid.scrollLeft;
        var gridRect = grid.getBoundingClientRect();
        var centerPoint = gridRect.left + gridRect.width / 2;

        var closestIndex = 0;
        var minDistance = Infinity;

        cards.forEach(function (card, index) {
          var cardRect = card.getBoundingClientRect();
          var cardCenter = cardRect.left + cardRect.width / 2;
          var dist = Math.abs(centerPoint - cardCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = index;
          }
        });

        dots.forEach(function (dot, i) {
          if (i === closestIndex) {
            dot.classList.add('is-active');
            dot.setAttribute('aria-current', 'true');
          } else {
            dot.classList.remove('is-active');
            dot.removeAttribute('aria-current');
          }
        });
      }

      var scrollTimeout;
      grid.addEventListener('scroll', function () {
        if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
        scrollTimeout = requestAnimationFrame(updateActiveDot);
      }, { passive: true });

      dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
          var targetIndex = parseInt(this.getAttribute('data-mechanism-dot'), 10);
          if (cards[targetIndex]) {
            cards[targetIndex].scrollIntoView({
              behavior: 'smooth',
              inline: 'start',
              block: 'nearest'
            });
          }
        });
      });
    }

    // GSAP ScrollTrigger Animations
    if (!hasGsap || prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    // Header animation
    var header = section.querySelector('[data-mechanism-header]');
    if (header) {
      gsap.from(header.children, {
        scrollTrigger: {
          trigger: header,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 25,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }

    // Responsive Animations
    var mm = gsap.matchMedia();

    // Desktop: staggered entrance for cards
    mm.add('(min-width: 750px)', function () {
      if (cards.length) {
        gsap.from(cards, {
          scrollTrigger: {
            trigger: grid,
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 35,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
        });
      }
    });

    // Mobile: smooth container entrance to preserve smooth horizontal touch gestures
    mm.add('(max-width: 749px)', function () {
      if (grid) {
        gsap.from(grid, {
          scrollTrigger: {
            trigger: grid,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 25,
          duration: 0.75,
          ease: 'power2.out',
        });
      }

      var mobileNav = section.querySelector('[data-mechanism-nav]');
      if (mobileNav) {
        gsap.from(mobileNav, {
          scrollTrigger: {
            trigger: mobileNav,
            start: 'top 92%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
        });
      }
    });

    // Micro Summary Strip entrance
    var summary = section.querySelector('[data-mechanism-summary]');
    if (summary) {
      gsap.from(summary, {
        scrollTrigger: {
          trigger: summary,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 20,
        duration: 0.7,
        ease: 'power2.out',
      });
    }
  }
});
