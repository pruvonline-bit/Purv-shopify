/**
 * Prüv Outcome Section — GSAP ScrollTrigger & Interactive Stepper
 */
document.addEventListener('DOMContentLoaded', function () {
  var sections = document.querySelectorAll('.pruv-outcome');
  if (!sections.length) return;

  sections.forEach(function (section) {
    initOutcomeSection(section);
  });

  function initOutcomeSection(section) {
    var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Stepper and Phase Card Interaction
    var stepBtns = section.querySelectorAll('[data-phase-target]');
    var phaseCards = section.querySelectorAll('[data-phase-card]');
    var railFill = section.querySelector('[data-timeline-fill]');

    function setActivePhase(index, smoothScroll) {
      stepBtns.forEach(function (btn) {
        var targetIndex = parseInt(btn.getAttribute('data-phase-target'), 10);
        if (targetIndex === index) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-selected', 'false');
        }
      });

      phaseCards.forEach(function (card) {
        var cardIndex = parseInt(card.getAttribute('data-phase-card'), 10);
        if (cardIndex === index) {
          card.classList.add('is-active');
          if (smoothScroll && window.innerWidth < 990) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else {
          card.classList.remove('is-active');
        }
      });

      if (railFill) {
        var percentages = ['33.33%', '66.66%', '100%'];
        if (hasGsap && !prefersReducedMotion) {
          gsap.to(railFill, { width: percentages[index], duration: 0.4, ease: 'power2.out' });
        } else {
          railFill.style.width = percentages[index];
        }
      }
    }

    stepBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = parseInt(this.getAttribute('data-phase-target'), 10);
        setActivePhase(target, true);
      });

      btn.addEventListener('mouseenter', function () {
        var target = parseInt(this.getAttribute('data-phase-target'), 10);
        if (phaseCards[target]) {
          phaseCards[target].classList.add('is-hovered');
        }
      });

      btn.addEventListener('mouseleave', function () {
        var target = parseInt(this.getAttribute('data-phase-target'), 10);
        if (phaseCards[target]) {
          phaseCards[target].classList.remove('is-hovered');
        }
      });
    });

    phaseCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var target = parseInt(this.getAttribute('data-phase-card'), 10);
        setActivePhase(target, false);
      });
    });

    // GSAP ScrollTrigger Animations
    if (hasGsap && !prefersReducedMotion) {
      gsap.registerPlugin(ScrollTrigger);

      // Header entrance
      var header = section.querySelector('[data-outcome-header]');
      if (header) {
        gsap.from(header.children, {
          scrollTrigger: {
            trigger: header,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
        });
      }

      // 2-Column Cards Entrance
      var colCards = section.querySelectorAll('[data-outcome-card]');
      if (colCards.length) {
        gsap.from(colCards, {
          scrollTrigger: {
            trigger: section.querySelector('.pruv-outcome__grid'),
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 40,
          duration: 0.85,
          stagger: 0.18,
          ease: 'power3.out',
        });
      }

      // Timeline Wrap Entrance & Scroll-driven progress
      var timelineWrap = section.querySelector('[data-outcome-timeline]');
      if (timelineWrap) {
        gsap.from(timelineWrap, {
          scrollTrigger: {
            trigger: timelineWrap,
            start: 'top 82%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 35,
          duration: 0.9,
          ease: 'power3.out',
        });

        // Timeline Progress Auto-Fill on Scroll
        ScrollTrigger.create({
          trigger: timelineWrap,
          start: 'top 60%',
          end: 'bottom 80%',
          onEnter: function () {
            setActivePhase(1, false);
          },
          onEnterBack: function () {
            setActivePhase(1, false);
          },
        });

        ScrollTrigger.create({
          trigger: timelineWrap,
          start: 'top 40%',
          end: 'bottom 60%',
          onEnter: function () {
            setActivePhase(2, false);
          },
        });
      }

      // Assurance footer strip entrance
      var assurance = section.querySelector('[data-outcome-assurance]');
      if (assurance) {
        gsap.from(assurance, {
          scrollTrigger: {
            trigger: assurance,
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
  }
});
