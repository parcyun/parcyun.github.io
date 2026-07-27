/* Shared service-route classification for the footer, reviews, and feedback. */
(function (root) {
  var SERVICE_KEYS = ['home', 'spell-drill', 'atlas-gears', 'geoweb', 'works', 'other'];
  var ROUTES = {
    '/': 'home',
    '/atlas-gears': 'atlas-gears',
    '/world-map': 'geoweb',
    '/spell-drill': 'spell-drill',
    '/korean-spell-drill-parcyun': 'spell-drill'
  };
  var SCOPED_SERVICES = ['spell-drill', 'atlas-gears', 'geoweb', 'works'];
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
    return value === 'all' || SERVICE_KEYS.indexOf(value) >= 0 ? value : 'other';
  }

  function requestedSource(search) {
    var value = new URLSearchParams(String(search || '')).get('source');
    return SERVICE_KEYS.indexOf(value) >= 0 && value !== 'unclassified' ? value : 'other';
  }

  function resolveServiceKey(pathname, search, previewContext) {
    if (previewContext && PREVIEW_KEYS[previewContext]) return PREVIEW_KEYS[previewContext];
    var path = normalizePath(pathname);
    if (path === '/reviews') return requestedService(search);
    if (path === '/works' || path.indexOf('/works/') === 0) return 'works';
    return ROUTES[path] || 'other';
  }

  function resolveViewServiceKey(pathname, search, previewContext) {
    var path = normalizePath(pathname);
    if (path === '/reviews') return requestedService(search);
    var service = resolveServiceKey(pathname, search, previewContext);
    return SCOPED_SERVICES.indexOf(service) >= 0 ? service : 'all';
  }

  function resolveSubmissionServiceKey(pathname, search, previewContext) {
    return normalizePath(pathname) === '/reviews'
      ? requestedSource(search)
      : resolveServiceKey(pathname, search, previewContext);
  }

  function sourcePathForFeedback(pathname, search) {
    var path = normalizePath(pathname);
    var suffix = pathname && String(pathname).endsWith('/') && path !== '/' ? '/' : '';
    if (path === '/reviews') {
      var service = requestedService(search);
      var source = requestedSource(search);
      var query = new URLSearchParams();
      if (service !== 'other') query.set('service', service);
      if (service === 'all' || source !== 'other') query.set('source', source);
      return path + suffix + (query.toString() ? '?' + query.toString() : '');
    }
    return path + suffix;
  }

  root.PSServiceContext = {
    allowedServiceKeys: SERVICE_KEYS.slice(),
    normalizePath: normalizePath,
    resolveServiceKey: resolveServiceKey,
    resolveViewServiceKey: resolveViewServiceKey,
    resolveSubmissionServiceKey: resolveSubmissionServiceKey,
    sourcePathForFeedback: sourcePathForFeedback
  };
})(typeof window !== 'undefined' ? window : globalThis);
