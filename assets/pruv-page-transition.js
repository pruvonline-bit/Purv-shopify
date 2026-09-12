/* Prüv — page transition driver.

   Two halves, one per document:

   - Arriving. The overlay is already covering (the snippet's inline script put
     it there before first paint). This releases it and sweeps it off screen.
   - Leaving. A click on an internal link is held, the panel sweeps in to cover,
     and only then does the navigation actually start. The next document picks
     the panel up mid-sweep, so the two halves read as one gesture.

   The animation itself is CSS; this file only moves `data-state` along and owns
   the timing of the navigation. Anything it cannot vouch for - no clip-path,
   reduced motion, a link it does not recognise as an in-site page change - is
   handed straight back to the browser untouched. */
(function () {
  var FLAG = 'pruv:pt';
  var STALL_MS = 4000;

  var overlay = document.querySelector('[data-pruv-page-transition]');
  if (!overlay) return;

  /* Timings come from the stylesheet. The two variants take different lengths
     of time - the columns include their stagger - and which one is live is a
     media query's decision, so reading it back is the only way the navigation
     stays in step with whatever is actually on screen. Read per use rather
     than cached: a resize across the breakpoint changes the answer. */
  function duration(name, fallback) {
    var raw = getComputedStyle(overlay).getPropertyValue(name).trim();
    var value = parseFloat(raw);
    if (!raw || !isFinite(value)) return fallback;
    return raw.indexOf('ms') > -1 ? value : value * 1000;
  }

  var canClip =
    window.CSS && CSS.supports && CSS.supports('clip-path', 'ellipse(50% 50% at 50% 50%)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Only the curve needs clip-path; the columns are plain transforms. Without
     clip-path the curve's panel would cover with no animation at all - a
     graphite flash - so stand down, but only if the curve is the variant this
     viewport is actually using. */
  var columns = overlay.querySelector('.pruv-pt__columns');
  var curveActive = !columns || getComputedStyle(columns).display === 'none';

  if (reduced || (!canClip && curveActive)) {
    // The inline script may already have set `arriving`; stand it down.
    overlay.dataset.state = 'off';
    return;
  }

  /* Both of these move the ellipse's centre from one edge of the viewport to
     the other, which has to happen in one frame - watching the anchor slide
     across would give the game away. Suppressing the transition needs the
     browser to have actually recomputed style with it suppressed, hence the
     forced reflow between the two class changes. */
  function instantly(apply) {
    overlay.classList.add('is-instant');
    apply();
    void overlay.offsetWidth;
    overlay.classList.remove('is-instant');
  }

  function idle() {
    instantly(function () {
      overlay.dataset.state = 'idle';
    });
  }

  /* ---- arriving ---------------------------------------------------------- */

  if (overlay.dataset.state === 'arriving') {
    /* The covering pose is already painted (inline script). Release it on the
       next frame so there is a real before-change style to interpolate from -
       set both in one frame and it just snaps. */
    requestAnimationFrame(function () {
      if (overlay.dataset.state !== 'arriving') return;
      overlay.classList.remove('is-instant');
      void overlay.offsetWidth;
      overlay.dataset.state = 'revealing';
      window.setTimeout(idle, duration('--pruv-pt-enter-total', 950) + 100);
    });
  }

  /* Restoring from the back/forward cache replays neither load nor our inline
     script, so a panel left mid-sweep would come back frozen. */
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) idle();
  });

  /* ---- leaving ----------------------------------------------------------- */

  function leave(href) {
    overlay.dataset.state = 'leaving';
    try {
      sessionStorage.setItem(FLAG, String(Date.now()));
    } catch (e) {
      /* No flag means the next page simply loads without the second half. */
    }

    var navigated = false;
    window.setTimeout(function () {
      navigated = true;
      window.location.href = href;
    }, duration('--pruv-pt-leave-total', 850));

    /* A navigation that never lands - a 204, a link the server turned into a
       download, the visitor hitting Escape. Retreat rather than sit on top of
       a page that is still perfectly usable. */
    window.setTimeout(function () {
      if (!navigated || overlay.dataset.state !== 'leaving') return;
      if (document.visibilityState !== 'visible') return;
      try {
        sessionStorage.removeItem(FLAG);
      } catch (e) {}
      overlay.dataset.state = 'cancelled';
      window.setTimeout(idle, 540);
    }, STALL_MS);
  }

  /* The href this click should sweep to, or null to leave the click alone. */
  function pageChangeUrl(link) {
    var href = link.getAttribute('href');
    if (!href || /^(#|mailto:|tel:|sms:|javascript:)/i.test(href)) return null;
    if (link.hasAttribute('download')) return null;

    var target = link.getAttribute('target');
    if (target && target !== '_self') return null;

    // Escape hatch for anything that must not be delayed.
    if (link.closest('[data-pruv-no-transition]')) return null;

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (e) {
      return null;
    }
    if (url.origin !== window.location.origin) return null;

    /* Same page: either a plain self-link or a jump to an anchor on it. Neither
       is a page change, and covering the screen to scroll would be absurd. */
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return null;
    }

    return url.href;
  }

  /* Bubble phase, and `defaultPrevented` is respected: any component that
     handles its own clicks keeps priority. That is what keeps this off Dawn's
     cart remove buttons, the quantity steppers and the localisation selectors,
     all of which are anchors that never actually navigate. */
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (overlay.dataset.state === 'leaving') {
      // Already on our way out; swallow anything that slips past the panel.
      event.preventDefault();
      return;
    }

    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    var href = pageChangeUrl(link);
    if (!href) return;

    event.preventDefault();
    leave(href);
  });
})();
