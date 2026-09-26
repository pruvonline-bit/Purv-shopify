/**
 * Prüv Product Proof — Interactive Comparison Slider, Lens Tabs & GSAP ScrollTrigger
 */
document.addEventListener('DOMContentLoaded', function () {
  var sections = document.querySelectorAll('[data-pruv-pproof]');
  if (!sections.length) return;

  sections.forEach(function (section) {
    initProductProofSection(section);
  });

  function initProductProofSection(section) {
    var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Tab Lens Switcher
    var tabs = section.querySelectorAll('.pruv-pproof__tab');
    var panels = section.querySelectorAll('.pruv-pproof__panel');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetId = tab.getAttribute('data-tab-target');

        tabs.forEach(function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        panels.forEach(function (panel) {
          if (panel.getAttribute('data-panel') === targetId) {
            panel.classList.add('is-active');
            if (hasGsap && !prefersReducedMotion) {
              gsap.fromTo(
                panel,
                { opacity: 0, y: 14 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
              );
            }
          } else {
            panel.classList.remove('is-active');
          }
        });
      });
    });

    // 2. Interactive Before/After Slider
    var compareVisual = section.querySelector('[data-pproof-slider-frame]');
    var handle = section.querySelector('[data-pproof-handle]');
    var beforeLayer = section.querySelector('[data-pproof-before-layer]');

    if (compareVisual && handle && beforeLayer) {
      var isDragging = false;
      var currentPos = 50;

      function updateSlider(percent, animate) {
        percent = Math.max(0, Math.min(100, percent));
        currentPos = percent;
        compareVisual.style.setProperty('--slider-pos', percent + '%');
        handle.setAttribute('aria-valuenow', Math.round(percent));
      }

      function getPercentFromEvent(e) {
        var rect = compareVisual.getBoundingClientRect();
        var clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
        }
        var x = clientX - rect.left;
        var p = (x / rect.width) * 100;
        return p;
      }

      // Pointer / Mouse events
      function onPointerMove(e) {
        if (!isDragging) return;
        var p = getPercentFromEvent(e);
        updateSlider(p, false);
      }

      function onPointerUp() {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
      }

      compareVisual.addEventListener('pointerdown', function (e) {
        isDragging = true;
        var p = getPercentFromEvent(e);
        updateSlider(p, false);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });

      compareVisual.addEventListener('touchstart', function (e) {
        isDragging = true;
        var p = getPercentFromEvent(e);
        updateSlider(p, false);
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('touchend', onPointerUp);
      }, { passive: true });

      // Keyboard accessibility
      handle.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          updateSlider(currentPos - 5, false);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          updateSlider(currentPos + 5, false);
        }
      });

      // Teaser peek sweep on scroll into view
      if (hasGsap && !prefersReducedMotion) {
        var dummyObj = { pos: 50 };
        ScrollTrigger.create({
          trigger: compareVisual,
          start: 'top 75%',
          once: true,
          onEnter: function () {
            gsap.timeline({ delay: 0.3 })
              .to(dummyObj, {
                pos: 38,
                duration: 0.7,
                ease: 'power2.inOut',
                onUpdate: function () {
                  updateSlider(dummyObj.pos, false);
                },
              })
              .to(dummyObj, {
                pos: 62,
                duration: 0.9,
                ease: 'power2.inOut',
                onUpdate: function () {
                  updateSlider(dummyObj.pos, false);
                },
              })
              .to(dummyObj, {
                pos: 50,
                duration: 0.6,
                ease: 'power2.out',
                onUpdate: function () {
                  updateSlider(dummyObj.pos, false);
                },
              });
          },
        });
      }
    }

    // 3. GSAP ScrollTrigger Animations
    if (hasGsap && !prefersReducedMotion) {
      gsap.registerPlugin(ScrollTrigger);

      // Header entrance
      var header = section.querySelector('[data-pproof-header]');
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

      // Stats row entrance
      var statCols = section.querySelectorAll('.pruv-pproof__stat-col');
      var statStrip = section.querySelector('[data-pproof-stats]');
      if (statStrip && statCols.length) {
        gsap.from(statCols, {
          scrollTrigger: {
            trigger: statStrip,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 25,
          duration: 0.75,
          stagger: 0.1,
          ease: 'power2.out',
        });
      }
    }
  }
});
