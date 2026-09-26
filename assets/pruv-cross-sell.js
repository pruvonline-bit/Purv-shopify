/**
 * Prüv Product Cross-Sell — Complete Your Ritual Section JS & AJAX Cart
 */
document.addEventListener('DOMContentLoaded', function () {
  var crossSellSections = document.querySelectorAll('[data-pruv-cross-sell]');
  if (!crossSellSections.length) return;

  crossSellSections.forEach(function (section) {
    initCrossSell(section);
  });

  function initCrossSell(section) {
    var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. 1-Click AJAX Add to Cart
    var addBtn = section.querySelector('[data-cross-sell-add]');
    if (addBtn) {
      addBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var variantId = addBtn.getAttribute('data-variant-id');
        if (!variantId) return;

        var originalHTML = addBtn.innerHTML;
        addBtn.disabled = true;
        addBtn.innerHTML = '<span>Adding...</span>';

        fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: 1,
          }),
        })
          .then(function (response) {
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

            // Broadcast cart update event for Dawn theme drawer
            if (typeof pubsub !== 'undefined' && pubsub.publish) {
              pubsub.publish('cart-update', { source: 'pruv-cross-sell', data: data });
            }

            // Also check for cart-drawer or open cart
            var cartDrawer = document.querySelector('cart-drawer');
            if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
              cartDrawer.renderContents(data);
            }

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
    }

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

      var synergy = section.querySelector('[data-cross-sell-synergy]');
      if (synergy) {
        gsap.from(synergy, {
          scrollTrigger: {
            trigger: synergy,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 20,
          duration: 0.7,
          ease: 'power2.out',
        });
      }
    }
  }

  window.addEventListener('load', function () {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
});
