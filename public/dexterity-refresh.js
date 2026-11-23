(() => {
  function init() {
    if (!document.querySelector('.dexterity-dock')) return;
    const root = document.documentElement;
    const indicator = document.createElement('div');
    indicator.className = 'dexterity-refresh';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-label', '당겨서 새로고침');
    indicator.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg>';
    document.body.append(indicator);
    root.classList.add('dexterity-refresh-enabled');
    let start = null, distance = 0, refreshing = false;
    const reset = () => {
      start = null; distance = 0;
      indicator.classList.remove('is-visible', 'is-ready');
      indicator.style.removeProperty('--pull');
    };
    const blocked = target => {
      if (document.querySelector('dialog[open]') || getComputedStyle(root).overflowY === 'hidden' || getComputedStyle(document.body).overflowY === 'hidden') return true;
      for (let node = target; node && node !== document.body; node = node.parentElement) {
        if (node.matches('input,textarea,select,button,a,[contenteditable],iframe,[role="slider"],#dexterity-map,.place-map-preview')) return true;
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY + style.overflowX) && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)) return true;
      }
      return false;
    };
    const onStart = event => {
      reset();
      if (refreshing || !matchMedia('(pointer:coarse)').matches || event.touches.length !== 1 || window.scrollY > 0 || blocked(event.target)) return;
      start = {x: event.touches[0].clientX, y: event.touches[0].clientY};
    };
    const onMove = event => {
      if (!start) return;
      if (event.touches.length !== 1 || window.scrollY > 0) { reset(); return; }
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (dy < 0 || Math.abs(dx) > Math.abs(dy)) { reset(); return; }
      if (dy < 10) { distance = 0; indicator.classList.remove('is-visible', 'is-ready'); return; }
      if (!event.cancelable) { reset(); return; }
      event.preventDefault();
      distance = dy;
      indicator.style.setProperty('--pull', Math.min(dy * .45, 72) + 'px');
      indicator.classList.add('is-visible');
      indicator.classList.toggle('is-ready', dy >= 120);
      indicator.setAttribute('aria-label', dy >= 120 ? '놓으면 새로고침' : '당겨서 새로고침');
    };
    const onEnd = () => {
      const ready = start && distance >= 120;
      reset();
      if (!ready || refreshing) return;
      refreshing = true;
      indicator.classList.add('is-visible', 'is-refreshing');
      indicator.style.setProperty('--pull', '56px');
      indicator.setAttribute('aria-label', '새로고침 중');
      window.location.reload();
    };
    document.addEventListener('touchstart', onStart, {passive: true});
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
      root.classList.remove('dexterity-refresh-enabled');
      indicator.remove();
    };
  }
  if (window.psPageLifecycle) window.psPageLifecycle.register('dexterity-refresh', init);
  else init();
})();
