(function () {
  function init(root) {
    var tabs = root.querySelectorAll('[data-fm-tab]');
    var panels = root.querySelectorAll('[data-fm-panel]');
    var search = root.querySelector('[data-fm-search]');
    var empty = root.querySelector('[data-fm-empty]');
    var tabBar = root.querySelector('.pruv-fm__tabs');

    function show(idx) {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-fm-tab') === String(idx) ? 'true' : 'false'); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-fm-panel') !== String(idx); });
    }

    function filter(q) {
      q = q.trim().toLowerCase();
      var any = false;
      if (!q) {
        root.classList.remove('is-searching');
        root.querySelectorAll('[data-fm-item], .pruv-fm__group').forEach(function (el) { el.hidden = false; });
        empty.hidden = true;
        if (tabBar) tabBar.hidden = false;
        var sel = root.querySelector('[data-fm-tab][aria-selected="true"]');
        show(sel ? sel.getAttribute('data-fm-tab') : 1);
        return;
      }
      root.classList.add('is-searching');
      if (tabBar) tabBar.hidden = true;
      panels.forEach(function (p) {
        var hits = 0;
        p.querySelectorAll('[data-fm-item]').forEach(function (it) {
          var m = it.textContent.toLowerCase().indexOf(q) !== -1;
          it.hidden = !m;
          if (m) hits++;
        });
        p.querySelectorAll('.pruv-fm__group').forEach(function (g) { g.hidden = true; });
        p.hidden = hits === 0;
        if (hits) any = true;
      });
      empty.hidden = any;
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        if (search && search.value) { search.value = ''; filter(''); }
        show(t.getAttribute('data-fm-tab'));
      });
    });
    if (search) search.addEventListener('input', function () { filter(search.value); });

    var m = location.hash.match(/^#fm-tab-(\d+)$/);
    if (m) show(m[1]);
  }
  document.querySelectorAll('[data-pruv-fm]').forEach(init);
})();
