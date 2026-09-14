/* Prüv — Routine Builder behaviour.

   Matching. Each concern tile carries a weight vector, one number per product
   slot in block order, copied from the hair test's main-concern question. The
   checked tiles' vectors are summed and each slot becomes:
     core      always_include, or score >= threshold  -> in the routine and cart
     optional  0 < score < threshold                   -> "worth adding", opt-in
     off       score 0                                 -> hidden
   With nothing picked every slot is core: the complete ritual, which is also
   exactly what the server rendered.

   With the preset's vectors and threshold 2 that reduces to:
     Reset   core iff  B or D
     Support core      always (always_include)
     Repair  core iff  C or (A and B)

   Structure. Every tile and row already exists in the markup. This script only
   flips `hidden`, `data-tier` and `disabled` - it never creates, removes or
   moves a node - so focus and reading order survive every tap, and if it fails
   part-way the native form still posts whatever is enabled.

   The form is the state. Each buyable slot has a pair of items[i] inputs;
   toggling their `disabled` decides what the button adds, both for the fetch
   below and for a plain form submit. */
(function () {
  var DESKTOP = '(min-width: 990px)';
  var STORE = 'pruv:routine:';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  /* constants.js declares PUB_SUB_EVENTS with a top-level `const`, which is
     global but never a property of window - so `window.PUB_SUB_EVENTS` is
     always undefined. Reach it by bare name, guarded. */
  function emit(eventName, data) {
    if (typeof publish !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;
    publish(PUB_SUB_EVENTS[eventName], data);
  }

  function fill(template, values) {
    return String(template || '').replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
    });
  }

  function parseWeights(raw, length) {
    var out = [];
    var parts = String(raw || '').split(',');
    for (var i = 0; i < length; i++) {
      var n = parseFloat(parts[i]);
      out.push(isFinite(n) ? n : 0);
    }
    return out;
  }

  /* Shopify's money_format placeholders. The format can arrive HTML-encoded
     (e.g. &#8377;{{amount}}) and occasionally wrapped in markup, so decode and
     strip before substituting. */
  function formatMoney(cents, format) {
    var decoder = document.createElement('textarea');
    decoder.innerHTML = String(format || '{{amount}}').replace(/<[^>]*>/g, '');
    var template = decoder.value;
    var match = template.match(/\{\{\s*(\w+)\s*\}\}/);
    var key = match ? match[1] : 'amount';

    function delimit(precision, thousands, decimal) {
      var fixed = (Number(cents || 0) / 100).toFixed(precision).split('.');
      var whole = fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return fixed[1] ? whole + decimal + fixed[1] : whole;
    }

    var value;
    switch (key) {
      case 'amount_no_decimals':
        value = delimit(0, ',', '.');
        break;
      case 'amount_with_comma_separator':
        value = delimit(2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = delimit(0, '.', ',');
        break;
      case 'amount_with_apostrophe_separator':
        value = delimit(2, "'", '.');
        break;
      case 'amount_no_decimals_with_space_separator':
        value = delimit(0, ' ', ',');
        break;
      case 'amount_with_space_separator':
        value = delimit(2, ' ', ',');
        break;
      case 'amount_with_period_and_space_separator':
        value = delimit(2, ' ', '.');
        break;
      default:
        value = delimit(2, ',', '.');
    }
    return template.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  function init(section) {
    if (section.dataset.pruvRoutineReady === 'true') return;

    var configEl = section.querySelector('[data-pruv-routine-config]');
    var config;
    try {
      config = JSON.parse(configEl.textContent);
    } catch (e) {
      return;
    }
    section.dataset.pruvRoutineReady = 'true';

    var labels = config.labels || {};
    var threshold = Number(config.threshold) || 2;
    var gsap = window.gsap;
    var animate = !!gsap && !reduced;

    var fieldset = section.querySelector('[data-pruv-routine-concerns]');
    var checks = toArray(section.querySelectorAll('[data-pruv-routine-concern]'));
    var cap = Math.max(1, Math.min(Number(config.cap) || checks.length, checks.length));
    var steps = toArray(section.querySelectorAll('[data-pruv-routine-step]'));
    var reasons = toArray(section.querySelectorAll('[data-pruv-routine-reason]'));
    var form = section.querySelector('[data-pruv-routine-form]');
    var submit = section.querySelector('[data-pruv-routine-submit]');
    var submitLabel = section.querySelector('[data-pruv-routine-submit-label]');
    var errorEl = section.querySelector('[data-pruv-routine-error]');
    var heading = section.querySelector('[data-pruv-routine-heading]');
    var prompt = section.querySelector('[data-pruv-routine-prompt]');
    var countEl = section.querySelector('[data-pruv-routine-count]');
    var totalEl = section.querySelector('[data-pruv-routine-total]');
    var counter = section.querySelector('[data-pruv-routine-counter]');
    var clearBtn = section.querySelector('[data-pruv-routine-clear]');
    var statusEl = section.querySelector('[data-pruv-routine-status]');
    var card = section.querySelector('[data-pruv-routine-card]');
    var wrap = section.querySelector('[data-pruv-routine-steps-wrap]');
    var rail = section.querySelector('[data-pruv-routine-rail]');
    var railFill = section.querySelector('[data-pruv-routine-rail-fill]');
    var bar = section.querySelector('[data-pruv-routine-bar]');
    var barSummary = section.querySelector('[data-pruv-routine-bar-summary]');
    var barButton = section.querySelector('[data-pruv-routine-bar-button]');

    var slotCount = steps.length;
    var vectors = checks.map(function (input) {
      return parseWeights(input.getAttribute('data-weights'), slotCount);
    });
    var optedIn = {};
    var lastTier = {};
    var busy = false;
    var first = true;

    section.classList.add('pruv-routine--live');

    function selected() {
      return checks.filter(function (input) {
        return input.checked;
      });
    }

    function linesFor(slot) {
      return toArray(form.querySelectorAll('[data-slot="' + slot + '"]'));
    }

    /* ---- rail ------------------------------------------------------------ */

    function syncRail() {
      if (!rail || !wrap) return;
      var visible = steps.filter(function (step) {
        return !step.hidden;
      });
      if (!visible.length) {
        rail.style.height = '0px';
        return;
      }
      var wrapBox = wrap.getBoundingClientRect();
      function centre(step) {
        var box = step.querySelector('[data-pruv-routine-node]').getBoundingClientRect();
        return { x: box.left + box.width / 2 - wrapBox.left, y: box.top + box.height / 2 - wrapBox.top };
      }
      var top = centre(visible[0]);
      var bottom = centre(visible[visible.length - 1]);
      rail.style.left = top.x + 'px';
      rail.style.top = top.y + 'px';
      rail.style.height = Math.max(0, bottom.y - top.y) + 'px';

      var lastCore = null;
      visible.forEach(function (step) {
        if (step.getAttribute('data-tier') === 'core' || optedIn[step.getAttribute('data-slot')]) {
          lastCore = step;
        }
      });
      railFill.style.height = lastCore ? Math.max(0, centre(lastCore).y - top.y) + 'px' : '0px';
    }

    /* ---- rows in and out --------------------------------------------------- */

    function hideRow(step) {
      if (step.hidden || step.dataset.leaving === 'true') return;
      if (step.contains(document.activeElement) && heading) {
        heading.focus({ preventScroll: true });
      }
      if (!animate || first) {
        step.hidden = true;
        return;
      }
      step.dataset.leaving = 'true';
      gsap.killTweensOf(step);
      gsap.to(step, {
        height: 0,
        opacity: 0,
        x: -8,
        overflow: 'hidden',
        duration: 0.35,
        ease: 'power3.inOut',
        onUpdate: syncRail,
        onComplete: function () {
          step.hidden = true;
          delete step.dataset.leaving;
          gsap.set(step, { clearProps: 'height,opacity,transform,overflow' });
          syncRail();
        },
      });
    }

    function showRow(step, order) {
      var wasHidden = step.hidden;
      var wasLeaving = step.dataset.leaving === 'true';
      if (!wasHidden && !wasLeaving) return;
      delete step.dataset.leaving;
      step.hidden = false;
      if (!animate || first) return;
      gsap.killTweensOf(step);
      gsap.fromTo(
        step,
        wasHidden ? { height: 0, opacity: 0, x: 8, overflow: 'hidden' } : { overflow: 'hidden' },
        {
          height: 'auto',
          opacity: 1,
          x: 0,
          duration: 0.45,
          delay: order * 0.05,
          ease: 'power3.out',
          onUpdate: syncRail,
          onComplete: function () {
            gsap.set(step, { clearProps: 'height,opacity,transform,overflow' });
            syncRail();
          },
        }
      );
    }

    function roll(el, text) {
      if (!el || el.textContent === text) return;
      el.textContent = text;
      if (first || reduced) return;
      el.classList.remove('is-rolling');
      void el.offsetWidth;
      el.classList.add('is-rolling');
    }

    /* ---- the resolve pass ------------------------------------------------ */

    var statusTimer = null;
    function announce(text, now) {
      if (!statusEl) return;
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(
        function () {
          statusEl.textContent = '';
          statusEl.textContent = text;
        },
        now ? 30 : 250
      );
    }

    function update(options) {
      options = options || {};
      var picked = selected();
      var none = picked.length === 0;

      var scores = [];
      for (var s = 0; s < slotCount; s++) scores.push(0);
      picked.forEach(function (input) {
        var vector = vectors[checks.indexOf(input)];
        vector.forEach(function (n, i) {
          scores[i] += n;
        });
      });

      var included = 0;
      var visibleRows = 0;
      var total = 0;
      var titles = [];
      var order = 0;

      steps.forEach(function (step, i) {
        var slot = step.getAttribute('data-slot');
        var always = step.getAttribute('data-always') === 'true';
        var buyable = step.getAttribute('data-available') === 'true';
        var tier;

        if (none || always || scores[i] >= threshold) {
          tier = 'core';
        } else if (scores[i] > 0 && config.showOptional) {
          tier = 'optional';
        } else {
          tier = 'off';
        }

        // An opt-in only means something while the step is optional.
        if (tier !== 'optional') delete optedIn[slot];
        lastTier[slot] = tier;

        step.setAttribute('data-tier', tier);

        var badge = step.querySelector('[data-pruv-routine-badge]');
        if (badge) badge.hidden = tier !== 'optional';

        var toggle = step.querySelector('[data-pruv-routine-optional-toggle]');
        var opted = tier === 'optional' && !!optedIn[slot];
        if (toggle) {
          toggle.hidden = tier !== 'optional';
          toggle.setAttribute('aria-pressed', opted ? 'true' : 'false');
          var toggleLabel = toggle.querySelector('[data-pruv-routine-toggle-label]');
          if (toggleLabel) toggleLabel.textContent = opted ? labels.optionalAdded : labels.optionalAdd;
        }

        var node = step.querySelector('[data-pruv-routine-node]');
        if (node) node.toggleAttribute('data-opted', opted);

        var inRoutine = tier === 'core' || opted;
        linesFor(slot).forEach(function (input) {
          input.disabled = !(inRoutine && buyable);
        });

        if (tier === 'off') {
          hideRow(step);
        } else {
          showRow(step, order++);
          if (inRoutine) visibleRows++;
        }

        if (inRoutine && buyable) {
          included++;
          total += Number(step.getAttribute('data-price')) || 0;
          titles.push(step.getAttribute('data-title'));
        }
      });

      // Heading: the count of steps the button will add, falling back to the
      // shape of the routine only when nothing in it can be bought.
      var steps_n = included || visibleRows;
      var headingText;
      if (none) {
        headingText = fill(labels.headingEmpty, { steps: steps_n });
      } else if (steps_n === 1) {
        headingText = labels.headingSingle;
      } else {
        headingText = fill(labels.heading, { steps: steps_n });
      }
      if (heading.textContent !== headingText) {
        heading.textContent = headingText;
        if (!first && !reduced) {
          heading.classList.remove('is-fading');
          void heading.offsetWidth;
          heading.classList.add('is-fading');
        }
      }

      if (prompt) prompt.hidden = !none;
      reasons.forEach(function (li) {
        li.hidden = !checks[Number(li.getAttribute('data-pruv-routine-reason'))].checked;
      });

      roll(countEl, included === 1 ? labels.countSingle : fill(labels.count, { count: included }));
      var totalText = formatMoney(total, config.moneyFormat);
      roll(totalEl, totalText);

      if (!busy) {
        if (included === 0) {
          submit.setAttribute('aria-disabled', 'true');
          submitLabel.textContent = labels.unavailableAll;
        } else {
          submit.removeAttribute('aria-disabled');
          submitLabel.textContent =
            included === 1 ? labels.addAllSingle : fill(labels.addAll, { count: included });
        }
      }

      var atCap = picked.length >= cap;
      fieldset.toggleAttribute('data-at-cap', atCap);
      counter.textContent = atCap
        ? fill(labels.counterCap, { max: cap })
        : fill(labels.counter, { selected: picked.length, max: cap });
      if (clearBtn) clearBtn.hidden = none;

      if (barSummary) {
        barSummary.textContent =
          (included === 1 ? labels.countSingle : fill(labels.count, { count: included })) + ' · ' + totalText;
      }

      if (!first && !options.silent) {
        announce(headingText + (titles.length ? ': ' + titles.join(', ') + '.' : '.') + ' ' + labels.total + ' ' + totalText + '.');
      }

      if (errorEl) errorEl.hidden = true;
      syncBar();
      // Rows that tween re-sync on every frame; this covers the ones that don't
      // move, e.g. an opt-in that only changes where the fill ends.
      syncRail();
      if (!options.skipPersist) persist();
    }

    /* ---- tiles ----------------------------------------------------------- */

    checks.forEach(function (input) {
      input.addEventListener('change', function () {
        if (input.checked && selected().length > cap) {
          // Allow, revert, explain - never silently disable the other tiles.
          input.checked = false;
          announce(fill(labels.capNotice, { max: cap }), true);
          return;
        }
        update();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        checks.forEach(function (input) {
          input.checked = false;
        });
        optedIn = {};
        update();
        if (checks[0]) checks[0].focus();
      });
    }

    steps.forEach(function (step) {
      var toggle = step.querySelector('[data-pruv-routine-optional-toggle]');
      if (!toggle) return;
      toggle.addEventListener('click', function () {
        var slot = step.getAttribute('data-slot');
        if (lastTier[slot] !== 'optional') return;
        if (optedIn[slot]) {
          delete optedIn[slot];
        } else {
          optedIn[slot] = true;
        }
        update({ skipPersist: true });
      });
    });

    /* ---- URL and session state ------------------------------------------ */

    var sectionId = section.getAttribute('data-section-id') || '';

    function readIndices(raw) {
      if (!raw) return null;
      var seen = {};
      var out = [];
      var parts = String(raw).split(',');
      for (var i = 0; i < parts.length; i++) {
        if (!/^\d+$/.test(parts[i])) return null;
        var n = Number(parts[i]);
        // A stale or hand-edited link must fall back to the default, never to a
        // half-applied selection.
        if (n >= checks.length || seen[n]) return null;
        seen[n] = true;
        out.push(n);
      }
      return out.length && out.length <= cap ? out : null;
    }

    var persistTimer = null;
    function persist() {
      if (first) return;
      window.clearTimeout(persistTimer);
      persistTimer = window.setTimeout(function () {
        var indices = [];
        checks.forEach(function (input, i) {
          if (input.checked) indices.push(i);
        });
        var value = indices.join(',');
        try {
          // replaceState, never pushState: Back should leave the page, not
          // undo the last tile. Other params (e.g. preview_theme_id) survive.
          var url = new URL(window.location.href);
          url.searchParams.delete('ritual');
          // Appended by hand: URLSearchParams would encode the commas and turn a
          // link people might share into ?ritual=0%2C2.
          var rest = url.searchParams.toString();
          var query = [rest, value ? 'ritual=' + value : ''].filter(Boolean).join('&');
          window.history.replaceState(
            window.history.state,
            '',
            url.pathname + (query ? '?' + query : '') + url.hash
          );
        } catch (e) {}
        try {
          if (value) {
            sessionStorage.setItem(STORE + sectionId, value);
          } else {
            sessionStorage.removeItem(STORE + sectionId);
          }
        } catch (e) {}
      }, 250);
    }

    function restore() {
      var indices = null;
      try {
        indices = readIndices(new URL(window.location.href).searchParams.get('ritual'));
      } catch (e) {}
      if (!indices) {
        try {
          indices = readIndices(sessionStorage.getItem(STORE + sectionId));
        } catch (e) {}
      }
      if (!indices) return;
      indices.forEach(function (i) {
        checks[i].checked = true;
      });
    }

    /* ---- mobile summary bar ---------------------------------------------- */

    var mq = window.matchMedia(DESKTOP);
    var sectionInView = false;
    var ctaInView = false;

    function syncBar() {
      if (!bar) return;
      var show = !mq.matches && selected().length > 0 && sectionInView && !ctaInView;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      bar.toggleAttribute('inert', !show);
      document.documentElement.classList.toggle('pruv-routine-bar-open', show);
    }

    if (bar && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        sectionInView = entries[0].isIntersecting;
        syncBar();
      }).observe(section);

      new IntersectionObserver(function (entries) {
        ctaInView = entries[0].isIntersecting;
        syncBar();
      }).observe(submit);

      if (mq.addEventListener) {
        mq.addEventListener('change', syncBar);
      } else if (mq.addListener) {
        mq.addListener(syncBar);
      }

      barButton.addEventListener('click', function () {
        card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        heading.focus({ preventScroll: true });
      });
    }

    /* ---- multi-line add to cart ------------------------------------------ */

    function setBusy(on) {
      busy = on;
      if (on) {
        submit.setAttribute('aria-busy', 'true');
        submitLabel.textContent = labels.adding;
      } else {
        submit.removeAttribute('aria-busy');
      }
    }

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message || labels.error;
      errorEl.hidden = false;
    }

    /* cart-notification.js's own renderContents() cannot be used here: it reads
       a single `key` off the response, and a multi-line add has none, so its
       selector becomes "...-undefined" and it throws on null.innerHTML. Its
       cart-notification-product section renders every cart line, though, so
       one response still contains everything we added - pick those out.
       Returns false whenever it can't be sure, and the caller goes to /cart. */
    function renderCartUI(cartUI, response) {
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
      cartUI.setActiveElement(submit);
      cartUI.open();
      return true;
    }

    form.addEventListener('submit', function (event) {
      // Without the theme's fetch helpers, let the native multi-line form post.
      if (typeof window.fetchConfig !== 'function' || !window.routes || !window.fetch) return;

      event.preventDefault();
      if (busy) return;

      if (submit.getAttribute('aria-disabled') === 'true') {
        announce(labels.unavailableAll, true);
        return;
      }

      var lines = toArray(form.querySelectorAll('[data-pruv-routine-line]'))
        .filter(function (input) {
          return !input.disabled;
        })
        .map(function (input) {
          return { id: Number(input.value), quantity: 1 };
        });
      if (!lines.length) return;

      var cartUI = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      var body = { items: lines };
      if (cartUI && typeof cartUI.getSectionsToRender === 'function') {
        body.sections = cartUI
          .getSectionsToRender()
          .map(function (section) {
            return section.id;
          })
          .join(',');
        body.sections_url = window.location.pathname;
      }

      var request = window.fetchConfig('javascript');
      request.body = JSON.stringify(body);

      if (errorEl) errorEl.hidden = true;
      setBusy(true);

      fetch(window.routes.cart_add_url, request)
        .then(function (response) {
          return response.json();
        })
        .then(function (response) {
          if (response.status) {
            emit('cartError', {
              source: 'pruv-routine-builder',
              errors: response.errors || response.description,
              message: response.message,
            });
            setBusy(false);
            update({ silent: true, skipPersist: true });
            showError(response.description || labels.error);
            return;
          }

          setBusy(false);
          update({ silent: true, skipPersist: true });
          submit.setAttribute('data-added', '');
          submitLabel.textContent = labels.added;
          announce(fill(labels.addedNotice, { count: lines.length }), true);
          window.setTimeout(function () {
            submit.removeAttribute('data-added');
            update({ silent: true, skipPersist: true });
          }, 1200);

          emit('cartUpdate', {
            source: 'pruv-routine-builder',
            cartData: response,
          });

          var rendered = false;
          try {
            rendered = renderCartUI(cartUI, response);
          } catch (e) {
            rendered = false;
          }
          // The items are in the cart either way, so going there loses nothing.
          if (!rendered) window.location.href = window.routes.cart_url;
        })
        .catch(function () {
          setBusy(false);
          update({ silent: true, skipPersist: true });
          showError(labels.error);
        });
    });

    /* ---- editor --------------------------------------------------------- */

    section.addEventListener('pruv:routine:select-block', function (event) {
      var id = event.detail && event.detail.blockId;
      var tile = null;
      checks.forEach(function (input) {
        if (input.closest('[data-block-id]').getAttribute('data-block-id') === id) tile = input;
      });
      if (tile && !tile.checked && selected().length < cap) {
        tile.checked = true;
        update({ skipPersist: true });
        return;
      }
      steps.forEach(function (step) {
        if (step.getAttribute('data-block-id') !== id) return;
        if (step.hidden) {
          checks.forEach(function (input) {
            input.checked = false;
          });
          update({ skipPersist: true });
        }
        step.scrollIntoView({ block: 'nearest' });
      });
    });

    /* ---- go -------------------------------------------------------------- */

    restore();
    update({ skipPersist: true });
    first = false;

    window.addEventListener('resize', syncRail);
    window.addEventListener('load', syncRail);
    toArray(section.querySelectorAll('.pruv-routine__thumb img')).forEach(function (img) {
      if (!img.complete) img.addEventListener('load', syncRail, { once: true });
    });
  }

  function initAll() {
    toArray(document.querySelectorAll('[data-pruv-routine]')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', function (event) {
      var section = event.target.querySelector('[data-pruv-routine]');
      if (section) init(section);
    });

    document.addEventListener('shopify:block:select', function (event) {
      var section = event.target.closest('[data-pruv-routine]');
      if (!section) return;
      section.dispatchEvent(
        new CustomEvent('pruv:routine:select-block', { detail: { blockId: event.detail.blockId } })
      );
    });
  }
})();
