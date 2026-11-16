/* Shared service copy behavior: copy the service address, preserving editor selection. */
(function () {
  if (window.__serviceContentGuard) return;
  window.__serviceContentGuard = true;
  var style = document.createElement('style');
  style.dataset.serviceContentGuard = '';
  style.textContent = 'html,body,body *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none}input,textarea,[contenteditable]:not([contenteditable="false"]),[contenteditable]:not([contenteditable="false"]) *{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default}#service-copy-toast{position:fixed;left:50%;bottom:max(28px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483647;padding:12px 20px;border:1px solid #ffffff35;border-radius:18px;background:#24262bd9;color:#fff;font:500 14px/1.5 system-ui,sans-serif;box-shadow:0 8px 30px #0003;backdrop-filter:blur(16px);pointer-events:none;white-space:nowrap}';
  (document.head || document.documentElement).appendChild(style);
  var timer;
  function address() {
    var configured = document.querySelector('meta[name="service-url"]');
    return configured ? configured.content : location.origin + '/';
  }
  function toast() {
    var node = document.getElementById('service-copy-toast');
    if (!node) {
      node = document.createElement('div');node.id = 'service-copy-toast';
      node.setAttribute('role', 'status');node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.textContent = '클립보드에 복사되었습니다';node.hidden = false;
    clearTimeout(timer);timer = setTimeout(function () { node.hidden = true; }, 2200);
  }
  function fallback() {
    var node = document.createElement('textarea');node.value = address();
    node.style.cssText = 'position:fixed;left:-10000px;top:0';document.body.appendChild(node);
    var focus = document.activeElement;node.select();
    var ok = document.execCommand('copy');node.remove();
    if (focus && focus.focus) focus.focus({preventScroll:true});
    return ok;
  }
  function copyAddress() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(address()).then(toast, function () { if (fallback()) toast(); });
    } else if (fallback()) toast();
  }
  document.addEventListener('selectstart', function (event) {
    var target = event.target;
    if (!(target instanceof Element) || !target.closest('input,textarea,[contenteditable]:not([contenteditable="false"])')) event.preventDefault();
  }, true);
  document.addEventListener('copy', function (event) {
    event.preventDefault();event.stopImmediatePropagation();
    if (event.clipboardData) {event.clipboardData.setData('text/plain', address());toast();}
  }, true);
  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();event.stopImmediatePropagation();copyAddress();
    }
  }, true);
  document.addEventListener('contextmenu', function (event) {
    event.preventDefault();copyAddress();
  }, true);
  document.addEventListener('click', function (event) {
    var button = event.target instanceof Element && event.target.closest('button,[role="button"]');
    if (!button) return;
    var label = (button.getAttribute('aria-label') || '') + ' ' + (button.getAttribute('title') || '') + ' ' + (button.textContent || '');
    if (!/복사본/.test(label) && /복사|\bcopy\b/i.test(label)) {
      event.preventDefault();event.stopImmediatePropagation();copyAddress();
    }
  }, true);
})();
