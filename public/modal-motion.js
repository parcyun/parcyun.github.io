(function () {
  if (typeof window === 'undefined' || window.psModalMotion) return;
  const pending = new WeakMap();
  const style = document.createElement('style');
  style.textContent = '[data-ps-modal-closing]{pointer-events:none!important}dialog[data-ps-modal-closing]::backdrop{animation:ps-modal-backdrop-out .18s ease-in forwards}@keyframes ps-modal-backdrop-out{to{background-color:transparent;backdrop-filter:blur(0);-webkit-backdrop-filter:blur(0)}}';
  document.head.append(style);
  function cancel(node) {
    const entry = pending.get(node);
    if (!entry) return;
    entry.cancelled = true;
    entry.animations.forEach(animation => animation.cancel());
    pending.delete(node);
    node.removeAttribute('data-ps-modal-closing');
  }
  function exit(node, complete) {
    if (!node || !node.isConnected || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !node.animate) {
      complete(); return Promise.resolve();
    }
    if (pending.has(node)) return pending.get(node).promise;
    const sheet = node.matches('.ranking-sheet,.gg-ranking-dialog');
    const card = node.querySelector('.coffee-card,.ps-feedback-card,.spell-onboarding-card,.update-story-card,.ts-popup-card');
    const moving = card || node;
    const current = getComputedStyle(moving);
    const animations = [moving.animate([
      { opacity: current.opacity, transform: current.transform },
      { opacity: 0, transform: sheet ? 'translateY(100%)' : 'translateY(12px) scale(.98)' }
    ], { duration: sheet ? 200 : 180, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })];
    if (card) animations.push(node.animate([{ opacity: getComputedStyle(node).opacity }, { opacity: 0 }], { duration: 180, fill: 'forwards' }));
    node.setAttribute('data-ps-modal-closing', '');
    const entry = { animations, cancelled: false };
    pending.set(node, entry);
    entry.promise = Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (entry.cancelled) return;
      try { complete(); } finally { cancel(node); }
    });
    return entry.promise;
  }
  function bindDialog(node) {
    const close = node.close.bind(node), show = node.showModal.bind(node);
    node.close = (...args) => node.open ? exit(node, () => close(...args)) : close(...args);
    node.showModal = (...args) => { cancel(node); return show(...args); };
    node.addEventListener('cancel', event => { event.preventDefault(); node.close(); });
    return node;
  }
  window.psModalMotion = { exit, cancel, bindDialog };
})();
