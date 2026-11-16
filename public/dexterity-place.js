(function () {
  const links = document.querySelectorAll('[data-naver-place]');
  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!android && !ios) return;
  const query = encodeURIComponent('경주 향미사');
  const params = 'query=' + query + '&appname=' + encodeURIComponent('https://parcyun.github.io');
  const web = 'https://map.naver.com/p/search/' + query;
  let fallback;
  function cancelFallback() { clearTimeout(fallback); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelFallback(); });
  window.addEventListener('pagehide', cancelFallback);
  links.forEach(link => {
    link.href = android
      ? 'intent://search?' + params + '#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;S.browser_fallback_url=' + encodeURIComponent(web) + ';end'
      : 'nmap://search?' + params;
    if (ios) link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      cancelFallback();
      const clickedAt = Date.now();
      fallback = setTimeout(() => {
        if (!document.hidden && Date.now() - clickedAt < 2500) window.location.assign(web);
      }, 1800);
    });
  });
})();

