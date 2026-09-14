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
  // Shared with assets/pruv-hair-test-popup.js, which re-checks it before its
  // timed open. Picking a concern here is engagement enough.
  var POPUP_SEEN = 'pruv:hairtest:popup:seen';

  function quietHairTestPopup() {
    try {
      sessionStorage.setItem(POPUP_SEEN, '1');
    } catch (e) {}
  }
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
    // The card's button, plus the mobile sheet's, which submits the same form
    // through its `form` attribute. The card's is primary: it's the one the
    // sheet watches to decide when to step aside.
    var submits = toArray(section.querySelectorAll('[data-pruv-routine-submit]'));
    var submit = section.querySelector('[data-pruv-routine-primary]') || submits[0];
    var errorEls = toArray(section.querySelectorAll('[data-pruv-routine-error]'));
    var heading = section.querySelector('[data-pruv-routine-heading]');
    var prompt = section.querySelector('[data-pruv-routine-prompt]');
    var countEl = section.querySelector('[data-pruv-routine-count]');
    var totalEl = section.querySelector('[data-pruv-routine-total]');
    var counter = section.querySelector('[data-pruv-routine-counter]');
    var clearBtn = section.querySelector('[data-pruv-routine-clear]');
    var statusEl = section.querySelector('[data-pruv-routine-status]');
    var wrap = section.querySelector('[data-pruv-routine-steps-wrap]');
    var rail = section.querySelector('[data-pruv-routine-rail]');
    var railFill = section.querySelector('[data-pruv-routine-rail-fill]');
    var sheet = section.querySelector('[data-pruv-routine-sheet]');
    var sheetToggle = section.querySelector('[data-pruv-routine-sheet-toggle]');
    var sheetToggleLabel = section.querySelector('[data-pruv-routine-sheet-toggle-label]');
    var sheetBody = section.querySelector('[data-pruv-routine-sheet-body]');
    var sheetTitle = section.querySelector('[data-pruv-routine-sheet-title]');
    var sheetTotal = section.querySelector('[data-pruv-routine-sheet-total]');
    var sheetThumbs = toArray(section.querySelectorAll('[data-pruv-routine-sheet-thumb]'));
    var sheetRows = toArray(section.querySelectorAll('[data-pruv-routine-sheet-row]'));

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

        var opted = tier === 'optional' && !!optedIn[slot];
        var sheetRow = sheetRows[i];

        // The card row and its mirror in the mobile sheet get identical state.
        [step, sheetRow].forEach(function (row) {
          if (!row) return;
          row.setAttribute('data-tier', tier);

          var badge = row.querySelector('[data-pruv-routine-badge]');
          if (badge) badge.hidden = tier !== 'optional';

          var toggle = row.querySelector('[data-pruv-routine-optional-toggle]');
          if (toggle) {
            toggle.hidden = tier !== 'optional';
            toggle.setAttribute('aria-pressed', opted ? 'true' : 'false');
            var toggleLabel = toggle.querySelector('[data-pruv-routine-toggle-label]');
            if (toggleLabel) toggleLabel.textContent = opted ? labels.optionalAdded : labels.optionalAdd;
          }
        });

        var node = step.querySelector('[data-pruv-routine-node]');
        if (node) node.toggleAttribute('data-opted', opted);

        var inRoutine = tier === 'core' || opted;

        if (sheetRow) sheetRow.hidden = tier === 'off';
        if (sheetThumbs[i]) sheetThumbs[i].hidden = !inRoutine;
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
        submits.forEach(function (button) {
          var label = button.querySelector('[data-pruv-routine-submit-label]');
          var short = button.getAttribute('data-label-mode') === 'short';
          if (included === 0) {
            button.setAttribute('aria-disabled', 'true');
            label.textContent = labels.unavailableAll;
          } else {
            button.removeAttribute('aria-disabled');
            // The sheet's button has a row to share with the thumbnails and
            // title, so it keeps a fixed short label; the title carries the count.
            label.textContent = short
              ? labels.sheetAdd
              : included === 1
                ? labels.addAllSingle
                : fill(labels.addAll, { count: included });
          }
        });
      }

      var atCap = picked.length >= cap;
      fieldset.toggleAttribute('data-at-cap', atCap);
      counter.textContent = atCap
        ? fill(labels.counterCap, { max: cap })
        : fill(labels.counter, { selected: picked.length, max: cap });
      if (clearBtn) clearBtn.hidden = none;

      if (sheetTitle) roll(sheetTitle, headingText);
      if (sheetTotal) roll(sheetTotal, totalText);

      if (!first && !options.silent) {
        announce(headingText + (titles.length ? ': ' + titles.join(', ') + '.' : '.') + ' ' + labels.total + ' ' + totalText + '.');
      }

      // Leave an error standing through the re-render that follows a failed add;
      // any real change to the routine clears it.
      if (!options.silent) {
        errorEls.forEach(function (el) {
          el.hidden = true;
        });
      }
      syncSheet();
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
        if (input.checked) quietHairTestPopup();
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

    // Opt-in toggles live in both the card and the mobile sheet; either one
    // flips the same slot, and the resolve pass mirrors it to the other.
    toArray(section.querySelectorAll('[data-pruv-routine-optional-toggle]')).forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var slot = toggle.closest('[data-slot]').getAttribute('data-slot');
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
      // Arriving on a shared routine link is engagement too.
      quietHairTestPopup();
    }

    /* ---- mobile routine sheet -------------------------------------------- */

    var mq = window.matchMedia(DESKTOP);
    var sectionInView = false;
    var ctaInView = false;
    var expanded = false;

    function syncSheet() {
      if (!sheet) return;
      // Expanded, it stays up regardless of scroll position until closed; the
      // backdrop is what the visitor is interacting with at that point.
      var show =
        !mq.matches && selected().length > 0 && (expanded || (sectionInView && !ctaInView));
      if (!show && expanded) setExpanded(false, { restoreFocus: false });
      sheet.classList.toggle('is-visible', show);
      sheet.setAttribute('aria-hidden', show ? 'false' : 'true');
      sheet.toggleAttribute('inert', !show);
      document.documentElement.classList.toggle('pruv-routine-sheet-open', show);
    }

    function setExpanded(open, opts) {
      if (!sheet || expanded === open) return;
      opts = opts || {};
      expanded = open;
      sheet.setAttribute('data-expanded', open ? 'true' : 'false');
      sheetToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (sheetToggleLabel) sheetToggleLabel.textContent = open ? labels.sheetCollapse : labels.sheetExpand;
      // Same page-scroll lock Dawn's own drawers use.
      document.body.classList.toggle('overflow-hidden', open);

      if (open) {
        sheetBody.hidden = false;
        if (animate) {
          gsap.killTweensOf(sheetBody);
          gsap.fromTo(sheetBody, { height: 0, opacity: 0 }, {
            height: 'auto',
            opacity: 1,
            duration: 0.4,
            ease: 'power3.out',
            clearProps: 'height,opacity',
          });
        }
      } else if (animate) {
        gsap.killTweensOf(sheetBody);
        gsap.to(sheetBody, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power3.inOut',
          onComplete: function () {
            sheetBody.hidden = true;
            gsap.set(sheetBody, { clearProps: 'height,opacity' });
          },
        });
      } else {
        sheetBody.hidden = true;
      }

      if (!open && opts.restoreFocus !== false && sheet.contains(document.activeElement)) {
        sheetToggle.focus({ preventScroll: true });
      }
    }

    if (sheet) {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          sectionInView = entries[0].isIntersecting;
          syncSheet();
        }).observe(section);

        new IntersectionObserver(function (entries) {
          ctaInView = entries[0].isIntersecting;
          syncSheet();
        }).observe(submit);
      }

      if (mq.addEventListener) {
        mq.addEventListener('change', syncSheet);
      } else if (mq.addListener) {
        mq.addListener(syncSheet);
      }

      // A drag on the handle or peek that ends in a click shouldn't also
      // toggle; this swallows the click the browser fires after a swipe.
      var dragged = false;

      sheetToggle.addEventListener('click', function () {
        if (dragged) {
          dragged = false;
          return;
        }
        setExpanded(!expanded);
      });

      toArray(section.querySelectorAll('[data-pruv-routine-sheet-expand]')).forEach(function (zone) {
        zone.addEventListener('click', function () {
          if (dragged) {
            dragged = false;
            return;
          }
          setExpanded(!expanded);
        });
      });

      section.querySelector('[data-pruv-routine-sheet-backdrop]').addEventListener('click', function () {
        setExpanded(false);
      });

      sheet.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && expanded) {
          event.preventDefault();
          setExpanded(false);
        }
      });

      // Swipe up to expand, down to collapse. Starts only on the handle and the
      // peek (both touch-action: none), never on the scrolling body or a button.
      var startY = null;
      var panel = section.querySelector('.pruv-routine__sheet-panel');
      panel.addEventListener('pointerdown', function (event) {
        if (!event.target.closest('.pruv-routine__sheet-handle, .pruv-routine__sheet-peek')) return;
        if (event.target.closest('[data-pruv-routine-submit]')) return;
        startY = event.clientY;
        dragged = false;
      });
      window.addEventListener('pointermove', function (event) {
        if (startY === null) return;
        var dy = event.clientY - startY;
        if (Math.abs(dy) < 28) return;
        dragged = true;
        setExpanded(dy < 0);
        startY = null;
      });
      window.addEventListener('pointerup', function () {
        startY = null;
      });
    }

    /* ---- multi-line add to cart ------------------------------------------ */

    function setBusy(on) {
      busy = on;
      submits.forEach(function (button) {
        if (on) {
          button.setAttribute('aria-busy', 'true');
          button.querySelector('[data-pruv-routine-submit-label]').textContent = labels.adding;
        } else {
          button.removeAttribute('aria-busy');
        }
      });
    }

    function setAdded(on) {
      submits.forEach(function (button) {
        button.toggleAttribute('data-added', on);
        if (on) button.querySelector('[data-pruv-routine-submit-label]').textContent = labels.added;
      });
    }

    /* Only the error beside the button that was pressed is shown - both are
       role="alert", so showing both would announce the message twice. */
    function showError(message, submitter) {
      var inSheet = !!(submitter && submitter.closest('[data-pruv-routine-sheet]'));
      errorEls.forEach(function (el) {
        var elInSheet = !!el.closest('[data-pruv-routine-sheet]');
        el.hidden = elInSheet !== inSheet;
        if (!el.hidden) el.textContent = message || labels.error;
      });
    }

    /* cart-notification.js's own renderContents() cannot be used here: it reads
       a single `key` off the response, and a multi-line add has none, so its
       selector becomes "...-undefined" and it throws on null.innerHTML. Its
       cart-notification-product section renders every cart line, though, so
       one response still contains everything we added - pick those out.
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

    form.addEventListener('submit', function (event) {
      // Without the theme's fetch helpers, let the native multi-line form post.
      if (typeof window.fetchConfig !== 'function' || !window.routes || !window.fetch) return;

      event.preventDefault();
      if (busy) return;

      // The card's button or the sheet's; both post this form.
      var submitter = event.submitter && submits.indexOf(event.submitter) > -1 ? event.submitter : submit;

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

      errorEls.forEach(function (el) {
        el.hidden = true;
      });
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
            showError(response.description || labels.error, submitter);
            return;
          }

          setBusy(false);
          update({ silent: true, skipPersist: true });
          setAdded(true);
          announce(fill(labels.addedNotice, { count: lines.length }), true);
          window.setTimeout(function () {
            setAdded(false);
            update({ silent: true, skipPersist: true });
          }, 1200);

          emit('cartUpdate', {
            source: 'pruv-routine-builder',
            cartData: response,
          });

          // An expanded sheet covers most of the screen; get it out of the way
          // of the cart notification, and don't steal focus while doing it.
          if (expanded) setExpanded(false, { restoreFocus: false });

          var rendered = false;
          try {
            rendered = renderCartUI(cartUI, response, submitter);
          } catch (e) {
            rendered = false;
          }
          // The items are in the cart either way, so going there loses nothing.
          if (!rendered) window.location.href = window.routes.cart_url;
        })
        .catch(function () {
          setBusy(false);
          update({ silent: true, skipPersist: true });
          showError(labels.error, submitter);
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
