/**
 * Router — zero-flicker, no blank frames
 * Uses a two-layer approach: a persistent shell (#app-shell) that never
 * gets wiped, and a content area (#page) that swaps smoothly.
 */
const Router = (() => {
  const routes = {};
  let currentRoute = null;
  let currentParams = {};
  let _busy = false;
  let _suppressHash = false;
  let _pendingNav = null;

  function register(name, fn) { routes[name] = fn; }

  function navigate(name, params = {}) {
    if (!Auth.isLoggedIn() && name !== 'login') { _exec('login', {}); return; }
    // Queue if busy, don't drop
    if (_busy) { _pendingNav = { name, params }; return; }
    if (name === currentRoute && _sameParams(params, currentParams)) return;
    currentRoute = name;
    currentParams = params;
    _setHash(name);
    _exec(name, params);
  }

  // Used by sync — updates data without any visual transition
  function silentRefresh() {
    if (!currentRoute || currentRoute === 'login' || currentRoute === 'map') return;
    if (_busy) return;
    const fn = routes[currentRoute];
    if (fn) {
      // Run the page function but suppress the opacity animation
      _busy = true;
      Promise.resolve(fn(currentParams)).then(() => {
        _busy = false;
        if (_pendingNav) { const n = _pendingNav; _pendingNav = null; navigate(n.name, n.params); }
      }).catch(() => { _busy = false; });
    }
  }

  function _exec(name, params) {
    const fn = routes[name];
    if (!fn) return;
    const page = _getPage();

    _busy = true;
    // Fade out
    page.style.transition = 'opacity 0.12s ease';
    page.style.opacity = '0';

    // Wait for fade, then swap content
    setTimeout(() => {
      Promise.resolve(fn(params)).then(() => {
        // Fade in after content is written
        requestAnimationFrame(() => {
          page.style.opacity = '1';
          setTimeout(() => {
            page.style.transition = '';
            _busy = false;
            if (_pendingNav) {
              const n = _pendingNav; _pendingNav = null;
              navigate(n.name, n.params);
            }
          }, 130);
        });
      }).catch(err => {
        console.error('Route error:', err);
        page.style.opacity = '1';
        _busy = false;
      });
    }, 100);
  }

  function _getPage() {
    // Use #app directly — it is the page container
    return document.getElementById('app') || document.body;
  }

  function _setHash(name) {
    const h = '#' + name;
    if (window.location.hash !== h) {
      _suppressHash = true;
      history.replaceState(null, '', h);
    }
  }

  function _sameParams(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function init() {
    const hash = window.location.hash.replace('#', '') || 'login';
    if (!Auth.isLoggedIn()) { currentRoute = 'login'; _exec('login', {}); return; }
    currentRoute = hash;
    currentParams = {};
    _exec(hash, {});
  }

  window.addEventListener('popstate', () => {
    if (_suppressHash) { _suppressHash = false; return; }
    const hash = window.location.hash.replace('#', '') || 'login';
    if (!Auth.isLoggedIn()) { _exec('login', {}); return; }
    if (hash === currentRoute) return;
    currentRoute = hash;
    currentParams = {};
    _exec(hash, {});
  });

  // Keep hashchange as fallback for older browsers
  window.addEventListener('hashchange', () => {
    if (_suppressHash) { _suppressHash = false; return; }
    const hash = window.location.hash.replace('#', '') || 'login';
    if (!Auth.isLoggedIn()) { _exec('login', {}); return; }
    if (hash === currentRoute) return;
    currentRoute = hash;
    currentParams = {};
    _exec(hash, {});
  });

  return {
    register,
    navigate,
    silentRefresh,
    init,
    getCurrentRoute: () => currentRoute,
    getCurrentParams: () => currentParams,
    // backward compat
    render: (name, params = {}) => navigate(name, params)
  };
})();

window.Router = Router;
