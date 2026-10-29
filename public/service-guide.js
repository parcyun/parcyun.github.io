/* 공용 첫 방문 안내: 원래 개발자 메시지와 시작 동작을 유지한다. */
(function () {
  var service = location.pathname.indexOf('/spell-drill') === 0 ? 'spell' : 'geoweb';
  var slides = service === 'spell' ? [
    ['언어와 난이도부터 골라요', '한국어·영어를 고르고 초급부터 시작해 보세요. 연습은 시간 제한 없이, 타이머는 60초 동안 풀 수 있어요.', 'spell-home'],
    ['문장 전체를 바르게 입력해요', '위의 틀린 문장을 읽고 아래 입력창에 올바른 문장 전체를 적으세요. ENTER를 누르면 정답을 확인하고 다음 문제로 넘어갑니다.', 'spell-play'],
    ['힌트와 패스를 활용해요', '힌트는 표현을 구별하는 방법을 알려줘요. 패스는 3개로 시작하고, 정답으로 1,000점을 얻을 때마다 하나씩 충전돼요. 이제 직접 풀어 볼까요?', 'spell-hint']
  ] : [
    ['지도를 움직이며 탐험해요', '드래그로 지도를 이동하고 확대·축소해 보세요. 위쪽에서 평면·Focus Lens·지구본을 전환하고, 나라를 검색할 수 있어요.', 'geoweb-map'],
    ['기후와 지형을 겹쳐 봐요', '왼쪽 도구 상자에서 세계의 기후·지형을 켜세요. 범례의 항목을 눌러 필요한 기후대나 강·산맥·고원·평원·사막을 골라 볼 수 있어요.', 'geoweb-climate'],
    ['게임과 연습으로 기억해요', '게임 모드에서 나라·수도·국기·자연환경·랜드마크를 골라 도전하세요. ENTER는 정답 확인, SHIFT+ENTER는 넘기기예요. 연습 모드에서는 정답을 보며 익힐 수 있어요.', 'geoweb-games']
  ];
  var style = document.createElement('style');
  style.textContent = '.ps-guide-heading{display:flex;align-items:center;gap:12px}.ps-guide-heading img{width:48px;height:48px;flex:none;border-radius:50%;object-fit:cover;background:#fff}.ps-guide-heading h2{margin:8px 0!important}.ps-guide-slide[hidden],.ps-guide-intro[hidden],.ps-guide-nav[hidden]{display:none!important}.ps-guide-slide img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#04060b;border-radius:12px;margin:14px 0}.ps-guide-slide p{margin:12px 0;line-height:1.7}.ps-guide-nav{display:flex;align-items:center;gap:12px;margin-top:20px}.ps-guide-nav button{width:auto!important;flex:1;margin:0!important;border:1px solid #45403a!important;border-radius:10px!important;background:transparent!important;color:#ffb11a!important;padding:10px!important;font:500 13px Pretendard,sans-serif!important;cursor:pointer}.ps-guide-nav button:disabled{opacity:.3;cursor:default}.ps-guide-nav span{flex:none;font:12px Montserrat,sans-serif;color:#aeb4bf}.spell-onboarding-card,.update-story-card{width:min(640px,100%)!important;max-height:calc(100dvh - 40px);overflow:auto}.ps-guide-slide{animation:psGuideFade .2s ease}@keyframes psGuideFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.ps-guide-slide{animation:none}}';
  document.head.appendChild(style);
  style.textContent += '.ps-guide-slide img{height:auto;max-height:36vh}.spell-onboarding-card [hidden],.update-story-card [hidden]{display:none!important}';
  function enhance() {
    var modal = document.querySelector(service === 'spell' ? '#spell-onboarding' : '.update-story');
    if (!modal || modal.dataset.guideReady) return;
    var card = modal.firstElementChild;
    var title = card.querySelector('h2');
    var start = service === 'spell' ? card.querySelector('#spell-onboarding-start') : card.querySelector('button');
    if (!title || !start) return;
    modal.dataset.guideReady = 'true';
    var originalTitle = title.textContent;
    var heading = document.createElement('div'); heading.className = 'ps-guide-heading';
    var avatar = document.createElement('img'); avatar.src = '/images/dexter-base-character-01.png'; avatar.alt = 'Dexter'; avatar.width = 48; avatar.height = 48;
    title.before(heading); heading.append(avatar, title);
    var intro = document.createElement('section'); intro.className = 'ps-guide-intro';
    var node = heading.nextSibling;
    while (node && node !== start) { var next = node.nextSibling; intro.appendChild(node); node = next; }
    start.before(intro);
    var slide = document.createElement('section'); slide.className = 'ps-guide-slide'; slide.hidden = true;
    var shot = document.createElement('img'); shot.width = 1280; shot.height = 720;
    var description = document.createElement('p');
    slide.append(shot, description); start.before(slide);
    var nav = document.createElement('div'); nav.className = 'ps-guide-nav';
    var prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '이전';
    var count = document.createElement('span'); count.setAttribute('aria-live', 'polite');
    var next = document.createElement('button'); next.type = 'button'; next.textContent = '다음';
    nav.append(prev, count, next); start.before(nav);
    var extras = Array.from(card.querySelectorAll('.spell-update-toggle,.spell-update-history,.update-history-toggle,.update-history'));
    var page = 0;
    function render() {
      intro.hidden = page !== 0; slide.hidden = page === 0;
      title.textContent = page ? slides[page - 1][0] : originalTitle;
      if (page) { shot.src = '/images/guides/' + slides[page - 1][2] + '.png'; shot.alt = slides[page - 1][0] + ' 실제 화면'; description.textContent = slides[page - 1][1]; }
      prev.disabled = page === 0; count.textContent = (page + 1) + ' / ' + (slides.length + 1);
      next.disabled = page === slides.length;
      extras.forEach(function (extra) { extra.hidden = page !== 0; });
      card.scrollTop = 0;
    }
    prev.addEventListener('click', function () { if (page > 0) { page--; render(); } });
    next.addEventListener('click', function () { if (page < slides.length) { page++; render(); } });
    render();
  }
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
