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
    home: { showLinks: true, showFeedback: false, showReview: true },
    atlas: { showLinks: false, showFeedback: true, showReview: true },
    geoweb: { showLinks: false, showFeedback: true, showReview: true },
    spell: { showLinks: false, showFeedback: true, showReview: true }
  };
  var contextConfig = previewConfig && (previewContexts[previewContext] || previewContexts.home);
  var showFeedback = contextConfig ? contextConfig.showFeedback : host.getAttribute('data-show-feedback') !== 'false';
  var showReview = contextConfig ? contextConfig.showReview : host.getAttribute('data-show-review') !== 'false';
  var showLinks = contextConfig ? contextConfig.showLinks : host.getAttribute('data-show-links') !== 'false';
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
    + (showReview ? '<a class="ps-brand-review" href="/reviews/">리뷰 남기기</a>' : '')
    + '<span class="ps-brand-text">Designed by <span class="ps-signature">parcyun studio</span><a href="https://www.instagram.com/parcyun" class="ps-ig" target="_blank" rel="noopener">' + instagramIcon + '@parcyun</a></span>'
    + '</div>'
    + '<div class="coffee-modal" id="coffee-modal" hidden><div class="coffee-backdrop" data-coffee-close></div><div class="coffee-card" role="dialog" aria-modal="true" aria-labelledby="coffee-title">'
    + '<button class="coffee-close" id="coffee-close" type="button" aria-label="닫기">×</button><div class="coffee-emoji ico">' + coffeeIcon.replace('width="13" height="13"', 'width="40" height="40"') + '</div>'
    + '<h3 class="coffee-title" id="coffee-title">커피 대신, 같이 뭔가 만들어볼까요?</h3><p class="coffee-sub" id="coffee-sub">커피는 제가 알아서 마실게요. 교실을 바꿀 아이디어나 함께 만들고 싶은 프로젝트가 있다면 메일 한 통 보내주세요.</p>'
    + '<a class="coffee-email" id="coffee-email" href="mailto:pen.layered@gmail.com">' + coffeeEmail + '</a><div class="coffee-actions"><button class="coffee-copy" id="coffee-copy" type="button">주소 복사</button><a class="coffee-mail" href="mailto:pen.layered@gmail.com">협업 메일 쓰기</a></div>'
    + '</div></div>';

  var style = document.createElement('style');
  style.id = 'ps-footer-style';
  style.textContent = `
    .ps-has-footer-links{display:flex;flex-direction:column;min-height:100vh}
    #ps-footer-root{--ps-footer-primary:#ffb11a;--ps-footer-color:#8c8c8c;--ps-footer-muted:#8c8c8c;--ps-footer-bg:rgba(0,0,0,.82);--ps-footer-border:rgba(255,255,255,.08);--ps-footer-border-width:1px;--ps-footer-font-family:'Montserrat','Pretendard Variable','Pretendard',sans-serif;--ps-footer-font-size:11px;--ps-footer-font-weight:400;--ps-footer-line-height:normal;--ps-footer-letter-spacing:.3px;--ps-footer-padding:4px 12px;--ps-footer-margin:0;--ps-footer-gap:8px;--ps-footer-radius:100px;--ps-footer-opacity:1;--ps-footer-display:flex;--ps-footer-signature:'Covered By Your Grace',cursive}
    #ps-footer-root .ps-footer{position:static;flex-shrink:0;margin-top:auto;width:100%;background:var(--ps-footer-bg);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:var(--ps-footer-border-width) solid var(--ps-footer-border);font-family:var(--ps-footer-font-family);font-size:var(--ps-footer-font-size);font-weight:var(--ps-footer-font-weight);line-height:var(--ps-footer-line-height);letter-spacing:var(--ps-footer-letter-spacing);color:var(--ps-footer-color);opacity:var(--ps-footer-opacity)}
    #ps-footer-root .ps-footer-inner{max-width:1108px;margin:0 auto;padding:16px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:var(--ps-footer-gap)}@media(min-width:768px){#ps-footer-root .ps-footer-inner{padding:18px 48px}}
    #ps-footer-root .ps-flinks{display:flex;flex-wrap:wrap;align-items:center;gap:0;row-gap:4px;line-height:var(--ps-footer-line-height)}#ps-footer-root .ps-flink{font:inherit;letter-spacing:inherit;color:var(--ps-footer-muted);text-decoration:none;background:transparent;border:0;cursor:pointer;padding:0 10px;border-right:var(--ps-footer-border-width) solid var(--ps-footer-border);transition:color .18s}#ps-footer-root .ps-flink:last-of-type{border-right:0}#ps-footer-root .ps-flink:first-child{padding-left:0}#ps-footer-root .ps-flink:hover{color:var(--ps-footer-primary)}
    #ps-footer-root .ps-brand-fixed{position:fixed;right:20px;bottom:calc(var(--ps-footer-h,0px) + 10px);z-index:9989;display:var(--ps-footer-display);align-items:center;gap:var(--ps-footer-gap);font-family:var(--ps-footer-font-family);font-weight:var(--ps-footer-font-weight);font-size:var(--ps-footer-font-size);line-height:var(--ps-footer-line-height);letter-spacing:var(--ps-footer-letter-spacing);color:var(--ps-footer-color);white-space:nowrap;background:var(--ps-footer-bg);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:var(--ps-footer-padding);margin:var(--ps-footer-margin);border-radius:var(--ps-footer-radius);border:var(--ps-footer-border-width) solid var(--ps-footer-border);opacity:var(--ps-footer-opacity)}
    #ps-footer-root .ps-brand-coffee,#ps-footer-root .ps-brand-feedback,#ps-footer-root .ps-brand-review{display:inline-flex;align-items:center;gap:4px;font:inherit;letter-spacing:inherit;background:transparent;border:0;border-right:var(--ps-footer-border-width) solid var(--ps-footer-border);padding:0 10px 0 0;cursor:pointer;transition:color .18s;text-decoration:none}#ps-footer-root .ps-brand-coffee{color:var(--ps-footer-primary)}#ps-footer-root .ps-brand-feedback,#ps-footer-root .ps-brand-review{color:var(--ps-footer-muted)}#ps-footer-root .ps-brand-coffee:hover,#ps-footer-root .ps-brand-feedback:hover,#ps-footer-root .ps-brand-review:hover,#ps-footer-root .ps-ig:hover{color:var(--ps-footer-primary)}
    #ps-footer-root .ico{display:inline-flex;align-items:center;justify-content:center;line-height:0}#ps-footer-root .ico svg{display:block}#ps-footer-root .ps-brand-text{display:inline-flex;align-items:center;gap:var(--ps-footer-gap);font:inherit;color:var(--ps-footer-muted)}#ps-footer-root .ps-signature{font-family:var(--ps-footer-signature);font-size:calc(var(--ps-footer-font-size) * 1.36);font-weight:var(--ps-footer-font-weight);color:var(--ps-footer-primary);line-height:1}#ps-footer-root .ps-ig{display:inline-flex;align-items:center;gap:3px;font:inherit;color:var(--ps-footer-muted);text-decoration:none}#ps-footer-root .ps-ig-icon{width:10px;height:10px;vertical-align:middle}
    #ps-footer-root .coffee-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:24px;font-family:var(--ps-footer-font-family);line-height:var(--ps-footer-line-height)}#ps-footer-root .coffee-modal[hidden]{display:none}#ps-footer-root .coffee-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:psCoffeeFade .2s ease}#ps-footer-root .coffee-card{position:relative;z-index:1;background:#141414;border:var(--ps-footer-border-width) solid var(--ps-footer-primary);border-radius:18px;padding:32px 32px 26px;text-align:center;max-width:380px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(255,177,26,.12);animation:psCoffeePop .28s cubic-bezier(.16,1,.3,1)}@keyframes psCoffeeFade{from{opacity:0}to{opacity:1}}@keyframes psCoffeePop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}#ps-footer-root .coffee-close{position:absolute;top:12px;right:16px;background:transparent;border:0;color:var(--ps-footer-muted);font-size:24px;line-height:1;cursor:pointer}#ps-footer-root .coffee-close:hover{color:var(--ps-footer-primary)}#ps-footer-root .coffee-emoji{display:flex;align-items:center;justify-content:center;color:var(--ps-footer-primary);margin-bottom:10px}#ps-footer-root .coffee-title{margin:0 0 8px;font-family:var(--ps-footer-font-family);font-size:19px;font-weight:500;line-height:1.35;color:#fff}#ps-footer-root .coffee-sub{margin:0 0 20px;font-family:var(--ps-footer-font-family);font-size:13px;font-weight:300;line-height:1.7;color:var(--ps-footer-muted)}#ps-footer-root .coffee-email{display:block;margin:0 auto 16px;padding:14px 16px;border:var(--ps-footer-border-width) solid var(--ps-footer-primary);border-radius:10px;background:#0b0b0b;color:var(--ps-footer-primary);font-family:var(--ps-footer-font-family);font-size:15px;font-weight:500;letter-spacing:.01em;text-decoration:none;user-select:all}#ps-footer-root .coffee-actions{display:flex;justify-content:center;align-items:center;gap:var(--ps-footer-gap)}#ps-footer-root .coffee-copy,#ps-footer-root .coffee-mail{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border-radius:var(--ps-footer-radius);font-family:var(--ps-footer-font-family);font-size:var(--ps-footer-font-size);font-weight:var(--ps-footer-font-weight);cursor:pointer;text-decoration:none}#ps-footer-root .coffee-copy{border:var(--ps-footer-border-width) solid var(--ps-footer-border);background:transparent;color:#fff}#ps-footer-root .coffee-mail{border:var(--ps-footer-border-width) solid var(--ps-footer-primary);background:var(--ps-footer-primary);color:#16120a}
    @media(max-width:480px){#ps-footer-root .ps-brand-fixed{right:14px;font-size:var(--ps-footer-font-size);padding:var(--ps-footer-padding);gap:var(--ps-footer-gap)}#ps-footer-root .coffee-card{padding-left:20px;padding-right:20px}#ps-footer-root .coffee-actions{flex-direction:column}#ps-footer-root .coffee-copy,#ps-footer-root .coffee-mail{width:100%}}
  `;
  document.head.appendChild(style);
  if (showLinks) document.body.classList.add('ps-has-footer-links');

  var modal = document.getElementById('coffee-modal');
  var close = function () { modal.hidden = true; };
  document.getElementById('ps-coffee').addEventListener('click', function () { modal.hidden = false; });
  document.getElementById('coffee-close').addEventListener('click', close);
  modal.addEventListener('click', function (event) { if (event.target.hasAttribute('data-coffee-close')) close(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !modal.hidden) close(); });
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
    var allowed = ['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','margin','borderRadius','borderColor','borderWidth','opacity','display'];
    (rows || []).forEach(function (row) {
      if (!row || allowed.indexOf(row.property) < 0 || typeof row.value !== 'string') return;
      var value = row.value.trim();
      if (!value || value.length > 160 || /[<>;{}]/.test(value)) return;
      var cssVar = {'color':'--ps-footer-primary','backgroundColor':'--ps-footer-bg','fontFamily':'--ps-footer-font-family','fontSize':'--ps-footer-font-size','fontWeight':'--ps-footer-font-weight','lineHeight':'--ps-footer-line-height','letterSpacing':'--ps-footer-letter-spacing','padding':'--ps-footer-padding','margin':'--ps-footer-margin','borderRadius':'--ps-footer-radius','borderColor':'--ps-footer-border','borderWidth':'--ps-footer-border-width','opacity':'--ps-footer-opacity','display':'--ps-footer-display'}[row.property];
      if (cssVar) host.style.setProperty(cssVar, value);
    });
  }
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || !event.data || event.data.type !== 'ps-footer-preview-design') return;
    ['--ps-footer-primary','--ps-footer-bg','--ps-footer-font-family','--ps-footer-font-size','--ps-footer-font-weight','--ps-footer-line-height','--ps-footer-letter-spacing','--ps-footer-padding','--ps-footer-margin','--ps-footer-radius','--ps-footer-border','--ps-footer-border-width','--ps-footer-opacity','--ps-footer-display'].forEach(function (property) { host.style.removeProperty(property); });
    applyComponentDesign(Object.entries(event.data.values || {}).map(function (entry) { return { property: entry[0], value: entry[1] }; }));
    setVars();
  });
  if (!previewConfig) fetch('https://myeouecgpjxcddemexcg.supabase.co/rest/v1/rpc/list_component_design', {method:'POST', headers:{apikey:'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY',Authorization:'Bearer sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY','Content-Type':'application/json'}, body:JSON.stringify({p_component_key:'footer'})}).then(function (res) { return res.ok ? res.json() : []; }).then(applyComponentDesign).catch(function () {});

  var feedback = document.createElement('script');
  feedback.src = (source ? new URL('feedback-board.js', source).href : '/feedback-board.js');
  feedback.defer = true;
  if (!previewConfig) document.body.appendChild(feedback);
  document.dispatchEvent(new CustomEvent('ps-footer-ready'));
})();
