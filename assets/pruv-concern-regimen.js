/**
 * Prüv — Concern Regimen: tab switching and one-click regimen add to cart.
 * Cart handling mirrors assets/pruv-routine-builder.js so the theme's cart
 * notification (or drawer) opens with every line that was just added.
 */
(function () {
  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function emit(eventName, data) {
    if (typeof publish !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;
    publish(PUB_SUB_EVENTS[eventName], data);
  }

  /* cart-notification.js's renderContents() expects a single-line add; pick
     the added lines out of the cart-notification-product section instead.
     Returns false whenever it can't be sure, and the caller goes to /cart. */
  function renderCartUI(cartUI, response, returnFocusTo) {
    if (!cartUI || !response.sections) return false;

    if (cartUI.tagName === 'CART-DRAWER') {
      cartUI.classList.remove('is-empty');
      cartUI.renderContents(response);
      return true;
    }

    var host = document.getElementById('cart-notification-product');
    var source = response.sections['cart-notification-product'];
    var added = response.items || [];
    if (!host || !source || !added.length) return false;

    var doc = new DOMParser().parseFromString(source, 'text/html');
    var html = added
      .map(function (item) {
        var node = doc.querySelector('[id="cart-notification-product-' + item.key + '"]');
        return node ? node.outerHTML : '';
      })
      .join('');
    if (!html) return false;
    host.innerHTML = html;

    ['cart-notification-button', 'cart-icon-bubble'].forEach(function (id) {
      var target = document.getElementById(id);
      if (!target || !response.sections[id]) return;
      try {
        target.innerHTML = cartUI.getSectionInnerHTML(response.sections[id]);
      } catch (e) {
        target.innerHTML = response.sections[id];
      }
    });

    if (cartUI.header && cartUI.header.reveal) cartUI.header.reveal();
    cartUI.setActiveElement(returnFocusTo);
    cartUI.open();
    return true;
  }

  function init(section) {
    if (section.hasAttribute('data-pruv-regimen-ready')) return;
    section.setAttribute('data-pruv-regimen-ready', '');

    var tabs = toArray(section.querySelectorAll('[data-pruv-regimen-tab]'));
    var panels = toArray(section.querySelectorAll('[data-pruv-regimen-panel]'));
    var labels = {};
    try {
      labels = JSON.parse(section.querySelector('[data-pruv-regimen-labels]').textContent);
    } catch (e) {}

    /* ---- tabs ------------------------------------------------------------ */

    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        if (panels[i]) panels[i].hidden = !on;
      });
      if (focus && tabs[index]) tabs[index].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(i, false);
      });
      tab.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (i + 1) % tabs.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        select(next, true);
      });
    });

    section.addEventListener('pruv:regimen:select-block', function (event) {
      var id = event.detail && event.detail.blockId;
      tabs.forEach(function (tab, i) {
        if (tab.id === 'RegimenTab-' + id) select(i, false);
      });
    });

    /* ---- add to cart ------------------------------------------------------ */

    toArray(section.querySelectorAll('[data-pruv-regimen-form]')).forEach(function (form) {
      var submit = form.querySelector('[data-pruv-regimen-submit]');
      var submitLabel = form.querySelector('[data-pruv-regimen-submit-label]');
      var errorEl = form.querySelector('[data-pruv-regimen-error]');
      var busy = false;

      form.addEventListener('submit', function (event) {
        // Without the theme's fetch helpers, let the native multi-line form post.
        if (typeof window.fetchConfig !== 'function' || !window.routes || !window.fetch) return;

        event.preventDefault();
        if (busy || !submit || submit.disabled) return;

        var lines = toArray(form.querySelectorAll('[data-pruv-regimen-line]')).map(function (input) {
          return { id: Number(input.value), quantity: 1 };
        });
        if (!lines.length) return;

        var cartUI = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        var body = { items: lines };
        if (cartUI && typeof cartUI.getSectionsToRender === 'function') {
          body.sections = cartUI
            .getSectionsToRender()
            .map(function (s) {
              return s.id;
            })
            .join(',');
          body.sections_url = window.location.pathname;
        }

        var request = window.fetchConfig('javascript');
        request.body = JSON.stringify(body);

        var originalLabel = submitLabel ? submitLabel.textContent : '';
        busy = true;
        if (errorEl) errorEl.hidden = true;
        submit.setAttribute('aria-busy', 'true');
        if (submitLabel && labels.adding) submitLabel.textContent = labels.adding;

        function reset() {
          busy = false;
          submit.removeAttribute('aria-busy');
          submit.removeAttribute('data-added');
          if (submitLabel) submitLabel.textContent = originalLabel;
        }

        function fail(message) {
          reset();
          if (errorEl) {
            errorEl.textContent = message || labels.error || '';
            errorEl.hidden = false;
          }
        }

        fetch(window.routes.cart_add_url, request)
          .then(function (response) {
            return response.json();
          })
          .then(function (response) {
            if (response.status) {
              emit('cartError', {
                source: 'pruv-concern-regimen',
                errors: response.errors || response.description,
                message: response.message,
              });
              fail(response.description);
              return;
            }

            submit.removeAttribute('aria-busy');
            submit.setAttribute('data-added', '');
            if (submitLabel && labels.added) submitLabel.textContent = labels.added;
            window.setTimeout(reset, 1500);

            emit('cartUpdate', { source: 'pruv-concern-regimen', cartData: response });

            var rendered = false;
            try {
              rendered = renderCartUI(cartUI, response, submit);
            } catch (e) {
              rendered = false;
            }
            // The items are in the cart either way, so going there loses nothing.
            if (!rendered) window.location.href = window.routes.cart_url;
          })
          .catch(function () {
            fail();
          });
      });
    });
  }

  function initAll(root) {
    toArray((root || document).querySelectorAll('[data-pruv-regimen]')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });

  document.addEventListener('shopify:block:select', function (event) {
    var section = event.target.closest('[data-pruv-regimen]');
    if (!section) return;
    section.dispatchEvent(
      new CustomEvent('pruv:regimen:select-block', { detail: { blockId: event.detail.blockId } })
    );
  });
})();
