/* Prüv — header search: motion, shortcuts and the suggestion chips.

   Dawn's <details-modal> still owns opening, closing, focus trapping and Esc;
   this only adds to it. Three jobs:

   1. Open and close motion. The panel and scrim are tweened with GSAP when it
      is there, and the close is delayed just long enough for the tween to play
      before <details> loses its open attribute. Without GSAP, or under reduced
      motion, nothing is delayed and the panel appears as the browser would show
      it - the CSS never depends on a class this file sets.
   2. A keyboard shortcut. Cmd/Ctrl+K and "/" open the search from anywhere on
      the page, the way the palettes people are used to behave. "/" is ignored
      while typing, so it never eats a character.
   3. The suggestion chips search in place instead of loading the search page.
      Each chip is a real /search link, so this is an enhancement: the click is
      only intercepted once the predictive search is actually there to answer.

   The visible search is whichever instance is laid out - Dawn renders the
   snippet twice, and the one outside .header__icons is display: none at some
   widths - so the shortcut always drives the one on screen. */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function gsapLib() {
    return window.gsap;
  }

  function init(modal) {
    if (modal.dataset.pruvSearchReady === 'true') return;
    modal.dataset.pruvSearchReady = 'true';

    var details = modal.querySelector('details');
    var summary = modal.querySelector('summary');
    var panel = modal.querySelector('[data-pruv-search-panel]');
    var scrim = modal.querySelector('[data-pruv-search-scrim]');
    var head = modal.querySelector('[data-pruv-search-head]');
    var field = modal.querySelector('[data-pruv-search-field]');
    var quick = modal.querySelector('[data-pruv-search-quick]');
    var input = modal.querySelector('input[type="search"]');
    var predictive = modal.querySelector('predictive-search');
    var results = modal.querySelector('[data-predictive-search]');
    if (!details || !summary || !panel) return;

    var closing = false;

    function animateIn() {
      var gsap = gsapLib();
      if (!gsap || reduced) return;

      gsap.killTweensOf([panel, scrim]);
      if (scrim) gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(
        panel,
        { opacity: 0, y: -14, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }
      );

      var rows = [head, field, quick].filter(Boolean);
      if (rows.length) {
        gsap.fromTo(
          rows,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.06, delay: 0.08, clearProps: 'all' }
        );
      }
    }

    /* The panel has to still be on screen while it animates out, so the close
       runs in two steps: play the tween, then let DetailsModal close for real.
       The guard flag is what stops the second, real click from being delayed
       again - and from being swallowed. */
    function closeWithMotion(event) {
      var gsap = gsapLib();
      if (closing || !gsap || reduced || !details.hasAttribute('open')) return false;

      event.preventDefault();
      event.stopPropagation();
      closing = true;

      var finished = false;

      var done = function () {
        if (finished) return;
        finished = true;
        closing = false;
        gsap.killTweensOf([panel, scrim].filter(Boolean));
        gsap.set([panel, scrim].filter(Boolean), { clearProps: 'all' });
        // Hand back to Dawn: it restores focus, unlocks the body and closes.
        if (typeof modal.close === 'function') {
          modal.close(true);
        } else {
          details.removeAttribute('open');
        }
      };

      var tl = gsap.timeline({ onComplete: done });
      tl.to(panel, { opacity: 0, y: -10, scale: 0.99, duration: 0.25, ease: 'power2.in' }, 0);
      if (scrim) tl.to(scrim, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);

      /* The close must not depend on the tween finishing. GSAP drives off
         requestAnimationFrame, which a browser pauses in a background tab - so
         hitting Esc and switching tabs would otherwise leave the panel open and
         the page scroll locked behind it. setTimeout keeps running there, and
         whichever fires first closes; done() is idempotent. */
      window.setTimeout(done, 600);
      return true;
    }

    /* Capture, not bubble: DetailsModal's own click handler was bound when the
       element upgraded, so it runs first and has already toggled the open
       attribute by the time a bubble listener sees the click. In capture the
       attribute still says what the panel was, which is what decides whether
       this click opens or closes it. */
    summary.addEventListener(
      'click',
      function (event) {
        if (details.hasAttribute('open')) {
          closeWithMotion(event);
          return;
        }
        window.requestAnimationFrame(animateIn);
      },
      true
    );

    toArray(modal.querySelectorAll('.pruv-search__close')).forEach(function (button) {
      button.addEventListener('click', closeWithMotion, true);
    });

    if (scrim) {
      scrim.addEventListener('click', closeWithMotion, true);
    }

    /* Anything outside the panel closes it, not only the scrim. The scrim
       covers the viewport, so normally it catches every outside click - but it
       only catches what paints below it, and a section with a higher z-index
       than the header would take those clicks instead. This is measured
       against the panel, so it holds whatever is on top. */
    document.addEventListener(
      'click',
      function (event) {
        if (!details.hasAttribute('open')) return;
        var target = event.target;
        // Inside the panel is not outside it, and the summary is the toggle.
        if (panel.contains(target) || summary.contains(target)) return;
        closeWithMotion(event);
      },
      true
    );

    details.addEventListener(
      'keyup',
      function (event) {
        if (event.code && event.code.toUpperCase() === 'ESCAPE') closeWithMotion(event);
      },
      true
    );

    /* Chips: fill the field and let predictive search answer, rather than
       leaving the page. Only when it can - otherwise the link does its job. */
    if (quick && input && predictive) {
      quick.addEventListener('click', function (event) {
        var chip = event.target.closest ? event.target.closest('[data-pruv-search-term]') : null;
        if (!chip) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        if (typeof predictive.getSearchResults !== 'function') return;

        event.preventDefault();
        var term = chip.getAttribute('data-pruv-search-term') || chip.textContent.trim();
        input.value = term;
        input.focus();
        // input, not the component's method: it keeps the reset button, the
        // search term and the live region in step the way typing does.
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    /* Each fresh batch of results rises in. renderSearchResults replaces the
       container's innerHTML wholesale, so a MutationObserver is the only hook
       that does not need predictive-search.js to be patched. */
    if (results && !reduced && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        var gsap = gsapLib();
        if (!gsap) return;
        var rows = toArray(results.querySelectorAll('.predictive-search__list-item'));
        var groups = toArray(results.querySelectorAll('.predictive-search__heading'));
        var footer = results.querySelector('.predictive-search__search-for-button');
        var targets = groups.concat(rows);
        if (footer) targets.push(footer);
        if (!targets.length) return;

        gsap.killTweensOf(targets);
        gsap.fromTo(
          targets,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.035, clearProps: 'all' }
        );
      });
      observer.observe(results, { childList: true });
    }

    modal.pruvSearchOpen = function () {
      if (details.hasAttribute('open')) {
        if (input) input.focus();
        return;
      }
      summary.click();
    };
  }

  function visibleSearch() {
    var all = toArray(document.querySelectorAll('details-modal.pruv-search'));
    for (var i = 0; i < all.length; i++) {
      if (all[i].offsetParent !== null) return all[i];
    }
    return all[0] || null;
  }

  function isTyping(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  document.addEventListener('keydown', function (event) {
    var isK = event.key === 'k' || event.key === 'K';
    var shortcut = (event.metaKey || event.ctrlKey) && isK;
    var slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target);
    if (!shortcut && !slash) return;

    var modal = visibleSearch();
    if (!modal || typeof modal.pruvSearchOpen !== 'function') return;

    event.preventDefault();
    modal.pruvSearchOpen();
  });

  function initAll() {
    toArray(document.querySelectorAll('details-modal.pruv-search')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', initAll);
})();
