/* parcyun studio · 공용 공유 위젯
   모든 페이지 우측 하단에 "쌤 동료에게 공유하기" 플로팅 버튼을 띄우고,
   클릭 시 기기의 네이티브 공유 시트(Web Share API)를 연다.
   Web Share를 지원하지 않는 환경(대부분 데스크톱 브라우저)에서는 링크 복사로 폴백.
   사용법: 각 HTML 페이지에 <script src="/share-widget.js" defer></script> 한 줄만 추가. */
(function () {
  if (window.__psShareWidget) return;      // 중복 주입 방지
  window.__psShareWidget = true;

  var AMBER = '#FFB11A', AMBER_DARK = '#E89500';

  var css = ''
    + '.ps-share-fab{position:fixed;right:20px;bottom:calc(var(--ps-footer-h,0px) + var(--ps-brand-h,30px) + 18px);z-index:9990;display:inline-flex;'
    + 'align-items:center;gap:7px;padding:10px 15px;border:0;border-radius:100px;cursor:pointer;'
    + 'background:' + AMBER + ';color:#000;font-weight:700;font-size:12px;letter-spacing:-.01em;'
    + "font-family:'Pretendard Variable','Pretendard','Montserrat',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;"
    + 'box-shadow:0 8px 24px rgba(0,0,0,.35),0 0 0 0 rgba(255,177,26,.5);'
    + 'transition:transform .22s cubic-bezier(.16,1,.3,1),box-shadow .22s cubic-bezier(.16,1,.3,1),background .18s;}'
    + '.ps-share-fab:hover{background:' + AMBER_DARK + ';transform:translateY(-2px);'
    + 'box-shadow:0 12px 30px rgba(0,0,0,.45),0 0 24px rgba(255,177,26,.35);}'
    + '.ps-share-fab:active{transform:translateY(0);}'
    + '.ps-share-fab svg{width:14px;height:14px;flex:0 0 auto;}'
    + '.ps-service-actions{position:fixed;right:20px;bottom:calc(var(--ps-footer-h,0px) + var(--ps-brand-h,30px) + 18px + env(safe-area-inset-bottom,0px));z-index:9990;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}'
    + '.ps-service-actions .ps-share-fab{position:static;}'
    + '.ps-service-row{display:flex;align-items:center;gap:8px;}'
    + '.ps-service-link{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:9px;padding:0 15px;border:1px solid rgba(255,255,255,.22);border-radius:100px;background:rgba(15,18,24,.88);color:#fff;text-decoration:none;'
    + "font:500 12px/1.2 'Pretendard Variable','Pretendard','Montserrat',sans-serif;"
    + 'box-shadow:0 8px 24px rgba(0,0,0,.32);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);transition:background .18s ease,border-color .18s ease,transform .18s ease;}'
    + '.ps-service-link:hover{background:rgba(35,38,44,.96);border-color:' + AMBER + ';transform:translateY(-2px);}'
    + '.ps-service-link:focus-visible{outline:2px solid ' + AMBER + ';outline-offset:3px;}'
    + '.ps-service-link svg{width:14px;height:14px;flex:none;color:' + AMBER + ';}'
    + '.ps-service-qr{width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid rgba(255,255,255,.22);border-radius:50%;background:rgba(15,18,24,.88);color:' + AMBER + ';cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.32);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);transition:background .18s ease,border-color .18s ease,transform .18s ease;}'
    + '.ps-service-qr:hover{background:rgba(35,38,44,.96);border-color:' + AMBER + ';transform:translateY(-2px);}'
    + '.ps-service-qr:focus-visible,.ps-qr-close:focus-visible{outline:2px solid ' + AMBER + ';outline-offset:3px;}'
    + '.ps-service-qr svg{width:20px;height:20px;}'
    + '.ps-qr-popover{position:fixed;top:76px;right:max(20px,env(safe-area-inset-right,0px));z-index:10010;box-sizing:border-box;width:min(284px,calc(100vw - 28px));max-height:calc(100dvh - 90px);overflow:auto;padding:16px;border:1px solid rgba(255,177,26,.34);border-radius:18px;background:rgba(16,19,25,.97);color:#fff;box-shadow:0 18px 48px rgba(0,0,0,.48);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);font-family:"Pretendard Variable","Pretendard","Montserrat",sans-serif;opacity:0;transform:translateY(-8px);pointer-events:none;transition:opacity .2s ease,transform .2s ease;}'
    + '.ps-qr-popover[hidden]{display:none;}.ps-qr-popover.is-open{opacity:1;transform:translateY(0);pointer-events:auto;}'
    + '.ps-qr-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}.ps-qr-head strong{font-size:14px;font-weight:600;}.ps-qr-close{width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#fff;font-size:20px;line-height:1;cursor:pointer;}'
    + '.ps-qr-popover p{margin:5px 0 12px;color:#AEB4BF;font-size:11px;line-height:1.4;}.ps-qr-art{padding:12px;border-radius:14px;background:#fff;text-align:center;}.ps-qr-code{display:block;width:100%;height:auto;aspect-ratio:1;image-rendering:pixelated;}.ps-qr-url{display:block;margin-top:10px;color:#FFB11A;font:500 10px/1.4 Montserrat,sans-serif;overflow-wrap:anywhere;text-decoration:none;}.ps-qr-url:hover{text-decoration:underline;}'
    + '.ps-share-toast{position:fixed;right:20px;bottom:calc(var(--ps-footer-h,0px) + var(--ps-brand-h,30px) + 72px);z-index:9991;padding:10px 16px;'
    + 'border-radius:10px;background:rgba(20,20,20,.95);color:#fff;font-size:12px;font-weight:500;'
    + "font-family:'Pretendard Variable','Pretendard',sans-serif;border:1px solid rgba(255,177,26,.4);"
    + 'box-shadow:0 10px 26px rgba(0,0,0,.5);opacity:0;transform:translateY(8px);pointer-events:none;'
    + 'transition:opacity .22s ease,transform .22s ease;}'
    + '.ps-share-toast.show{opacity:1;transform:translateY(0);}'
    + '.ps-share-toast.has-service-link{bottom:calc(var(--ps-footer-h,0px) + var(--ps-brand-h,30px) + 128px + env(safe-area-inset-bottom,0px));}'
    + '@media (max-width:480px){.ps-share-fab{right:14px;bottom:calc(var(--ps-footer-h,0px) + var(--ps-brand-h,30px) + 18px);padding:9px 13px;font-size:11px;}'
    + '.ps-share-toast{right:14px;bottom:calc(var(--ps-footer-h,0px) + var(--ps-brand-h,30px) + 72px);}'
    + '.ps-service-actions{right:max(14px,env(safe-area-inset-right,0px));}}'
    + '@media (max-width:480px){.ps-qr-popover{top:64px;right:14px;width:min(260px,calc(100vw - 28px));}}'
    // 아주 좁은 화면: 아이콘만 남긴 원형 FAB — 주요 버튼을 덜 가림
    + '@media (max-width:430px){.ps-share-fab{padding:0;width:44px;height:44px;border-radius:50%;justify-content:center;gap:0;}'
    + '.ps-share-fab span{display:none;}.ps-share-fab svg{width:18px;height:18px;}}'
    + '@media (prefers-reduced-motion:reduce){.ps-share-fab,.ps-share-toast,.ps-service-link,.ps-service-qr,.ps-qr-popover{transition:none;}}';

  css += '.ps-qr-tools{display:flex;gap:4px;align-items:center;}.ps-qr-pin{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;}.ps-qr-pin svg{width:18px;height:18px;transform:rotate(40deg);transition:transform .2s ease;}.ps-qr-pin[aria-pressed="true"]{color:#FFB11A;background:rgba(255,177,26,.12);}.ps-qr-pin[aria-pressed="true"] svg{transform:rotate(0deg);}.ps-qr-pin:focus-visible{outline:2px solid #FFB11A;outline-offset:3px;}.ps-qr-popover.is-pinned{z-index:2147483647;}.ps-qr-popover[popover]{margin:0;bottom:auto;left:auto;}.ps-qr-popover::backdrop{background:transparent;pointer-events:none;}@media(prefers-reduced-motion:reduce){.ps-qr-pin svg{transition:none;}}';

  var shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle>'
    + '<circle cx="18" cy="19" r="3"></circle>'
    + '<line x1="8.6" y1="10.5" x2="15.4" y2="6.5"></line>'
    + '<line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line></svg>';
  var switchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M7 17 17 7M8 7h9v9"/></svg>';
  var qrIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM21 14v3M18 20h3M14 21v-2"/>'
    + '<path d="M5.5 5.5h2v2h-2zM16.5 5.5h2v2h-2zM5.5 16.5h2v2h-2z"/></svg>';

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ps-share-fab';
    btn.setAttribute('aria-label', '쌤 동료에게 공유하기');
    btn.innerHTML = shareIcon + '<span>쌤 동료에게 공유하기</span>';
    var path = location.pathname.replace(/\/+$/, '') + '/';
    var destination = path === '/world-map/'
      ? { href: '/spell-drill/', label: '맞춤법 게임', page: 'world-map', pageLabel: '지오웹' }
      : path === '/spell-drill/'
        ? { href: '/world-map/', label: '지오웹', page: 'spell-drill', pageLabel: '맞춤법 게임' }
        : null;
    if (destination) {
      var actions = document.createElement('div');
      actions.className = 'ps-service-actions';
      actions.setAttribute('role', 'group');
      actions.setAttribute('aria-label', 'QR 코드, 다른 게임 및 공유');
      var row = document.createElement('div');
      row.className = 'ps-service-row';
      var qrButton = document.createElement('button');
      qrButton.type = 'button';
      qrButton.className = 'ps-service-qr';
      qrButton.setAttribute('aria-label', '현재 페이지 QR 코드 보기');
      qrButton.setAttribute('aria-expanded', 'false');
      qrButton.setAttribute('aria-controls', 'ps-qr-popover');
      qrButton.innerHTML = qrIcon;
      var link = document.createElement('a');
      link.className = 'ps-service-link';
      link.href = destination.href;
      link.setAttribute('aria-label', destination.label + '으로 이동');
      link.innerHTML = '<span>' + destination.label + '</span>' + switchIcon;
      row.appendChild(qrButton);
      row.appendChild(link);
      actions.appendChild(row);
      actions.appendChild(btn);
      document.body.appendChild(actions);

      var url = 'https://parcyun.github.io/' + destination.page + '/';
      var popover = document.createElement('section');
      popover.id = 'ps-qr-popover';
      popover.className = 'ps-qr-popover';
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-label', destination.pageLabel + ' QR 코드');
      popover.hidden = true;
      popover.innerHTML = '<div class="ps-qr-head"><strong>휴대폰으로 이어보기</strong><div class="ps-qr-tools"><button type="button" class="ps-qr-pin" aria-label="QR 코드 고정" aria-pressed="false" title="QR 코드 고정"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v6l-4 4v2h12v-2l-4-4V3M12 15v6"/></svg></button><button type="button" class="ps-qr-close" aria-label="QR 코드 닫기">×</button></div></div>'
        + '<p>' + destination.pageLabel + ' 페이지를 휴대폰으로 열어 보세요.</p>'
        + '<div class="ps-qr-art"><img class="ps-qr-code" src="/qr/' + destination.page + '.svg?v=20261028-qr3" alt="' + destination.pageLabel + ' 페이지 QR 코드" width="240" height="240"></div>'
        + '<a class="ps-qr-url" href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
      document.body.appendChild(popover);
      var closeButton = popover.querySelector('.ps-qr-close');
      var pinButton = popover.querySelector('.ps-qr-pin');
      var pinned = false;
      function setPinned(value) {
        pinned = value;
        pinButton.setAttribute('aria-pressed', String(value));
        pinButton.setAttribute('aria-label', value ? 'QR 코드 고정 해제' : 'QR 코드 고정');
        pinButton.title = value ? 'QR 코드 고정 해제' : 'QR 코드 고정';
        popover.classList.toggle('is-pinned', value);
        if (typeof popover.showPopover === 'function') {
          if (value) {
            popover.setAttribute('popover', 'manual');
            popover.showPopover();
          } else {
            popover.hidePopover();
            popover.removeAttribute('popover');
          }
        }
      }
      pinButton.addEventListener('click', function () { setPinned(!pinned); });
      function closeQr(restoreFocus) {
        if (pinned) setPinned(false);
        popover.classList.remove('is-open');
        popover.hidden = true;
        qrButton.setAttribute('aria-expanded', 'false');
        if (restoreFocus) qrButton.focus();
      }
      qrButton.addEventListener('click', function () {
        if (!popover.hidden) { closeQr(true); return; }
        popover.hidden = false;
        qrButton.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(function () { if (!popover.hidden) { popover.classList.add('is-open'); closeButton.focus(); } });
      });
      closeButton.addEventListener('click', function () { closeQr(true); });
      document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !popover.hidden && !pinned) closeQr(true); });
      document.addEventListener('pointerdown', function (event) {
        if (!popover.hidden && !pinned && !popover.contains(event.target) && !qrButton.contains(event.target)) closeQr(false);
      });
    } else {
      document.body.appendChild(btn);
    }

    var toast = document.createElement('div');
    toast.className = 'ps-share-toast';
    if (destination) toast.classList.add('has-service-link');
    document.body.appendChild(toast);

    var toastTimer;
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
    }

    btn.addEventListener('click', async function () {
      var data = {
        title: document.title || 'parcyun studio',
        text: document.title || 'parcyun studio',
        url: location.href
      };
      if (navigator.share) {
        try { await navigator.share(data); }
        catch (e) { /* 사용자가 취소(AbortError) 등 — 무시 */ }
        return;
      }
      // 폴백: 링크 복사
      try {
        await navigator.clipboard.writeText(location.href);
        showToast('링크가 복사되었습니다 · 동료에게 붙여넣어 공유하세요');
      } catch (e) {
        window.prompt('아래 링크를 복사해 공유하세요', location.href);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
