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
    + '.ps-service-link{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:9px;padding:0 15px;border:1px solid rgba(255,255,255,.22);border-radius:100px;background:rgba(15,18,24,.88);color:#fff;text-decoration:none;'
    + "font:500 12px/1.2 'Pretendard Variable','Pretendard','Montserrat',sans-serif;"
    + 'box-shadow:0 8px 24px rgba(0,0,0,.32);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);transition:background .18s ease,border-color .18s ease,transform .18s ease;}'
    + '.ps-service-link:hover{background:rgba(35,38,44,.96);border-color:' + AMBER + ';transform:translateY(-2px);}'
    + '.ps-service-link:focus-visible{outline:2px solid ' + AMBER + ';outline-offset:3px;}'
    + '.ps-service-link svg{width:14px;height:14px;flex:none;color:' + AMBER + ';}'
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
    // 아주 좁은 화면: 아이콘만 남긴 원형 FAB — 주요 버튼을 덜 가림
    + '@media (max-width:430px){.ps-share-fab{padding:0;width:44px;height:44px;border-radius:50%;justify-content:center;gap:0;}'
    + '.ps-share-fab span{display:none;}.ps-share-fab svg{width:18px;height:18px;}}'
    + '@media (prefers-reduced-motion:reduce){.ps-share-fab,.ps-share-toast,.ps-service-link{transition:none;}}';

  var shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle>'
    + '<circle cx="18" cy="19" r="3"></circle>'
    + '<line x1="8.6" y1="10.5" x2="15.4" y2="6.5"></line>'
    + '<line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line></svg>';
  var switchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M7 17 17 7M8 7h9v9"/></svg>';

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
      ? { href: '/spell-drill/', label: '맞춤법 게임' }
      : path === '/spell-drill/'
        ? { href: '/world-map/', label: '지오웹' }
        : null;
    if (destination) {
      var actions = document.createElement('div');
      actions.className = 'ps-service-actions';
      actions.setAttribute('role', 'group');
      actions.setAttribute('aria-label', '다른 게임 및 공유');
      var link = document.createElement('a');
      link.className = 'ps-service-link';
      link.href = destination.href;
      link.setAttribute('aria-label', destination.label + '으로 이동');
      link.innerHTML = '<span>' + destination.label + '</span>' + switchIcon;
      actions.appendChild(link);
      actions.appendChild(btn);
      document.body.appendChild(actions);
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
