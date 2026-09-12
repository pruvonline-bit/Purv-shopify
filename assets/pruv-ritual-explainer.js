/* Prüv — Ritual Explainer behaviour.

   Desktop: the section's tall spacer is scrubbed by ScrollTrigger, and scroll
   progress through it selects which phase is open while the stage stays stuck
   to the viewport. Narrow screens drop the scroll-through entirely (sticky
   scroll-jacking reads badly on a phone) and behave as a tap accordion.

   The step heads are real buttons in the markup, so clicking or tabbing to a
   phase works in both modes. On desktop a click scrolls to that phase's slice
   of the spacer rather than just setting the class - otherwise the next scroll
   frame would immediately overwrite it.

   `pruv-ritual--live` is added only once this is running, and the stylesheet
   hangs every scroll-dependent rule off it, so a missing GSAP or a JS error
   leaves a plain expanded list rather than a stack of collapsed panels. */
(function () {
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap) return;

  if (ScrollTrigger && gsap.registerPlugin) {
    gsap.registerPlugin(ScrollTrigger);
  }

  var DESKTOP = '(min-width: 750px)';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(section) {
    if (section.dataset.pruvRitualReady === 'true') return;
    section.dataset.pruvRitualReady = 'true';

    var scrollEl = section.querySelector('[data-pruv-ritual-scroll]');
    var steps = Array.prototype.slice.call(section.querySelectorAll('[data-pruv-ritual-step]'));
    if (!scrollEl || !steps.length) return;

    var stepsList = section.querySelector('[data-pruv-ritual-steps]');
    var rail = section.querySelector('.pruv-ritual__rail');
    var fill = section.querySelector('[data-pruv-ritual-fill]');
    var marker = section.querySelector('[data-pruv-ritual-marker]');
    var panels = steps.map(function (step) {
      return step.querySelector('[data-pruv-ritual-panel]');
    });

    // Reduced motion keeps the static, fully-expanded list.
    if (reduced) return;

    section.classList.add('pruv-ritual--live');

    var current = 0;
    var trigger = null;

    // Aligns the rail to the node column, measured rather than hard-coded so
    // it holds up across breakpoints, font sizes and zoom.
    function syncRailX() {
      if (!rail || !stepsList) return;
      var node = steps[0].querySelector('[data-pruv-ritual-node]');
      if (!node) return;
      var listBox = stepsList.getBoundingClientRect();
      var nodeBox = node.getBoundingClientRect();
      rail.style.left = nodeBox.left + nodeBox.width / 2 - listBox.left + 'px';
    }

    function syncRail() {
      if (!rail || !fill || !marker) return;
      var node = steps[current].querySelector('[data-pruv-ritual-node]');
      if (!node) return;
      var railBox = rail.getBoundingClientRect();
      var nodeBox = node.getBoundingClientRect();
      var y = Math.max(0, nodeBox.top + nodeBox.height / 2 - railBox.top);
      fill.style.height = y + 'px';
      marker.style.top = y + 'px';
    }

    function setActive(index) {
      index = Math.max(0, Math.min(steps.length - 1, index));
      if (index === current) return;
      current = index;

      steps.forEach(function (step, i) {
        var on = i === index;
        var panel = panels[i];
        step.classList.toggle('is-active', on);
        var button = step.querySelector('[data-pruv-ritual-trigger]');
        if (button) button.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (!panel) return;
        gsap.killTweensOf(panel);
        gsap.to(panel, {
          height: on ? 'auto' : 0,
          duration: on ? 0.55 : 0.4,
          ease: 'power3.out',
          // The rail follows the live node position while rows resize.
          onUpdate: syncRail,
          onComplete: syncRail,
        });
      });

      syncRail();
    }

    // Open the first phase without animating in.
    steps.forEach(function (step, i) {
      if (panels[i]) gsap.set(panels[i], { height: i === 0 ? 'auto' : 0 });
      step.classList.toggle('is-active', i === 0);
    });
    syncRailX();
    syncRail();

    function scrollToStep(index) {
      var range = scrollEl.offsetHeight - window.innerHeight;
      if (range <= 0) return;
      var top = scrollEl.getBoundingClientRect().top + window.scrollY;
      var ratio = (index + 0.5) / steps.length;
      window.scrollTo({ top: top + range * ratio, behavior: 'smooth' });
    }

    steps.forEach(function (step, i) {
      var button = step.querySelector('[data-pruv-ritual-trigger]');
      if (!button) return;
      button.addEventListener('click', function () {
        if (trigger) {
          scrollToStep(i);
        } else {
          setActive(i);
        }
      });
    });

    function buildTrigger() {
      if (trigger || !ScrollTrigger) return;
      trigger = ScrollTrigger.create({
        trigger: scrollEl,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          setActive(Math.floor(self.progress * steps.length));
        },
      });
    }

    function killTrigger() {
      if (!trigger) return;
      trigger.kill();
      trigger = null;
    }

    var mq = window.matchMedia(DESKTOP);
    function syncMode() {
      if (mq.matches) {
        buildTrigger();
      } else {
        killTrigger();
      }
      syncRailX();
      syncRail();
    }

    if (mq.addEventListener) {
      mq.addEventListener('change', syncMode);
    } else if (mq.addListener) {
      mq.addListener(syncMode);
    }
    syncMode();

    window.addEventListener('resize', function () {
      syncRailX();
      syncRail();
    });
  }

  function initAll() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pruv-ritual]'), init);
  }

  initAll();

  // The theme editor re-renders sections in place.
  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector
      ? event.target.querySelector('[data-pruv-ritual]')
      : null;
    if (section) init(section);
  });
})();
