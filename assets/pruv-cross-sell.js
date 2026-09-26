/**
 * Prüv Product Cross-Sell — Complete Your Ritual Section JS & AJAX Cart
 */
document.addEventListener('DOMContentLoaded', function () {
  var crossSellSections = document.querySelectorAll('[data-pruv-cross-sell]');
  if (!crossSellSections.length) return;

  crossSellSections.forEach(function (section) {
    initCrossSell(section);
  });

  /* Same approach as assets/pruv-routine-builder.js: cart-notification.js's
     renderContents() only handles a single-line add, so pick every added line
     out of the cart-notification-product section. False means "go to /cart". */
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

  function initCrossSell(section) {
    var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. 1-Click AJAX Add to Cart (single pair product or full regimen bundle)
    section.querySelectorAll('[data-cross-sell-add]').forEach(function (addBtn) {
      addBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var multiIds = addBtn.getAttribute('data-variant-ids');
        var variantId = addBtn.getAttribute('data-variant-id');
        var items = multiIds
          ? multiIds.split(',').filter(Boolean).map(function (id) {
              return { id: id, quantity: 1 };
            })
          : variantId
          ? [{ id: variantId, quantity: 1 }]
          : [];
        if (!items.length) return;

        var originalHTML = addBtn.innerHTML;
        addBtn.disabled = true;
        addBtn.innerHTML = '<span>Adding...</span>';

        var cartUI = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        var body = { items: items };
        if (cartUI && typeof cartUI.getSectionsToRender === 'function') {
          body.sections = cartUI
            .getSectionsToRender()
            .map(function (s) {
              return s.id;
            })
            .join(',');
          body.sections_url = window.location.pathname;
        }

        fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        })
          .then(function (response) {
            if (!response.ok) throw new Error('Cart add failed: ' + response.status);
            return response.json();
          })
          .then(function (data) {
            addBtn.classList.add('is-added');
            addBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Added to Bag!</span>
            `;

            if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
              publish(PUB_SUB_EVENTS.cartUpdate, { source: 'pruv-cross-sell', cartData: data });
            }

            var rendered = false;
            try {
              rendered = renderCartUI(cartUI, data, addBtn);
            } catch (err) {
              rendered = false;
            }
            // The items are in the cart either way, so going there loses nothing.
            if (!rendered) window.location.href = (window.routes && window.routes.cart_url) || '/cart';

            setTimeout(function () {
              addBtn.classList.remove('is-added');
              addBtn.innerHTML = originalHTML;
              addBtn.disabled = false;
            }, 3000);
          })
          .catch(function (error) {
            console.error('Error adding cross-sell to cart:', error);
            addBtn.innerHTML = '<span>Failed to Add</span>';
            setTimeout(function () {
              addBtn.innerHTML = originalHTML;
              addBtn.disabled = false;
            }, 2500);
          });
      });
    });

    // 2. GSAP ScrollTrigger Animations
    if (hasGsap && !prefersReducedMotion) {
      gsap.registerPlugin(ScrollTrigger);

      var header = section.querySelector('[data-cross-sell-header]');
      if (header) {
        gsap.from(header.children, {
          scrollTrigger: {
            trigger: header,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 28,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
        });
      }

      var cards = section.querySelectorAll('.pruv-cross-sell__card');
      var connector = section.querySelector('.pruv-cross-sell__connector');
      var experience = section.querySelector('[data-cross-sell-experience]');

      if (experience && cards.length) {
        var isMobile = window.matchMedia('(max-width: 749px)').matches;
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: experience,
            start: isMobile ? 'top 88%' : 'top 82%',
            toggleActions: 'play none none none',
          },
        });

        if (isMobile) {
          // Mobile: pure vertical emergence to prevent any horizontal overflow or zig-zag misalignment
          tl.from(cards[0], {
            opacity: 0,
            y: 20,
            duration: 0.55,
            ease: 'power2.out',
            clearProps: 'all',
          });

          if (connector) {
            tl.from(
              connector,
              {
                opacity: 0,
                scale: 0.8,
                duration: 0.4,
                ease: 'back.out(1.5)',
                clearProps: 'all',
              },
              '-=0.2'
            );
          }

          if (cards[1]) {
            tl.from(
              cards[1],
              {
                opacity: 0,
                y: 20,
                duration: 0.55,
                ease: 'power2.out',
                clearProps: 'all',
              },
              '-=0.25'
            );
          }
        } else {
          // Desktop: elegant horizontal convergence
          tl.from(cards[0], {
            opacity: 0,
            x: -30,
            duration: 0.75,
            ease: 'power2.out',
            clearProps: 'all',
          });

          if (connector) {
            tl.from(
              connector,
              {
                opacity: 0,
                scale: 0.7,
                duration: 0.5,
                ease: 'back.out(1.7)',
                clearProps: 'all',
              },
              '-=0.3'
            );
          }

          if (cards[1]) {
            tl.from(
              cards[1],
              {
                opacity: 0,
                x: 30,
                duration: 0.75,
                ease: 'power2.out',
                clearProps: 'all',
              },
              '-=0.4'
            );
          }
        }
      }

      section.querySelectorAll('[data-cross-sell-regimen], [data-cross-sell-bundle]').forEach(function (block) {
        gsap.from(block, {
          scrollTrigger: {
            trigger: block,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 20,
          duration: 0.7,
          ease: 'power2.out',
        });
      });
    }
  }

  window.addEventListener('load', function () {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
});
