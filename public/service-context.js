/* Shared service-route classification for the footer, reviews, and feedback. */
(function (root) {
  var SERVICE_KEYS = ['home', 'spell-drill', 'atlas-gears', 'geoweb', 'other'];
  var ROUTES = {
    '/': 'home',
    '/atlas-gears': 'atlas-gears',
    '/world-map': 'geoweb',
    '/korean-spell-drill-parcyun': 'spell-drill'
  };
  var PREVIEW_KEYS = {
    home: 'home',
    atlas: 'atlas-gears',
    geoweb: 'geoweb',
    spell: 'spell-drill'
  };

  function normalizePath(pathname) {
    var path = String(pathname || '/').toLowerCase();
    if (path.charAt(0) !== '/') return '/';
    path = path.split('?')[0].split('#')[0].replace(/\/+/g, '/');
    return path === '/' ? path : path.replace(/\/+$/, '');
  }

  function requestedService(search) {
    var value = new URLSearchParams(String(search || '')).get('service');
    return SERVICE_KEYS.indexOf(value) >= 0 ? value : 'other';
  }

  function resolveServiceKey(pathname, search, previewContext) {
    if (previewContext && PREVIEW_KEYS[previewContext]) return PREVIEW_KEYS[previewContext];
    var path = normalizePath(pathname);
    if (path === '/reviews') return requestedService(search);
    return ROUTES[path] || 'other';
  }

  function sourcePathForFeedback(pathname, search) {
    var path = normalizePath(pathname);
    var suffix = pathname && String(pathname).endsWith('/') && path !== '/' ? '/' : '';
    if (path === '/reviews') {
      var service = requestedService(search);
      return path + suffix + (service === 'other' ? '' : '?service=' + encodeURIComponent(service));
    }
    return path + suffix;
  }

  root.PSServiceContext = {
    allowedServiceKeys: SERVICE_KEYS.slice(),
    normalizePath: normalizePath,
    resolveServiceKey: resolveServiceKey,
    sourcePathForFeedback: sourcePathForFeedback
  };
})(typeof window !== 'undefined' ? window : globalThis);
