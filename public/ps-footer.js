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

/* parcyun studio · single shared footer for Astro pages and static tools */
(function () {
  if (window.__psFooter) return;
  window.__psFooter = true;

  var host = document.querySelector('[data-ps-footer]');
  if (!host) return;
  host.id = 'ps-footer-root';

  var previewConfig = window.__psFooterPreviewConfig || null;
  var previewContext = previewConfig && previewConfig.context;
  var previewContexts = {
    home: { showLinks: true, showFeedback: false, showReview: false },
    atlas: { showLinks: false, showFeedback: false, showReview: true },
    geoweb: { showLinks: false, showFeedback: true, showReview: true },
    spell: { showLinks: false, showFeedback: true, showReview: true }
  };
  var contextConfig = previewConfig && (previewContexts[previewContext] || previewContexts.home);
  var showFeedback = contextConfig ? contextConfig.showFeedback : host.getAttribute('data-show-feedback') !== 'false';
  var showReview = contextConfig ? contextConfig.showReview : host.getAttribute('data-show-review') !== 'false';
  var showLinks = contextConfig ? contextConfig.showLinks : host.getAttribute('data-show-links') !== 'false';
  var reviewLabel = host.getAttribute('data-review-label') || '리뷰 남기기';
  var reviewService = host.getAttribute('data-review-service') || '';
  var servicePath = host.getAttribute('data-service-path') || location.pathname;
  var siteUrl = host.getAttribute('data-site-url') || location.origin;
  var ASSET_VERSION = '20261116-footer-1';
  var guideService = /^\/world-map\/?$/.test(servicePath) ? 'geoweb' : /^\/spell-drill\/?$/.test(servicePath) ? 'spell-drill' : /^\/satury\/?$/.test(servicePath) ? 'satury' : '';
  var guideNames = {geoweb:'지오웹','spell-drill':'스펠드릴',satury:'사투리'};
  var submissionServiceKey = window.PSServiceContext
    ? window.PSServiceContext.resolveSubmissionServiceKey(servicePath, location.search, previewContext)
    : 'other';
  var viewServiceKey = window.PSServiceContext
    ? window.PSServiceContext.resolveViewServiceKey(servicePath, location.search, previewContext)
    : submissionServiceKey;
  var reviewHref = `/reviews/?service=${encodeURIComponent(reviewService || viewServiceKey)}&source=${encodeURIComponent(submissionServiceKey)}`;
  if (host.hasAttribute('data-site-url')) reviewHref = new URL(reviewHref, siteUrl).href;
  window.__psFeedbackSourcePath = servicePath;
  window.__psFeedbackServiceKey = viewServiceKey;
  window.__psFeedbackSubmissionServiceKey = submissionServiceKey;
  var source = document.currentScript && document.currentScript.src;
  var coffeeEmail = 'pen.layered@gmail.com';
  var coffeeIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M3 8h14v6.5A4.5 4.5 0 0 1 12.5 19h-5A4.5 4.5 0 0 1 3 14.5Z"/><line x1="7" y1="2.5" x2="7" y2="4.5"/><line x1="11" y1="2.5" x2="11" y2="4.5"/></svg>';
  var instagramIcon = '<svg class="ps-ig-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.3 1 .4 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .3-2.2.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 5.5a4.3 4.3 0 100 8.6 4.3 4.3 0 000-8.6zm5.4-.3a1 1 0 11-2 0 1 1 0 012 0zM12 9.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/></svg>';
  var footerLinks = '<footer class="ps-footer"><div class="ps-footer-inner"><nav class="ps-flinks" aria-label="바로가기">'
    + '<a href="https://linktr.ee/parcyun" class="ps-flink" target="_blank" rel="noopener">Linktree</a>'
    + '<a href="https://github.com/parcyun" class="ps-flink" target="_blank" rel="noopener">GitHub</a>'
    + '<a href="https://padlet.com/penlayered/parcyun-studio-19rq7rovocsv24vr" class="ps-flink" target="_blank" rel="noopener">Padlet</a>'
    + '<a href="/admin" class="ps-flink">admin</a>'
    + '</nav></div></footer>';

  host.innerHTML = (showLinks ? footerLinks : '')
    + '<div class="ps-brand-fixed">'
    + '<button type="button" class="ps-brand-coffee" id="ps-coffee"><span class="ico">' + coffeeIcon + '</span><span id="foot-coffee-label">커피 사주기</span></button>'
    + (showFeedback ? '<button type="button" class="ps-brand-feedback" id="foot-report" data-feedback-open>기능 개선 요청</button>' : '')
    + (showReview ? '<a class="ps-brand-review" href="' + reviewHref + '">' + reviewLabel + '</a>' : '')
    + (guideService ? '<button type="button" class="ps-brand-guide" id="foot-guidebook" data-guidebook-href="/dexterity/guidebook/' + guideService + '/" data-guidebook-title="' + guideNames[guideService] + ' 가이드북" aria-haspopup="dialog" aria-expanded="false">가이드북 보기</button>' : '')
    + '<span class="ps-brand-text">Designed by <span class="ps-signature">parcyun studio</span><a href="https://www.instagram.com/parcyun" class="ps-ig" target="_blank" rel="noopener">' + instagramIcon + '@parcyun</a></span>'
    + '</div>'
    + '<div class="coffee-modal" id="coffee-modal" hidden><div class="coffee-backdrop" data-coffee-close></div><div class="coffee-card" role="dialog" aria-modal="true" aria-labelledby="coffee-title">'
    + '<button class="coffee-close" id="coffee-close" type="button" aria-label="닫기">×</button><div class="coffee-emoji ico">' + coffeeIcon.replace('width="13" height="13"', 'width="40" height="40"') + '</div>'
    + '<h3 class="coffee-title" id="coffee-title">함께 만들어가요</h3><div id="coffee-info"><p class="coffee-sub" id="coffee-sub">찾아주셔서 감사합니다. 교육 현장에 도움이 될 아이디어나 함께 해보고 싶은 프로젝트가 있다면, 아래 이메일로 편하게 연락 주세요.</p>'
    + '<span class="coffee-email" id="coffee-email">' + coffeeEmail + '</span><div class="coffee-actions"><button class="coffee-copy" id="coffee-copy" type="button">주소 복사</button><button type="button" class="coffee-mail" id="coffee-compose">협업 메일 쓰기</button></div></div>'
    + '<form id="coffee-form" hidden><p class="coffee-sub">답장받을 이메일과 함께 제안을 보내주세요.</p>'
    + '<label>내 이메일 주소<input id="coffee-sender" name="email" type="email" autocomplete="email" maxlength="254" required></label>'
    + '<label>제목<input name="subject" maxlength="120" required></label>'
    + '<label>내용<textarea name="message" rows="5" maxlength="5000" required></textarea></label>'
    + '<label hidden aria-hidden="true">웹사이트<input name="website" tabindex="-1" autocomplete="off"></label>'
    + '<p class="coffee-notice">입력한 이메일과 내용은 문의 확인 및 답장에만 사용됩니다. 학생 등 다른 사람의 개인정보는 적지 말아 주세요. <a href="/privacy/" target="_blank" rel="noopener">개인정보처리방침</a></p>'
    + '<p id="coffee-send-status" role="status" aria-live="polite"></p><button type="submit" class="coffee-mail" id="coffee-send">발송</button></form>'
    + '</div></div>';
  if (guideService) { var guideScript=document.createElement('script');guideScript.src=new URL('game-guidebook.js?v=20261119-1',source||location.href).href;document.head.appendChild(guideScript); }
  if (previewConfig && previewConfig.enabled) host.addEventListener('click', function (event) {
    if (event.target.closest && event.target.closest('a[href]')) event.preventDefault();
  });

  var style = document.createElement('style');
  style.id = 'ps-footer-style';
  style.textContent = `
    .ps-has-footer-links{display:flex;flex-direction:column;min-height:100vh}
    #ps-footer-root{--ps-footer-primary:#ffb11a;--ps-footer-color:#8c8c8c;--ps-footer-muted:#8c8c8c;--ps-footer-bg:rgba(0,0,0,.82);--ps-footer-border:rgba(255,255,255,.08);--ps-footer-border-width:1px;--ps-footer-font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;--ps-footer-font-size:11px;--ps-footer-font-weight:400;--ps-footer-line-height:normal;--ps-footer-letter-spacing:.3px;--ps-footer-padding:4px 12px;--ps-footer-margin:0;--ps-footer-gap:8px;--ps-footer-radius:100px;--ps-footer-opacity:1;--ps-footer-display:flex;--ps-footer-signature:'Covered By Your Grace',cursive}
    #ps-footer-root .ps-footer{position:static;display:var(--ps-footer-display);flex-shrink:0;margin-top:auto;width:100%;background:var(--ps-footer-bg);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:var(--ps-footer-border-width) solid var(--ps-footer-border);font-family:var(--ps-footer-font-family);font-size:var(--ps-footer-font-size);font-weight:var(--ps-footer-font-weight);line-height:var(--ps-footer-line-height);letter-spacing:var(--ps-footer-letter-spacing);color:var(--ps-footer-color);opacity:var(--ps-footer-opacity)}
    #ps-footer-root .ps-footer-inner{max-width:1108px;margin:0 auto;padding:16px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:var(--ps-footer-gap)}@media(min-width:768px){#ps-footer-root .ps-footer-inner{padding:18px 48px}}
    #ps-footer-root .ps-flinks{display:flex;flex-wrap:wrap;align-items:center;gap:0;row-gap:4px;line-height:var(--ps-footer-line-height)}#ps-footer-root .ps-flink{font:inherit;letter-spacing:inherit;color:var(--ps-footer-muted);text-decoration:none;background:transparent;border:0;cursor:pointer;padding:0 10px;border-right:var(--ps-footer-border-width) solid var(--ps-footer-border);transition:color .18s}#ps-footer-root .ps-flink:last-of-type{border-right:0}#ps-footer-root .ps-flink:first-child{padding-left:0}#ps-footer-root .ps-flink:hover{color:var(--ps-footer-primary)}
    #ps-footer-root .ps-brand-fixed{position:fixed;left:20px;right:20px;bottom:calc(var(--ps-footer-h,0px) + 10px);z-index:9989;display:var(--ps-footer-display);width:max-content;max-width:calc(100vw - 40px);align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:var(--ps-footer-gap);font-family:var(--ps-footer-font-family);font-weight:var(--ps-footer-font-weight);font-size:var(--ps-footer-font-size);line-height:var(--ps-footer-line-height);letter-spacing:var(--ps-footer-letter-spacing);color:var(--ps-footer-color);background:var(--ps-footer-bg);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:var(--ps-footer-padding);margin:var(--ps-footer-margin);margin-left:auto;border-radius:var(--ps-footer-radius);border:var(--ps-footer-border-width) solid var(--ps-footer-border);opacity:var(--ps-footer-opacity)}
    #ps-footer-root .ps-brand-coffee,#ps-footer-root .ps-brand-feedback,#ps-footer-root .ps-brand-review,#ps-footer-root .ps-brand-guide{display:inline-flex;align-items:center;gap:4px;font:inherit;letter-spacing:inherit;white-space:nowrap;background:transparent;border:0;border-right:var(--ps-footer-border-width) solid var(--ps-footer-border);padding:0 10px 0 0;cursor:pointer;transition:color .18s;text-decoration:none}#ps-footer-root .ps-brand-coffee{color:var(--ps-footer-primary)}#ps-footer-root .ps-brand-feedback,#ps-footer-root .ps-brand-review,#ps-footer-root .ps-brand-guide{color:var(--ps-footer-muted)}#ps-footer-root .ps-brand-coffee:hover,#ps-footer-root .ps-brand-feedback:hover,#ps-footer-root .ps-brand-review:hover,#ps-footer-root .ps-brand-guide:hover,#ps-footer-root .ps-ig:hover{color:var(--ps-footer-primary)}
    #ps-footer-root .ico{display:inline-flex;align-items:center;justify-content:center;line-height:0}#ps-footer-root .ico svg{display:block}#ps-footer-root .ps-brand-text{display:inline-flex;align-items:center;gap:var(--ps-footer-gap);font:inherit;color:var(--ps-footer-muted)}#ps-footer-root .ps-signature{font-family:var(--ps-footer-signature);font-size:calc(var(--ps-footer-font-size) * 1.36);font-weight:var(--ps-footer-font-weight);color:var(--ps-footer-primary);line-height:1}#ps-footer-root .ps-ig{display:inline-flex;align-items:center;gap:3px;font:inherit;color:var(--ps-footer-muted);text-decoration:none}#ps-footer-root .ps-ig-icon{width:10px;height:10px;vertical-align:middle}
    #ps-footer-root .coffee-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:var(--ps-footer-font-family);line-height:var(--ps-footer-line-height)}#ps-footer-root .coffee-modal[hidden]{display:none}#ps-footer-root .coffee-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:psCoffeeFade .2s ease}#ps-footer-root .coffee-card{position:relative;z-index:1;background:#141414;border:var(--ps-footer-border-width) solid var(--ps-footer-primary);border-radius:18px;padding:32px 32px 26px;text-align:center;max-width:380px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(255,177,26,.12);animation:psCoffeePop .28s cubic-bezier(.16,1,.3,1)}@keyframes psCoffeeFade{from{opacity:0}to{opacity:1}}@keyframes psCoffeePop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}#ps-footer-root .coffee-close{position:absolute;top:12px;right:16px;background:transparent;border:0;color:var(--ps-footer-muted);font-size:24px;line-height:1;cursor:pointer}#ps-footer-root .coffee-close:hover{color:var(--ps-footer-primary)}#ps-footer-root .coffee-emoji{display:flex;align-items:center;justify-content:center;color:var(--ps-footer-primary);margin-bottom:10px}#ps-footer-root .coffee-title{margin:0 0 8px;font-family:var(--ps-footer-font-family);font-size:19px;font-weight:500;line-height:1.35;color:#fff}#ps-footer-root .coffee-sub{margin:0 0 20px;font-family:var(--ps-footer-font-family);font-size:13px;font-weight:300;line-height:1.7;color:var(--ps-footer-muted)}#ps-footer-root .coffee-email{display:block;margin:0 auto 16px;padding:14px 16px;border:var(--ps-footer-border-width) solid var(--ps-footer-primary);border-radius:10px;background:#0b0b0b;color:var(--ps-footer-primary);font-family:var(--ps-footer-font-family);font-size:15px;font-weight:500;letter-spacing:.01em;text-decoration:none;user-select:all}#ps-footer-root .coffee-actions{display:flex;justify-content:center;align-items:center;gap:var(--ps-footer-gap)}#ps-footer-root .coffee-copy,#ps-footer-root .coffee-mail{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border-radius:var(--ps-footer-radius);font-family:var(--ps-footer-font-family);font-size:var(--ps-footer-font-size);font-weight:var(--ps-footer-font-weight);cursor:pointer;text-decoration:none}#ps-footer-root .coffee-copy{border:var(--ps-footer-border-width) solid var(--ps-footer-border);background:transparent;color:#fff}#ps-footer-root .coffee-mail{border:var(--ps-footer-border-width) solid var(--ps-footer-primary);background:var(--ps-footer-primary);color:#16120a}
    @media(max-width:480px){#ps-footer-root .ps-brand-fixed{left:14px;right:14px;max-width:calc(100vw - 28px);font-size:var(--ps-footer-font-size);padding:var(--ps-footer-padding);gap:var(--ps-footer-gap)}#ps-footer-root .coffee-card{padding-left:20px;padding-right:20px}#ps-footer-root .coffee-actions{flex-direction:column}#ps-footer-root .coffee-copy,#ps-footer-root .coffee-mail{width:100%}}
  `;
  style.textContent += `
    #ps-footer-root .coffee-card{box-sizing:border-box;max-height:calc(100dvh - 48px);overflow:auto}
    #ps-footer-root:has(#coffee-form:not([hidden])) .coffee-card{max-width:520px}
    #ps-footer-root #coffee-info[hidden],#ps-footer-root #coffee-form[hidden],#ps-footer-root #coffee-form [hidden]{display:none}
    #ps-footer-root #coffee-form{box-sizing:border-box;display:block;position:static;width:100%;max-width:none;height:auto;min-height:0;margin:0;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;animation:psCoffeePop .28s cubic-bezier(.16,1,.3,1);text-align:left}
    #ps-footer-root #coffee-form label{display:block;margin:16px 0 0;color:#eee;font-size:14px;line-height:1.5}
    #ps-footer-root #coffee-form input,#ps-footer-root #coffee-form textarea{box-sizing:border-box;display:block;width:100%;margin:8px 0 0;border:1px solid #444;border-radius:12px;padding:12px 16px;background:#0b0b0b;color:#fff;font:400 16px/1.5 var(--ps-footer-font-family)}
    #ps-footer-root #coffee-form textarea{resize:vertical;min-height:120px}
    #ps-footer-root #coffee-form input:focus,#ps-footer-root #coffee-form textarea:focus{outline:none;border-color:var(--ps-footer-primary)}
    #ps-footer-root .coffee-notice{font-size:12px;line-height:1.6;color:#aaa;margin:16px 0}
    #ps-footer-root .coffee-notice a{color:var(--ps-footer-primary)}
    #ps-footer-root #coffee-send-status{font-size:14px;line-height:1.6;color:#eee}
    #ps-footer-root #coffee-send{width:100%;min-height:48px;font-size:16px}
    #ps-footer-root #coffee-send:disabled{opacity:.5;cursor:wait}
    #ps-footer-root .coffee-mail:hover{filter:brightness(.92)}
    @media(prefers-reduced-motion:reduce){#ps-footer-root .coffee-card,#ps-footer-root .coffee-backdrop,#ps-footer-root #coffee-form{animation:none}}
  `;
  document.head.appendChild(style);
  if (showLinks) document.body.classList.add('ps-has-footer-links');

  var modal = document.getElementById('coffee-modal');
  var coffeeForm = document.getElementById('coffee-form');
  var coffeeInfo = document.getElementById('coffee-info');
  var coffeeSubjectPrefix = window.PSServiceContext && typeof window.PSServiceContext.contactSubjectPrefix === 'function' ? window.PSServiceContext.contactSubjectPrefix(servicePath) : '';
  if (coffeeSubjectPrefix) {
    coffeeForm.querySelector('[name="subject"]').maxLength = 120 - coffeeSubjectPrefix.length;
    var sourceNotice = document.createElement('p');
    sourceNotice.className = 'coffee-notice';
    sourceNotice.textContent = '메일 제목에 [Atlas Gears] 말머리가 자동으로 붙습니다.';
    coffeeForm.querySelector('[name="subject"]').parentElement.appendChild(sourceNotice);
  }
  var coffeeSending = false;
  var coffeeDraft = '';
  var coffeeRequestId = '';
  var coffeeReturnFocus;
  var close = function () { var done=function(){modal.hidden=true;if(coffeeReturnFocus&&coffeeReturnFocus.isConnected)coffeeReturnFocus.focus();}; if(window.psModalMotion)window.psModalMotion.exit(modal,done);else done(); };
  document.getElementById('ps-coffee').addEventListener('click', function () { coffeeReturnFocus=document.activeElement;modal.hidden = false;document.getElementById('coffee-close').focus(); });
  document.getElementById('coffee-compose').addEventListener('click', function () {
    coffeeInfo.hidden = true;
    coffeeForm.hidden = false;
    document.getElementById('coffee-sender').focus();
  });
  coffeeForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (coffeeSending || !coffeeForm.reportValidity()) return;
    var status = document.getElementById('coffee-send-status');
    var endpoint = host.getAttribute('data-contact-endpoint') || 'https://studio-contact-api-1093702239224.asia-northeast3.run.app/api/contact';
    if (!endpoint) { status.textContent = '메일 발송 연결을 준비 중입니다. 입력 내용은 그대로 유지됩니다.'; return; }
    var button = document.getElementById('coffee-send');
    var fields = new FormData(coffeeForm);
    var payload = { email: String(fields.get('email')).trim(), subject: String(fields.get('subject')).trim(), message: String(fields.get('message')).trim(), website: String(fields.get('website') || '') };
    if (window.PSServiceContext && typeof window.PSServiceContext.contactSubject === 'function') payload.subject = window.PSServiceContext.contactSubject(servicePath, payload.subject);
    var draft = JSON.stringify(payload);
    if (draft !== coffeeDraft) { coffeeDraft = draft;coffeeRequestId = new Date().toISOString().slice(0,10) + '_' + crypto.randomUUID(); }
    payload.id = coffeeRequestId;
    var inputs = Array.from(coffeeForm.querySelectorAll('input,textarea'));
    inputs.forEach(function (input) { input.disabled = true; });
    coffeeSending = true;button.disabled = true;button.textContent = '발송 중…';coffeeForm.setAttribute('aria-busy', 'true');status.textContent = '';
    try {
      var response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000) });
      var result = await response.json();
      if (!response.ok || result.sent !== true) { status.textContent = result.message || '발송하지 못했습니다. 입력 내용은 그대로 유지됩니다.';return; }
      status.textContent = '메일을 발송했습니다. 제안해 주셔서 감사합니다.';
      coffeeForm.reset();
      coffeeDraft = '';coffeeRequestId = '';
    } catch (_) { status.textContent = '발송 완료를 확인하지 못했습니다. 입력 내용은 그대로 유지됩니다. 잠시 후 다시 시도해 주세요.'; }
    finally { coffeeSending = false;button.disabled = false;button.textContent = '발송';inputs.forEach(function (input) { input.disabled = false; });coffeeForm.removeAttribute('aria-busy'); }
  });
  document.getElementById('coffee-close').addEventListener('click', close);
  modal.addEventListener('click', function (event) { if (event.target.hasAttribute('data-coffee-close')) close(); });
  document.addEventListener('keydown', function (event) {
    if (modal.hidden) return;
    if (event.key === 'Escape') { event.preventDefault();event.stopPropagation();close(); }
    if (event.key === 'Tab') {
      var items = Array.from(modal.querySelectorAll('button:not(:disabled),input,textarea,a[href]')).filter(function (node) { return node.getClientRects().length; });
      var first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault();last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault();first.focus(); }
    }
  });
  document.getElementById('coffee-copy').addEventListener('click', function () {
    var button = this;
    var done = function () { button.textContent = '복사됨 ✓'; setTimeout(function () { button.textContent = '주소 복사'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(coffeeEmail).then(done).catch(done);
    else done();
  });

  function setVars() {
    var footer = document.querySelector('.ps-footer');
    document.documentElement.style.setProperty('--ps-footer-h', footer ? footer.getBoundingClientRect().height + 'px' : '0px');
    var brand = document.querySelector('.ps-brand-fixed');
    if (!brand) return;
    var rect = brand.getBoundingClientRect();
    document.documentElement.style.setProperty('--ps-brand-left', rect.left + 'px');
    document.documentElement.style.setProperty('--ps-brand-h', rect.height + 'px');
  }
  setVars();
  window.addEventListener('resize', setVars);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setVars);

  function applyComponentDesign(rows) {
    var allowed = ['color','foregroundColor','mutedColor','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','margin','borderRadius','borderColor','borderWidth','opacity','display'];
    (rows || []).forEach(function (row) {
      if (!row || allowed.indexOf(row.property) < 0 || typeof row.value !== 'string') return;
      var value = row.value.trim();
      if (!value || value.length > 160 || /[<>;{}]/.test(value)) return;
      var cssVar = {'color':'--ps-footer-primary','foregroundColor':'--ps-footer-color','mutedColor':'--ps-footer-muted','backgroundColor':'--ps-footer-bg','fontFamily':'--ps-footer-font-family','fontSize':'--ps-footer-font-size','fontWeight':'--ps-footer-font-weight','lineHeight':'--ps-footer-line-height','letterSpacing':'--ps-footer-letter-spacing','padding':'--ps-footer-padding','margin':'--ps-footer-margin','borderRadius':'--ps-footer-radius','borderColor':'--ps-footer-border','borderWidth':'--ps-footer-border-width','opacity':'--ps-footer-opacity','display':'--ps-footer-display'}[row.property];
      if (cssVar) host.style.setProperty(cssVar, value);
    });
  }
  function isTrustedPreviewMessage(event) {
    return event.source === window.parent && event.origin === location.origin && event.data && event.data.type === 'ps-footer-preview-design';
  }
  if (previewConfig && previewConfig.enabled) window.addEventListener('message', function (event) {
    if (!isTrustedPreviewMessage(event)) return;
    ['--ps-footer-primary','--ps-footer-color','--ps-footer-muted','--ps-footer-bg','--ps-footer-font-family','--ps-footer-font-size','--ps-footer-font-weight','--ps-footer-line-height','--ps-footer-letter-spacing','--ps-footer-padding','--ps-footer-margin','--ps-footer-radius','--ps-footer-border','--ps-footer-border-width','--ps-footer-opacity','--ps-footer-display'].forEach(function (property) { host.style.removeProperty(property); });
    applyComponentDesign(Object.entries(event.data.values || {}).map(function (entry) { return { property: entry[0], value: entry[1] }; }));
    setVars();
  });
  if (!previewConfig) fetch('https://myeouecgpjxcddemexcg.supabase.co/rest/v1/rpc/list_component_design', {method:'POST', headers:{apikey:'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY',Authorization:'Bearer sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY','Content-Type':'application/json'}, body:JSON.stringify({p_component_key:'footer'})}).then(function (res) { return res.ok ? res.json() : []; }).then(applyComponentDesign).catch(function () {});

  var feedback = document.createElement('script');
  var feedbackTrigger = document.querySelector('[data-feedback-open]');
  if (feedbackTrigger) feedbackTrigger.addEventListener('click', function () {
    if (!window.__psFeedbackOpenReady) window.__psPendingFeedbackOpen = true;
  });
  var feedbackUrl = new URL(source ? new URL('feedback-board.js', source).href : '/feedback-board.js', location.href);
  feedbackUrl.searchParams.set('v', ASSET_VERSION);
  feedback.src = feedbackUrl.href;
  feedback.defer = true;
  if (!previewConfig) document.body.appendChild(feedback);
  document.dispatchEvent(new CustomEvent('ps-footer-ready'));
})();
