/* Prüv — Proof and results.

   The before/after card. The after photo is the base layer and the before photo
   is clipped over it by a single clip-path driven from one custom property, so
   dragging moves one value and triggers no layout at all. Pointer events with
   pointer capture keep the drag alive outside the card, and the same control is
   a real ARIA slider, so arrow keys work and screen readers get a value rather
   than a mystery button.

   The follow is smoothed through GSAP's quickTo (about 0.18s of power3.out)
   rather than pinned to the cursor: close enough to feel direct, eased enough
   to feel expensive. Without GSAP it snaps straight to the pointer instead.

   A word on honesty. The teaser sweep that plays once on scroll always returns
   to the configured starting split, the parallax moves both photos with one
   tween so the pair can never drift out of alignment, and nothing here can
   crop, scale or filter one photo differently from the other. */
(function () {
  var DESKTOP = '(min-width: 990px)';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function initCompare(figure, onFirstDrag) {
    var frame = figure.querySelector('[data-pruv-compare-frame]');
    var handle = figure.querySelector('[data-pruv-compare-handle]');
    var layers = toArray(figure.querySelectorAll('.pruv-proof__case-layer'));
    var tagBefore = figure.querySelector('[data-pruv-compare-tag="before"]');
    var tagAfter = figure.querySelector('[data-pruv-compare-tag="after"]');
    if (!frame || !handle) return;

    var gsap = window.gsap;
    var start = clamp(parseFloat(figure.getAttribute('data-start')) || 50, 0, 100);
    var state = { pos: start };
    var labelBefore = tagBefore ? tagBefore.textContent.trim() : 'before';
    var touched = false;

    function paint() {
      var pos = clamp(state.pos, 0, 100);
      figure.style.setProperty('--pruv-compare-pos', pos + '%');
      handle.setAttribute('aria-valuenow', Math.round(pos));
      handle.setAttribute('aria-valuetext', Math.round(pos) + '% ' + labelBefore);
      // Each label steps out of the divider's way as it arrives.
      if (tagBefore) tagBefore.style.opacity = clamp((pos - 6) / 12, 0, 1);
      if (tagAfter) tagAfter.style.opacity = clamp((94 - pos) / 12, 0, 1);
    }

    var follow = gsap
      ? gsap.quickTo(state, 'pos', { duration: 0.18, ease: 'power3.out', onUpdate: paint })
      : null;

    function set(pos, immediate) {
      pos = clamp(pos, 0, 100);
      if (follow && !immediate && !reduced) {
        follow(pos);
        return;
      }
      if (gsap) gsap.killTweensOf(state);
      state.pos = pos;
      paint();
    }

    function fromEvent(event) {
      var box = frame.getBoundingClientRect();
      if (!box.width) return;
      set(((event.clientX - box.left) / box.width) * 100);
    }

    function markTouched() {
      if (touched) return;
      touched = true;
      // The teaser must never fight the hand that just took over.
      if (gsap) gsap.killTweensOf(state);
      figure.setAttribute('data-touched', 'true');
      if (onFirstDrag) onFirstDrag();
    }

    var dragging = false;

    frame.addEventListener('pointerdown', function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      markTouched();
      figure.classList.add('is-dragging');
      // Capture on the frame: the drag survives the pointer leaving the card,
      // which is what stops the divider sticking mid-sweep.
      if (frame.setPointerCapture) {
        try {
          frame.setPointerCapture(event.pointerId);
        } catch (e) {}
      }
      if (gsap && !reduced) gsap.to(handle, { scale: 1.12, duration: 0.25, ease: 'power3.out' });
      fromEvent(event);
    });

    frame.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      fromEvent(event);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      figure.classList.remove('is-dragging');
      if (gsap && !reduced) gsap.to(handle, { scale: 1, duration: 0.35, ease: 'power3.out' });
    }

    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
    frame.addEventListener('lostpointercapture', endDrag);

    handle.addEventListener('keydown', function (event) {
      var step = 0;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          step = -2;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          step = 2;
          break;
        case 'PageDown':
          step = -10;
          break;
        case 'PageUp':
          step = 10;
          break;
        case 'Home':
          event.preventDefault();
          markTouched();
          set(0);
          return;
        case 'End':
          event.preventDefault();
          markTouched();
          set(100);
          return;
        default:
          return;
      }
      event.preventDefault();
      markTouched();
      set(state.pos + step);
    });

    // A click on the handle itself would otherwise jump the divider to the
    // handle's own centre after a keyboard user moved it.
    handle.addEventListener('click', function (event) {
      event.preventDefault();
    });

    paint();

    return {
      figure: figure,
      layers: layers,
      handle: handle,
      state: state,
      isTouched: function () {
        return touched;
      },
      // Delayed per card so a row of three sweeps as a cascade rather than
      // three dividers moving in lockstep. The touched check runs when the
      // sweep actually starts, not when it was scheduled, so a card grabbed
      // during the wait is simply left alone.
      teaser: function (delay) {
        if (!gsap || reduced) return;

        function play() {
          if (touched) return;
          // Show the interaction, then hand the card back exactly as configured.
          var tl = gsap.timeline();
          tl.to(state, { pos: clamp(start + 16, 0, 100), duration: 0.7, ease: 'power2.inOut', onUpdate: paint })
            .to(state, { pos: clamp(start - 16, 0, 100), duration: 0.9, ease: 'power2.inOut', onUpdate: paint })
            .to(state, { pos: start, duration: 0.6, ease: 'power2.inOut', onUpdate: paint })
            .fromTo(
              handle,
              { boxShadow: '0 0 0 0 rgba(184, 115, 51, 0.5)' },
              { boxShadow: '0 0 0 14px rgba(184, 115, 51, 0)', duration: 1.1, ease: 'power2.out', clearProps: 'boxShadow' },
              0
            );
        }

        if (delay) {
          gsap.delayedCall(delay, play);
        } else {
          play();
        }
      },
    };
  }

  function init(section) {
    if (section.dataset.pruvProofReady === 'true') return;
    section.dataset.pruvProofReady = 'true';

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var animate = !!gsap && !reduced;
    var hint = section.querySelector('[data-pruv-proof-hint]');

    section.classList.add('pruv-proof--live');

    function hideHint() {
      if (!hint || hint.dataset.done === 'true') return;
      hint.dataset.done = 'true';
      if (!animate) {
        hint.hidden = true;
        return;
      }
      gsap.to(hint, {
        opacity: 0,
        y: -6,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: function () {
          hint.hidden = true;
        },
      });
    }

    var cases = toArray(section.querySelectorAll('[data-pruv-compare]'))
      .map(function (figure) {
        return initCompare(figure, hideHint);
      })
      .filter(Boolean);

    if (!animate) return;

    /* ---- entrances ------------------------------------------------------- */

    function reveal(targets, vars) {
      if (!targets.length) return;
      gsap.set(targets, { opacity: 0, y: vars.y || 24 });
      var run = function () {
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: vars.duration || 0.75,
          ease: 'power3.out',
          stagger: vars.stagger || 0,
          clearProps: 'transform',
          onComplete: vars.onComplete,
        });
      };
      if (ScrollTrigger) {
        ScrollTrigger.create({ trigger: vars.trigger || targets[0], start: 'top 85%', once: true, onEnter: run });
      } else {
        run();
      }
    }

    var header = section.querySelector('[data-pruv-proof-header]');
    if (header) reveal([header], { y: 28 });

    reveal(toArray(section.querySelectorAll('[data-pruv-proof-reveal]')), { y: 18 });

    cases.forEach(function (item, index) {
      gsap.set(item.figure, { opacity: 0, y: 34, scale: 0.985 });
      var run = function () {
        gsap.to(item.figure, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: 'power3.out',
          delay: index * 0.12,
          clearProps: 'transform',
          onComplete: function () {
            item.teaser(index * 0.28);
          },
        });
      };
      if (ScrollTrigger) {
        ScrollTrigger.create({ trigger: item.figure, start: 'top 82%', once: true, onEnter: run });
      } else {
        run();
      }
    });

    reveal(toArray(section.querySelectorAll('[data-pruv-proof-day]')), {
      y: 26,
      stagger: 0.08,
      trigger: section.querySelector('[data-pruv-proof-diary]'),
    });

    reveal(toArray(section.querySelectorAll('[data-pruv-proof-tile]')), {
      y: 30,
      stagger: 0.07,
      trigger: section.querySelector('[data-pruv-proof-wall]'),
    });

    /* ---- depth ------------------------------------------------------------
       Both photos move on one tween. Animating them separately - or only the
       base layer - would slide the pair out of register and quietly turn an
       honest comparison into a misleading one. */

    if (ScrollTrigger && window.matchMedia(DESKTOP).matches) {
      cases.forEach(function (item) {
        if (!item.layers.length) return;
        gsap.to(item.layers, {
          yPercent: -3,
          ease: 'none',
          scrollTrigger: {
            trigger: item.figure,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      });
    }
  }

  function initAll() {
    toArray(document.querySelectorAll('[data-pruv-proof]')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector ? event.target.querySelector('[data-pruv-proof]') : null;
    if (section) init(section);
  });
})();
