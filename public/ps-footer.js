/* parcyun studio · single shared footer for Astro pages and static tools */
(function () {
  if (window.__psFooter) return;
  window.__psFooter = true;

  var host = document.querySelector('[data-ps-footer]');
  if (!host) return;
  host.id = 'ps-footer-root';

  var showFeedback = host.getAttribute('data-show-feedback') !== 'false';
  var showLinks = host.getAttribute('data-show-links') !== 'false';
  var source = document.currentScript && document.currentScript.src;
  var asset = function (path) { return source ? new URL(path, source).href : '/' + path; };
  var footerLinks = '<footer class="ps-footer"><div class="ps-footer-inner"><nav class="ps-flinks" aria-label="바로가기">'
    + '<a href="https://linktr.ee/parcyun" class="ps-flink" target="_blank" rel="noopener">Linktree</a>'
    + '<a href="https://github.com/parcyun" class="ps-flink" target="_blank" rel="noopener">GitHub</a>'
    + '<a href="https://padlet.com/penlayered/parcyun-studio-19rq7rovocsv24vr" class="ps-flink" target="_blank" rel="noopener">Padlet</a>'
    + '<a href="/admin" class="ps-flink">admin</a>'
    + '</nav></div></footer>';
  var coffeeIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M3 8h14v6.5A4.5 4.5 0 0 1 12.5 19h-5A4.5 4.5 0 0 1 3 14.5Z"/><line x1="7" y1="2.5" x2="7" y2="4.5"/><line x1="11" y1="2.5" x2="11" y2="4.5"/></svg>';
  var instagramIcon = '<svg class="ps-ig-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.3 1 .4 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .3-2.2.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 5.5a4.3 4.3 0 100 8.6 4.3 4.3 0 000-8.6zm5.4-.3a1 1 0 11-2 0 1 1 0 012 0zM12 9.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/></svg>';

  host.innerHTML = (showLinks ? footerLinks : '')
    + '<div class="ps-brand-fixed">'
    + '<button type="button" class="ps-brand-coffee" id="ps-coffee"><span class="ico">' + coffeeIcon + '</span><span id="foot-coffee-label">커피 사주기</span></button>'
    + (showFeedback ? '<button type="button" class="ps-brand-feedback" id="foot-report" data-feedback-open>기능 개선 요청</button>' : '')
    + '<span class="ps-brand-text">Designed by <span class="ps-signature">parcyun studio</span><a href="https://www.instagram.com/parcyun" class="ps-ig" target="_blank" rel="noopener">' + instagramIcon + '@parcyun</a></span>'
    + '</div>'
    + '<div class="coffee-modal" id="coffee-modal" hidden><div class="coffee-backdrop" data-coffee-close></div><div class="coffee-card" role="dialog" aria-modal="true" aria-labelledby="coffee-title">'
    + '<button class="coffee-close" id="coffee-close" type="button" aria-label="닫기">×</button><div class="coffee-emoji ico">' + coffeeIcon.replace('width="13" height="13"', 'width="40" height="40"') + '</div>'
    + '<h3 class="coffee-title" id="coffee-title">개발자에게 커피 한 잔</h3><p class="coffee-sub" id="coffee-sub">QR을 스캔해 후원할 수 있어요. 감사합니다!</p>'
    + '<img class="coffee-qr" id="coffee-qr" src="' + asset('images/coffee-qr.png') + '" alt="parcyun studio 후원 QR"><div class="coffee-qr-fallback" id="coffee-qr-fallback">QR 이미지를 불러올 수 없습니다.</div><div class="coffee-label">parcyun studio</div>'
    + '</div></div>';

  var style = document.createElement('style');
  style.id = 'ps-footer-style';
  style.textContent = `
    .ps-has-footer-links{display:flex;flex-direction:column;min-height:100vh}
    #ps-footer-root{--ps-footer-primary:#FFB11A;--ps-footer-primary-dark:#E89500;--ps-footer-secondary:#8C8C8C;--ps-footer-surface:#141414;--ps-footer-font:'Montserrat','Pretendard Variable','Pretendard',sans-serif;--ps-footer-signature:'Covered By Your Grace',cursive}
    #ps-footer-root .ps-footer{position:static;flex-shrink:0;margin-top:auto;width:100%;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,.08);font-family:var(--ps-footer-font);line-height:normal}
    #ps-footer-root .ps-footer-inner{max-width:1108px;margin:0 auto;padding:16px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px}@media(min-width:768px){#ps-footer-root .ps-footer-inner{padding:18px 48px}}
    #ps-footer-root .ps-flinks{display:flex;flex-wrap:wrap;align-items:center;gap:0;row-gap:4px;line-height:normal}#ps-footer-root .ps-flink{font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-size:11px;font-weight:400;line-height:normal;letter-spacing:.3px;color:#8C8C8C;text-decoration:none;background:transparent;border:0;cursor:pointer;padding:0 10px;border-right:1px solid rgba(255,255,255,.14);transition:color .18s}#ps-footer-root .ps-flink:last-of-type{border-right:0}#ps-footer-root .ps-flink:first-child{padding-left:0}#ps-footer-root .ps-flink:hover{color:#fff}
    #ps-footer-root .ps-brand-fixed{position:fixed;right:20px;bottom:calc(var(--ps-footer-h,0px) + 10px);z-index:9989;display:flex;align-items:center;gap:8px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-weight:300;font-size:11px;line-height:normal;color:#8C8C8C;white-space:nowrap;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:4px 12px;border-radius:100px;border:1px solid rgba(255,255,255,.08)}
    #ps-footer-root .ps-brand-coffee,#ps-footer-root .ps-brand-feedback{display:inline-flex;align-items:center;gap:4px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-size:11px;font-weight:400;line-height:normal;letter-spacing:.3px;background:transparent;border:0;border-right:1px solid rgba(255,255,255,.14);padding:0 10px 0 0;cursor:pointer;transition:color .18s}#ps-footer-root .ps-brand-coffee{color:#FFB11A}#ps-footer-root .ps-brand-feedback{color:#8C8C8C}#ps-footer-root .ps-brand-coffee:hover,#ps-footer-root .ps-brand-feedback:hover,#ps-footer-root .ps-ig:hover{color:#FFB11A}
    #ps-footer-root .ico{display:inline-flex;align-items:center;justify-content:center;line-height:0}#ps-footer-root .ico svg{display:block}#ps-footer-root .ps-brand-text{display:inline-flex;align-items:center;gap:8px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-weight:300;font-size:11px;line-height:normal;color:#8C8C8C}#ps-footer-root .ps-signature{font-family:'Covered By Your Grace',cursive;font-size:15px;font-weight:300;color:#FFB11A;line-height:1}#ps-footer-root .ps-ig{display:inline-flex;align-items:center;gap:3px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-weight:300;font-size:11px;line-height:normal;color:#8C8C8C;text-decoration:none}#ps-footer-root .ps-ig-icon{width:10px;height:10px;vertical-align:middle}
    #ps-footer-root .coffee-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;line-height:normal}#ps-footer-root .coffee-modal[hidden]{display:none}#ps-footer-root .coffee-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:psCoffeeFade .2s ease}#ps-footer-root .coffee-card{position:relative;z-index:1;background:#141414;border:1px solid #FFB11A;border-radius:18px;padding:32px 32px 26px;text-align:center;max-width:340px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(255,177,26,.12);animation:psCoffeePop .28s cubic-bezier(.16,1,.3,1)}@keyframes psCoffeeFade{from{opacity:0}to{opacity:1}}@keyframes psCoffeePop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}#ps-footer-root .coffee-close{position:absolute;top:12px;right:16px;background:transparent;border:0;color:#8C8C8C;font-size:24px;line-height:1;cursor:pointer}#ps-footer-root .coffee-close:hover{color:#FFB11A}#ps-footer-root .coffee-emoji{display:flex;align-items:center;justify-content:center;color:#FFB11A;margin-bottom:10px}#ps-footer-root .coffee-title{margin:0 0 6px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-size:19px;font-weight:500;line-height:normal;color:#fff}#ps-footer-root .coffee-sub{margin:0 0 20px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-size:13px;font-weight:300;line-height:1.6;color:#8C8C8C}#ps-footer-root .coffee-qr{display:block;width:220px;height:220px;margin:0 auto 14px;border-radius:12px;background:#fff;padding:10px;object-fit:contain}#ps-footer-root .coffee-qr-fallback{display:none;margin:0 auto 14px;padding:40px 16px;border:1px dashed #333;border-radius:12px;font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;font-size:12px;line-height:normal;color:#8C8C8C}#ps-footer-root .coffee-label{font-family:'Covered By Your Grace',cursive;font-size:20px;font-weight:300;line-height:1;color:#FFB11A}
    @media(max-width:480px){#ps-footer-root .ps-brand-fixed{right:14px;font-size:10px;padding:3px 10px;gap:6px}}
  `;
  document.head.appendChild(style);
  if (showLinks) document.body.classList.add('ps-has-footer-links');

  var modal = document.getElementById('coffee-modal');
  var close = function () { modal.hidden = true; };
  document.getElementById('ps-coffee').addEventListener('click', function () { modal.hidden = false; });
  document.getElementById('coffee-close').addEventListener('click', close);
  modal.addEventListener('click', function (event) { if (event.target.hasAttribute('data-coffee-close')) close(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !modal.hidden) close(); });
  document.getElementById('coffee-qr').addEventListener('error', function () { this.style.display = 'none'; document.getElementById('coffee-qr-fallback').style.display = 'block'; });

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

  var feedback = document.createElement('script');
  feedback.src = asset('feedback-board.js');
  feedback.defer = true;
  document.body.appendChild(feedback);
  document.dispatchEvent(new CustomEvent('ps-footer-ready'));
})();
