/* Prüv — Hair Test popup. Opens N seconds after load, once per browser session.
   Uses a native <dialog> so focus trapping, ESC and background inert come free. */
(function () {
  'use strict';

  var KEY = 'pruv:hairtest:popup:seen';

  function seen() {
    try {
      return window.sessionStorage.getItem(KEY) === '1';
    } catch (e) {
      // Private mode / blocked storage: fail closed so we never nag on every page.
      return true;
    }
  }

  function markSeen() {
    try {
      window.sessionStorage.setItem(KEY, '1');
    } catch (e) {
      /* nothing we can do; the in-memory guard below still holds for this page */
    }
  }

  function initPopup(root) {
    if (root.dataset.popupInit === 'true') return;
    root.dataset.popupInit = 'true';

    var dialog = root.querySelector('[data-quiz-dialog]');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    var delay = parseInt(root.getAttribute('data-delay'), 10);
    if (isNaN(delay)) delay = 7000;

    var closers = root.querySelectorAll('[data-quiz-dialog-close]');
    var timer = null;

    function close() {
      markSeen();
      if (dialog.open) dialog.close();
      document.documentElement.style.overflow = '';
    }

    var mount = root.querySelector('[data-quiz-mount]');
    var source = root.getAttribute('data-source');
    var loading = false;

    // The quiz markup lives on the hair test page. Fetch it on open so the
    // questions and scoring have exactly one source of truth.
    function loadQuiz() {
      if (loading || !mount || !source) return;
      if (mount.querySelector('[data-pruv-quiz]')) return;
      loading = true;
      fetch(source, { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var quiz = doc.querySelector('[data-pruv-quiz]');
          if (!quiz) throw new Error('no quiz on page');
          mount.innerHTML = '';
          mount.appendChild(document.importNode(quiz, true));
          if (window.PruvQuizInit) window.PruvQuizInit(mount);
        })
        .catch(function () {
          // Leave the fallback link in place — it goes to the same quiz.
          loading = false;
        });
    }

    function open() {
      if (dialog.open) return;
      // Don't interrupt someone already taking the test on this page.
      if (document.querySelector('.pruv-hair-test [data-pruv-quiz]')) return;
      markSeen();
      loadQuiz();
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
      if (window.PruvQuizInit) window.PruvQuizInit(dialog);
    }

    closers.forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    // Backdrop click closes. The dialog element itself fills the viewport, so a
    // click landing on it rather than on the inner panel is a backdrop click.
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) close();
    });

    dialog.addEventListener('close', function () {
      markSeen();
      document.documentElement.style.overflow = '';
    });

    // Completing the test counts as engagement; keep it closed for the session.
    root.addEventListener('pruv:quiz:complete', markSeen);

    if (window.Shopify && window.Shopify.designMode) {
      // In the editor, open on section select instead of on a timer so it never
      // blocks the merchant while they are editing other sections.
      document.addEventListener('shopify:section:select', function (e) {
        if (root.contains(e.target) || e.target.contains(root)) open();
      });
      document.addEventListener('shopify:section:deselect', function (e) {
        if (root.contains(e.target) || e.target.contains(root)) close();
      });
      return;
    }

    if (seen()) return;

    timer = window.setTimeout(open, delay);
    window.addEventListener('pagehide', function () {
      window.clearTimeout(timer);
    });
  }

  function boot(scope) {
    (scope || document).querySelectorAll('[data-pruv-quiz-popup]').forEach(initPopup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      boot();
    });
  } else {
    boot();
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', function (e) {
      boot(e.target);
    });
  }
})();
