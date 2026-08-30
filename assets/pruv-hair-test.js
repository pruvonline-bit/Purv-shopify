/* Prüv — Hair Test quiz engine.
   Config is emitted as JSON by the Liquid snippet so scoring data has a single
   source of truth. Scores are vectors over the product slots, in block order. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ADVANCE_DELAY = REDUCED ? 0 : 340;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') el.className = attrs[k];
        else if (k === 'html') el.innerHTML = attrs[k];
        else if (k === 'text') el.textContent = attrs[k];
        else if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
      });
    }
    (kids || []).forEach(function (c) {
      if (c) el.appendChild(c);
    });
    return el;
  }

  function PruvQuiz(root) {
    this.root = root;
    var raw = root.querySelector('[data-quiz-config]');
    if (!raw) return;

    try {
      this.cfg = JSON.parse(raw.textContent);
    } catch (e) {
      return;
    }
    if (!this.cfg.products || !this.cfg.products.length || !this.cfg.steps || !this.cfg.steps.length) return;

    this.viewport = root.querySelector('[data-quiz-viewport]');
    this.progressFill = root.querySelector('[data-quiz-progress]');
    this.stepNum = root.querySelector('[data-quiz-step-num]');
    this.stepTotal = root.querySelector('[data-quiz-step-total]');
    this.backBtn = root.querySelector('[data-quiz-back]');

    this.answers = [];
    this.index = 0;
    this.locked = false;

    var self = this;
    if (this.backBtn) {
      this.backBtn.addEventListener('click', function () {
        self.back();
      });
    }
    if (this.stepTotal) this.stepTotal.textContent = this.cfg.steps.length;

    this.renderStep();
  }

  PruvQuiz.prototype.totalSteps = function () {
    return this.cfg.steps.length;
  };

  PruvQuiz.prototype.updateChrome = function (isResult) {
    var total = this.totalSteps();
    var done = isResult ? total : this.index;
    var pct = Math.round((done / total) * 100);
    if (this.progressFill) this.progressFill.style.width = pct + '%';
    if (this.stepNum) this.stepNum.textContent = isResult ? total : this.index + 1;
    if (this.backBtn) {
      var show = this.index > 0 || isResult;
      this.backBtn.hidden = !show;
    }
    this.root.classList.toggle('is-result', !!isResult);
  };

  PruvQuiz.prototype.swap = function (node) {
    var self = this;
    var old = this.viewport.firstElementChild;
    if (old && !REDUCED) {
      old.classList.add('is-leaving');
      window.setTimeout(function () {
        self.viewport.innerHTML = '';
        self.viewport.appendChild(node);
      }, 160);
    } else {
      this.viewport.innerHTML = '';
      this.viewport.appendChild(node);
    }
  };

  PruvQuiz.prototype.renderStep = function () {
    var self = this;
    var step = this.cfg.steps[this.index];
    if (!step) return;

    this.updateChrome(false);
    this.locked = false;

    var opts = step.options.map(function (opt, i) {
      var selected = self.answers[self.index] === i;
      var card = h(
        'button',
        {
          type: 'button',
          class: 'pruv-quiz__option' + (selected ? ' is-selected' : ''),
          role: 'radio',
          'aria-checked': selected ? 'true' : 'false',
          'data-quiz-option': i
        },
        [
          h('span', { class: 'pruv-quiz__option-mark', 'aria-hidden': 'true' }),
          h('span', { class: 'pruv-quiz__option-body' }, [
            h('span', { class: 'pruv-quiz__option-label', text: opt.label }),
            opt.sublabel ? h('span', { class: 'pruv-quiz__option-sub', text: opt.sublabel }) : null
          ])
        ]
      );
      card.addEventListener('click', function () {
        self.choose(i);
      });
      return card;
    });

    var group = h(
      'div',
      { class: 'pruv-quiz__options', role: 'radiogroup', 'aria-labelledby': 'pruv-quiz-q-' + this.index },
      opts
    );

    // Roving arrow-key navigation across the option cards.
    group.addEventListener('keydown', function (e) {
      var keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
      if (keys.indexOf(e.key) === -1) return;
      e.preventDefault();
      var cards = Array.prototype.slice.call(group.querySelectorAll('[data-quiz-option]'));
      var cur = cards.indexOf(document.activeElement);
      if (cur === -1) cur = 0;
      var next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
          ? cards.length - 1
          : e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? (cur + 1) % cards.length
          : (cur - 1 + cards.length) % cards.length;
      cards[next].focus();
    });

    var panel = h('div', { class: 'pruv-quiz__step' }, [
      h('p', { class: 'pruv-quiz__step-eyebrow', text: step.eyebrow || '' }),
      h('h3', { class: 'pruv-quiz__question', id: 'pruv-quiz-q-' + this.index, text: step.question }),
      step.help ? h('p', { class: 'pruv-quiz__help', text: step.help }) : null,
      group
    ]);

    this.swap(panel);

    // Move focus to the new question so screen readers and keyboard users follow.
    window.setTimeout(
      function () {
        var heading = self.viewport.querySelector('.pruv-quiz__question');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      },
      REDUCED ? 0 : 180
    );
  };

  PruvQuiz.prototype.choose = function (optionIndex) {
    if (this.locked) return;
    this.locked = true;
    this.answers[this.index] = optionIndex;

    var cards = this.viewport.querySelectorAll('[data-quiz-option]');
    for (var i = 0; i < cards.length; i++) {
      var on = i === optionIndex;
      cards[i].classList.toggle('is-selected', on);
      cards[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }

    var self = this;
    window.setTimeout(function () {
      if (self.index < self.totalSteps() - 1) {
        self.index += 1;
        self.renderStep();
      } else {
        self.renderResult();
      }
    }, ADVANCE_DELAY);
  };

  PruvQuiz.prototype.back = function () {
    if (this.root.classList.contains('is-result')) {
      this.index = this.totalSteps() - 1;
      this.renderStep();
      return;
    }
    if (this.index === 0) return;
    this.index -= 1;
    this.renderStep();
  };

  /* ---- scoring -------------------------------------------------------- */

  PruvQuiz.prototype.score = function () {
    var self = this;
    var n = this.cfg.products.length;
    var totals = new Array(n).fill(0);
    // Points contributed by the single highest-weighted question. Used to break
    // ties, so a draw always falls to whatever the user named as their main
    // concern rather than to arbitrary block order.
    var primary = new Array(n).fill(0);
    // Per product, the reason clauses of answers that actually contributed.
    var reasons = [];
    for (var i = 0; i < n; i++) reasons.push([]);

    var topWeight = -Infinity;
    this.cfg.steps.forEach(function (step) {
      var w = step.weight === undefined ? 1 : step.weight;
      if (w > topWeight) topWeight = w;
    });

    this.cfg.steps.forEach(function (step, si) {
      var ai = self.answers[si];
      if (ai === undefined) return;
      var opt = step.options[ai];
      if (!opt || !opt.weights) return;
      var w = step.weight === undefined ? 1 : step.weight;
      opt.weights.forEach(function (val, pi) {
        if (pi >= n) return;
        var pts = val * w;
        totals[pi] += pts;
        if (w === topWeight) primary[pi] += pts;
        if (val > 0 && opt.reason) {
          reasons[pi].push({ reason: opt.reason, points: pts, answer: opt.label });
        }
      });
    });

    var ranked = this.cfg.products
      .map(function (p, i) {
        return { product: p, index: i, total: totals[i], primary: primary[i], reasons: reasons[i] };
      })
      .sort(function (a, b) {
        // Score desc, then the stated main concern, then block order.
        if (b.total !== a.total) return b.total - a.total;
        if (b.primary !== a.primary) return b.primary - a.primary;
        return a.index - b.index;
      });

    // Strongest reason first, so the explanation leads with what mattered most.
    ranked.forEach(function (r) {
      r.reasons.sort(function (a, b) {
        return b.points - a.points;
      });
    });

    return ranked;
  };

  /* ---- result --------------------------------------------------------- */

  PruvQuiz.prototype.productCard = function (entry, isHero) {
    var p = entry.product;
    var media = p.image
      ? h('div', { class: 'pruv-quiz__card-media' }, [
          h('img', { src: p.image, alt: p.title, loading: 'lazy', width: '400', height: '400' })
        ])
      : null;

    var reasonList = null;
    if (isHero && entry.reasons.length) {
      reasonList = h(
        'ul',
        { class: 'pruv-quiz__reasons' },
        entry.reasons.slice(0, 3).map(function (r) {
          return h('li', { class: 'pruv-quiz__reason' }, [
            h('span', { class: 'pruv-quiz__reason-tick', 'aria-hidden': 'true' }),
            h('span', {}, [
              h('strong', { text: r.answer }),
              h('span', { text: ' — ' + r.reason })
            ])
          ]);
        })
      );
    }

    return h(
      'div',
      { class: 'pruv-quiz__card' + (isHero ? ' pruv-quiz__card--hero' : '') },
      [
        media,
        h('div', { class: 'pruv-quiz__card-body' }, [
          p.axis ? h('span', { class: 'pruv-quiz__card-axis', text: p.axis }) : null,
          h('h4', { class: 'pruv-quiz__card-title', text: p.title }),
          isHero && p.heroLine ? h('p', { class: 'pruv-quiz__card-line', text: p.heroLine }) : null,
          reasonList,
          h('div', { class: 'pruv-quiz__card-foot' }, [
            p.price ? h('span', { class: 'pruv-quiz__card-price', html: p.price }) : null,
            p.url
              ? h('a', {
                  class: 'pruv-quiz__card-cta' + (isHero ? '' : ' pruv-quiz__card-cta--ghost'),
                  href: p.url,
                  text: isHero ? 'Shop this' : 'View'
                })
              : null
          ])
        ])
      ]
    );
  };

  PruvQuiz.prototype.renderResult = function () {
    var self = this;
    var ranked = this.score();
    var hero = ranked[0];
    var rest = ranked.slice(1).filter(function (r) {
      return r.total > 0;
    });

    this.updateChrome(true);

    var kids = [
      h('div', { class: 'pruv-quiz__result-head' }, [
        h('p', { class: 'pruv-quiz__step-eyebrow', text: this.cfg.result.eyebrow || 'Your result' }),
        h('h3', { class: 'pruv-quiz__result-title', text: this.cfg.result.heading || 'Your routine' }),
        this.cfg.result.text ? h('p', { class: 'pruv-quiz__help', text: this.cfg.result.text }) : null
      ]),
      this.productCard(hero, true)
    ];

    if (rest.length) {
      kids.push(
        h('div', { class: 'pruv-quiz__supporting' }, [
          h('p', {
            class: 'pruv-quiz__supporting-label',
            text: this.cfg.result.supportingLabel || 'Complete your ritual'
          }),
          h(
            'div',
            { class: 'pruv-quiz__supporting-grid' },
            rest.map(function (r) {
              return self.productCard(r, false);
            })
          )
        ])
      );
    }

    if (this.cfg.doctor && this.cfg.doctor.enabled) {
      var d = this.cfg.doctor;
      kids.push(
        h('div', { class: 'pruv-quiz__doctor' }, [
          h('div', { class: 'pruv-quiz__doctor-photo' }, [
            d.image
              ? h('img', { src: d.image, alt: d.name || 'Doctor', loading: 'lazy', width: '160', height: '160' })
              : h('span', { class: 'pruv-quiz__doctor-placeholder', 'aria-hidden': 'true', text: 'Photo' })
          ]),
          h('div', { class: 'pruv-quiz__doctor-body' }, [
            h('p', { class: 'pruv-quiz__doctor-badge', text: d.badge || 'Doctor recommended' }),
            d.quote ? h('p', { class: 'pruv-quiz__doctor-quote', text: d.quote }) : null,
            h('p', { class: 'pruv-quiz__doctor-name', text: d.name || 'Dr. [Name]' }),
            h('p', { class: 'pruv-quiz__doctor-role', text: d.role || '[Position / qualification]' }),
            d.disclaimer ? h('p', { class: 'pruv-quiz__doctor-disclaimer', text: d.disclaimer }) : null
          ])
        ])
      );
    }

    var restart = h('button', { type: 'button', class: 'pruv-quiz__restart', text: 'Retake the test' });
    restart.addEventListener('click', function () {
      self.answers = [];
      self.index = 0;
      self.renderStep();
    });
    kids.push(h('div', { class: 'pruv-quiz__result-foot' }, [restart]));

    var panel = h('div', { class: 'pruv-quiz__step pruv-quiz__step--result' }, kids);
    this.swap(panel);

    this.root.dispatchEvent(
      new CustomEvent('pruv:quiz:complete', { bubbles: true, detail: { ranked: ranked } })
    );

    window.setTimeout(
      function () {
        var t = self.viewport.querySelector('.pruv-quiz__result-title');
        if (t) {
          t.setAttribute('tabindex', '-1');
          t.focus({ preventScroll: true });
        }
      },
      REDUCED ? 0 : 180
    );
  };

  /* ---- boot ----------------------------------------------------------- */

  function initAll(scope) {
    (scope || document).querySelectorAll('[data-pruv-quiz]').forEach(function (el) {
      if (el.dataset.quizInit === 'true') return;
      el.dataset.quizInit = 'true';
      new PruvQuiz(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', function (e) {
      initAll(e.target);
    });
  }

  window.PruvQuizInit = initAll;
})();
