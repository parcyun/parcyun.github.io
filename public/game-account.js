const CONFIG = { apiKey: 'AIzaSyBjkzvcIjyfnOU0TBF5VasoaQz3Xgw1C9I', authDomain: 'parcyun.firebaseapp.com', projectId: 'parcyun', appId: '1:1093702239224:web:021018208e667b21e7cc0d' };
const MASCOT = '/images/dexter-base-character-01.png';
import {createLeaderboard,rankingAffiliation,isReservedNickname} from './spell-leaderboard.js?v=20261029-6';
import {createBrowserProfileStore,normalizeSchool} from './browser-profile.js?v=20261029-1';
import {searchSchools,schoolMark,SCHOOL_REGIONS} from './school-directory.js?v=20261029-1';
let browserStorage;try{browserStorage=window.localStorage;}catch{browserStorage={getItem:()=>null,removeItem:()=>{},setItem:()=>{throw new Error('브라우저 저장 공간을 사용할 수 없어요.');}};}
const localProfiles=createBrowserProfileStore({storage:browserStorage,eventTarget:window,channel:typeof BroadcastChannel==='function'?new BroadcastChannel('ps-browser-profile-updates'):null});
let creatingLocal=false;
const style = document.createElement('style');
style.textContent = '.ps-account-trigger{width:44px;height:44px;border-radius:50%;border:1px solid #ffffff38;background:#101319;color:#ffb11a;display:grid;place-items:center;cursor:pointer;padding:0;overflow:hidden}.ps-account-trigger svg{width:20px;height:20px}.ps-account-trigger img{width:100%;height:100%;object-fit:cover}.ps-studio-avatar{width:100%;height:100%;border-radius:50%;object-fit:cover;background:#fff}.ps-account-dialog{box-sizing:border-box;width:min(430px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;margin:auto;padding:24px;border:1px solid #ffb11a50;border-radius:24px;background:#101319;color:#fff;font:14px/1.6 Pretendard,sans-serif;box-shadow:0 24px 90px #0009}.ps-account-dialog::backdrop{background:#0009;backdrop-filter:blur(6px)}.ps-account-dialog h2{font-size:22px;margin:0}.ps-account-dialog header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.ps-account-dialog header img{width:44px;height:44px;object-fit:cover;border-radius:50%;background:#fff}.ps-account-dialog button,.ps-account-dialog a{font:inherit}.ps-account-dialog .ps-menu-action{display:block;box-sizing:border-box;text-align:left;width:100%;padding:12px 0;border:0;border-bottom:1px solid #ffffff16;background:transparent;color:#fff;text-decoration:none;cursor:pointer}.ps-account-dialog .ps-menu-action:hover{color:#ffb11a}.ps-account-dialog .ps-close{width:32px;height:32px;border:0;border-radius:10px;background:#ffffff12;color:#fff;cursor:pointer}.ps-account-dialog label{display:block;margin-top:14px;color:#c6cbd3}.ps-account-dialog input:not([type=checkbox]){box-sizing:border-box;width:100%;padding:11px;margin-top:5px;border:1px solid #ffffff30;border-radius:10px;background:#080a0f;color:#fff;font:inherit}.ps-account-dialog small,.ps-account-dialog .ps-muted{display:block;font-size:12px;color:#9ca4b0}.ps-account-dialog .ps-primary{width:100%;margin:18px 0 8px;border:0;border-radius:12px;padding:12px;background:#ffb11a;color:#080a0f;font-weight:700;cursor:pointer}.ps-account-dialog .ps-primary:disabled{opacity:.5;cursor:wait}.ps-account-dialog .ps-profile-photo{display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;background:#fff;margin:0 auto 8px}.ps-account-dialog .ps-message{min-height:1.6em;color:#ffb11a;font-size:12px}.ps-account-dialog :focus-visible,.ps-account-trigger:focus-visible{outline:2px solid #ffb11a;outline-offset:3px}';
document.head.appendChild(style);
style.textContent += '.ps-legal-links{display:flex;align-items:center;justify-content:center;gap:14px;margin:16px 0}.ps-legal-links a{color:#8c939e;font-size:11px;font-weight:300;white-space:nowrap;text-decoration:none}.ps-legal-links a:hover{color:#c4cad3}';
style.textContent += '.ps-school-note{margin:20px 0 10px;font-size:12px;color:#9ca4b0;word-break:keep-all}.ps-school-help{border:1px solid #ffffff20;border-radius:12px;padding:12px;font-size:12px;color:#b8bcc4;word-break:keep-all}.ps-school-help summary{cursor:pointer;color:#d5d8df;font-size:13px;line-height:1.6}.ps-school-help summary::marker{color:#ffb11a}.ps-school-help ol{padding-left:20px;margin:12px 0}.ps-school-help li+li{margin-top:8px}.ps-school-help p{margin:10px 0 0}.ps-school-help a{color:#ffb11a;text-underline-offset:3px}';
style.textContent += '.ps-nickname-row{display:flex;gap:8px;align-items:center}.ps-nickname-row input{min-width:0;flex:1}.ps-random-name{flex:none;display:grid;place-items:center;width:42px;height:42px;margin-top:5px;border:1px solid #ffffff30;border-radius:12px;background:#ffffff08;color:#ffb11a;cursor:pointer}.ps-random-name svg{width:18px;height:18px}';
style.textContent += '.ps-studio-home{border:0!important;border-radius:50%!important;background:transparent!important;box-shadow:none!important;padding:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:hidden}.ps-account-trigger{transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}.ps-account-trigger:hover{transform:translateY(-2px);border-color:#ffb11a;box-shadow:0 0 0 3px #ffb11a22}.ps-account-trigger:active{transform:translateY(0)}@media(prefers-reduced-motion:reduce){.ps-account-trigger{transition:none}.ps-account-trigger:hover{transform:none}}';
function dialog(title) {
  const el = document.createElement('dialog'); el.className = 'ps-account-dialog'; el.setAttribute('aria-label', title);
  const header = document.createElement('header');
  const img = document.createElement('img'); img.src = MASCOT; img.alt = '';
  const h = document.createElement('h2'); h.textContent = title;
  const close = document.createElement('button'); close.type = 'button'; close.className = 'ps-close'; close.textContent = '×'; close.setAttribute('aria-label', '닫기'); close.onclick = () => el.close();
  header.append(img, h, close); el.append(header); document.body.append(el);
  el.addEventListener('click', e => { if (e.target === el) { const r = el.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) el.close(); } });
  return el;
}
const studio = dialog('parcyun studio');
const studioWordmark = document.createElement('a'); studioWordmark.href = '/'; studioWordmark.className = 'ps-studio-wordmark'; studioWordmark.textContent = 'parcyun studio'; studioWordmark.setAttribute('aria-label', 'parcyun studio 홈으로 이동');
studio.querySelector('h2').replaceChildren(studioWordmark);
style.textContent += '.ps-account-dialog .ps-studio-wordmark{display:inline-block;font-family:"Covered By Your Grace",cursive;font-size:30px;font-weight:400;color:#ffb11a;text-decoration:none;transition:color .2s ease,transform .2s ease}.ps-account-dialog .ps-studio-wordmark:hover{color:#ffd27a;transform:translateY(-2px)}.ps-studio-support{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:28px}.ps-studio-coffee,.ps-studio-share{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;background:transparent;cursor:pointer;white-space:nowrap}.ps-studio-coffee{color:#ffb11a;padding:0;font:300 12px Montserrat,Pretendard,sans-serif}.ps-studio-coffee:hover{color:#ffd27a}.ps-studio-share{background:#ffb11a;color:#000;padding:10px 15px!important;border-radius:100px;min-height:40px;font:700 12px Pretendard,sans-serif;transition:transform .2s ease,background .2s ease}.ps-studio-share svg{width:14px;height:14px;flex:none}.ps-studio-share:hover{background:#e89500!important;transform:translateY(-2px)}@media(max-width:480px){.ps-studio-support{flex-direction:column;align-items:stretch}.ps-studio-share{order:-1;width:100%;min-height:44px}.ps-studio-coffee{min-height:40px}}@media(prefers-reduced-motion:reduce){.ps-account-dialog .ps-studio-wordmark,.ps-studio-share{transition:none}.ps-account-dialog .ps-studio-wordmark:hover,.ps-studio-share:hover{transform:none}}';
function menuAction(label, action) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ps-menu-action'; b.textContent = label; b.onclick = () => { studio.close(); action(); }; studio.append(b); }
menuAction('기능 개선 요청', () => document.querySelector('#foot-report')?.click());
menuAction('리뷰 남기기', () => { const link = document.querySelector('a[href*="/reviews/"]'); if (link) location.href = link.href; });
const support = document.createElement('div'); support.className = 'ps-studio-support'; studio.append(support);
style.textContent += '.ps-account-dialog .ps-studio-share{box-sizing:border-box;border-radius:24px!important;height:44px;min-height:44px;flex-shrink:0;line-height:1.2;appearance:none;-webkit-appearance:none}.ps-account-dialog .ps-studio-share svg{display:block;width:18px;height:18px;flex:0 0 18px}.ps-account-dialog .ps-studio-wordmark:focus{outline:none}.ps-account-dialog .ps-studio-wordmark:focus-visible{text-decoration:underline;text-underline-offset:6px}.ps-account-dialog header h2{min-width:0}.ps-account-dialog header .ps-close,.ps-account-dialog header img{flex-shrink:0}@media(max-width:360px){.ps-account-dialog .ps-studio-wordmark{font-size:26px}.ps-account-dialog{padding:20px}}';
const account = dialog('내 프로필');
const body = document.createElement('div'); account.append(body);
const legalDialog = dialog('이용약관');
legalDialog.classList.add('ps-legal-dialog');
const legalBody = document.createElement('div'); legalBody.className = 'ps-legal-body'; legalBody.setAttribute('aria-live', 'polite'); legalDialog.append(legalBody);
style.textContent += '.ps-legal-dialog{width:min(720px,calc(100vw - 24px));max-height:85dvh;overflow:hidden}.ps-legal-body{overflow:auto;max-height:calc(85dvh - 132px);overscroll-behavior:contain;line-height:1.9;word-break:keep-all}.ps-legal-body h1{font-size:28px;color:#ffb11a}.ps-legal-body h2{font-size:18px;margin-top:24px}.ps-legal-body p{color:#b8bcc4}.ps-legal-body a{color:#ffb11a}';
let legalRequest = 0;
async function openLegal(path) {
  const request = ++legalRequest;
  const title = path === '/terms/' ? '이용약관' : '개인정보처리방침';
  legalDialog.setAttribute('aria-label', title); legalDialog.querySelector('h2').textContent = title;
  legalBody.textContent = '불러오는 중…';
  if (!legalDialog.open) legalDialog.showModal();
  try {
    const response = await fetch(path); if (!response.ok) throw new Error('policy unavailable');
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const content = page.querySelector('main.policy'); if (!content) throw new Error('policy missing');
    if (request !== legalRequest) return;
    legalBody.replaceChildren(document.importNode(content, true)); legalBody.scrollTop = 0;
  } catch { if (request === legalRequest) legalBody.textContent = '문서를 불러오지 못했습니다. 닫은 뒤 다시 열어 주세요.'; }
}
for (const host of [account, legalDialog]) host.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link && ['/terms/', '/privacy/'].includes(link.getAttribute('href'))) { event.preventDefault(); openLegal(link.getAttribute('href')); }
});
const SCHOOL_ICON='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#ffb11a18"/><g fill="none" stroke="#ffb11a" stroke-width="1.8" stroke-linejoin="round"><path d="M6 34h28M10 34V15l10-7 10 7v19M16 34V23h8v11M7 17l13-9 13 9M15 18h2m6 0h2M18 6h9v4h-7"/></g></svg>');
function setSchoolIcon(icon,school){icon.src=SCHOOL_ICON;icon.alt='학교 마크';icon.loading='lazy';schoolMark(school).then(src=>{if(src){icon.src=src;icon.style.background='#fff';icon.style.padding='3px';icon.style.boxSizing='border-box';icon.style.borderRadius='7px';}});icon.onerror=()=>{icon.onerror=null;icon.src=SCHOOL_ICON;};}
const schoolDialog=dialog('학교 검색');schoolDialog.classList.add('ps-school-dialog');
const schoolBody=document.createElement('div');schoolDialog.append(schoolBody);
schoolBody.innerHTML='<form class="ps-school-search"><label for="ps-school-query">학교 이름</label><div class="ps-school-query-row"><input id="ps-school-query" placeholder="학교 이름을 2글자 이상 입력" autocomplete="off"><button type="submit">검색</button></div><label for="ps-school-region">지역</label><select id="ps-school-region" aria-label="학교 검색 지역"></select></form><p class="ps-school-status" role="status"></p><div class="ps-school-results"></div><small>출처: 나이스 교육정보 개방 포털 · 마크는 학교 공식 홈페이지에서 수집해 서버에 보관해요. 아직 확보하지 못한 학교는 기본 아이콘으로 표시돼요.</small>';
for(const [code,name]of SCHOOL_REGIONS){const option=document.createElement('option');option.value=code;option.textContent=name;schoolBody.querySelector('select').append(option);}
let selectSchool,schoolTimer,schoolRequest=0,schoolAbort;
function openSchoolSearch(onSelect){selectSchool=onSelect;schoolDialog.showModal();const input=schoolBody.querySelector('input');input.focus();input.select();if(input.value.trim().length>=2)findSchools();else schoolBody.querySelector('.ps-school-status').textContent='학교 이름을 입력해 주세요.';}
async function findSchools(){
  clearTimeout(schoolTimer);schoolAbort?.abort();const request=++schoolRequest;
  const name=schoolBody.querySelector('input').value.trim(),region=schoolBody.querySelector('select').value,status=schoolBody.querySelector('.ps-school-status'),results=schoolBody.querySelector('.ps-school-results');results.replaceChildren();
  if(name.length<2){status.textContent='학교 이름을 2글자 이상 입력해 주세요.';return;}
  schoolAbort=new AbortController();status.textContent='학교를 검색하고 있어요…';
  try{const data=await searchSchools(name,region,schoolAbort.signal);if(request!==schoolRequest||!schoolDialog.open)return;
    status.textContent=data.total?`검색 결과 ${data.total}곳${data.total>data.rows.length?' · 처음 '+data.rows.length+'곳을 표시해요. 지역이나 학교 전체 이름으로 좁혀 주세요.':''}`:'검색 결과가 없어요. 학교 이름과 지역을 확인해 주세요.';
    for(const school of data.rows){const button=document.createElement('button');button.type='button';const name=document.createElement('b');name.textContent=school.name;const address=document.createElement('span');address.textContent=school.address||'도로명 주소 정보 없음';const icon=document.createElement('img');icon.width=36;icon.height=36;setSchoolIcon(icon,school);const label=document.createElement('div');label.append(name,address);button.append(icon,label);button.onclick=()=>{selectSchool?.(school);schoolDialog.close();};results.append(button);}
  }catch(error){if(error.name!=='AbortError'&&request===schoolRequest)status.textContent=error.message||'학교 검색을 다시 시도해 주세요.';}
}
schoolBody.querySelector('form').onsubmit=event=>{event.preventDefault();findSchools();};
schoolBody.querySelector('input').oninput=()=>{clearTimeout(schoolTimer);schoolTimer=setTimeout(findSchools,350);};
schoolBody.querySelector('select').onchange=findSchools;
schoolDialog.addEventListener('close',()=>{clearTimeout(schoolTimer);schoolAbort?.abort();schoolRequest++;});
style.textContent+='.ps-account-dialog .ps-local-start{width:100%;min-height:44px;padding:12px;border:1px solid #ffb11a66;border-radius:12px;background:#ffb11a12;color:#ffcf78;cursor:pointer}.ps-device-note{padding:12px;border:1px solid #ffb11a44;border-radius:12px;background:#ffb11a0c;line-height:1.7}.ps-account-dialog #ps-school{cursor:pointer}.ps-selected-school{display:flex;align-items:center;gap:12px;margin-top:10px;padding:12px;border:1px solid #ffffff24;border-radius:12px}.ps-selected-school[hidden]{display:none}.ps-selected-school img{width:36px;height:36px;object-fit:contain;border-radius:8px;flex:none}.ps-selected-school span{flex:1;min-width:0;overflow-wrap:anywhere;font-size:13px;color:#fff}.ps-selected-school button,.ps-school-query-row button{flex:none;min-height:40px;border:1px solid #ffb11a55;border-radius:10px;background:#ffb11a12;color:#ffcf78;padding:8px 12px;cursor:pointer}.ps-school-dialog{width:min(560px,calc(100vw - 32px))}.ps-school-query-row{display:flex;gap:8px;align-items:center}.ps-school-query-row input{min-width:0;flex:1}.ps-school-query-row button{margin-top:5px}.ps-school-search select{box-sizing:border-box;width:100%;padding:10px;margin-top:5px;border:1px solid #ffffff30;border-radius:10px;background:#080a0f;color:#fff;font:inherit}.ps-school-results{display:grid;gap:8px;max-height:42dvh;overflow:auto;overscroll-behavior:contain;margin-bottom:16px}.ps-school-results button{padding:14px;text-align:left;border:1px solid #ffffff24;border-radius:12px;background:#171c24;color:#fff;cursor:pointer}.ps-school-results button:hover{border-color:#ffb11a}.ps-school-results b,.ps-school-results span{display:block}.ps-school-results b{font-size:14px}.ps-school-results span{margin-top:4px;font-size:12px;line-height:1.6;color:#aeb5c3}.ps-school-status{font-size:12px;color:#ffcf78;line-height:1.7}';
let sdk, sdkPromise, user = null, profile = {}, photo = '', trigger;
function message(text) { const node = body.querySelector('.ps-message'); if (node) node.textContent = text; }
async function loadSdk() {
  if (!sdkPromise) sdkPromise = (async () => {
    const [app, auth, db] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
    ]);
    const firebase = app.initializeApp(CONFIG, 'parcyun-games');
    sdk = { authApi: auth, dbApi: db, auth: auth.getAuth(firebase), db: db.getFirestore(firebase) };
    await auth.setPersistence(sdk.auth, auth.browserLocalPersistence);
    auth.onAuthStateChanged(sdk.auth, async value => {
      user = value; profile = {}; photo = '';
      if (user&&!user.isAnonymous) {
        try { const snap = await db.getDoc(db.doc(sdk.db, 'profiles', user.uid)); profile = snap.exists() ? snap.data() : {}; }
        catch { profile = {}; }
      }
      if(!user||user.isAnonymous)profile=localProfiles.current()||{};
      renderAccount(); renderTrigger();
    });
    return sdk;
  })().catch(error => { sdkPromise = null; throw error; });
  return sdkPromise;
}
function renderTrigger() {
  if (!trigger) return;
  trigger.replaceChildren();
  if ((user&&!user.isAnonymous)||localProfiles.current()) { const img = document.createElement('img'); img.src = profile.photo || user?.photoURL || MASCOT; img.alt = ''; img.referrerPolicy = 'no-referrer'; trigger.append(img); }
  else trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>';
  trigger.setAttribute('aria-label', (user&&!user.isAnonymous)||localProfiles.current() ? '내 프로필 열기' : '로그인 및 내 프로필 만들기');
}
function legalLinks() { return '<div class="ps-legal-links"><a href="/terms/" target="_blank" rel="noopener noreferrer">이용약관</a><a href="/privacy/" target="_blank" rel="noopener noreferrer">개인정보처리방침</a></div>'; }
function randomNickname() {
  const first = ['별빛','노을','구름','바람','새벽','햇살','달빛','여름','가을','겨울','봄날','우주','파도','숲속','은빛','초록','보라','산들','반짝','포근'];
  const second = ['수달','고래','여우','토끼','다람쥐','펭귄','두루미','고양이','강아지','사슴','돌고래','나비','부엉이','참새','코알라','판다','해달','두더지','병아리','기린'];
  return first[Math.floor(Math.random() * first.length)] + second[Math.floor(Math.random() * second.length)];
}
function renderAccount() {
  if ((!user||user.isAnonymous)&&!localProfiles.current()&&!creatingLocal) {
    body.innerHTML = '<p>Google 계정으로 로그인하면 별명과 프로필을 다른 기기에서도 사용할 수 있어요.</p><p class="ps-muted">개인 기록은 브라우저에 저장돼요. 스펠 드릴에서 기록 제출을 누르면 별명과 최고 기록이 전체 랭킹에 공개돼요. 게임은 로그인 없이도 이용할 수 있어요.</p><button type="button" class="ps-primary" id="ps-google-login">Google 계정으로 로그인</button><button type="button" class="ps-local-start" id="ps-local-start">회원가입 없이 내 프로필 만들기</button><p class="ps-muted">브라우저 프로필은 현재 기기·브라우저에서만 확인할 수 있어요. 프로필을 만든 뒤 랭킹에 기록을 제출할 수 있어요.</p><p class="ps-message" role="status"></p>' + legalLinks() + `
      <p class="ps-school-note">학교 학생 계정은 기관 설정에 따라 Google 로그인에 관리자 승인이 필요할 수 있어요.</p>
      <details class="ps-school-help">
        <summary>관리자 승인 안내가 나오면 어떻게 해야 하나요?</summary>
        <ol>
          <li>Google 안내 화면에 ‘액세스 요청’ 버튼이 있으면 눌러 주세요.</li>
          <li>학교의 Google Workspace 관리자에게 로그인 화면에 표시된 앱의 사용 승인을 요청해 주세요. 교육청에서 관리하는 계정이라면 교육청 담당자에게 문의해 주세요.</li>
          <li>관리자는 Google 관리 콘솔의 ‘보안 → 액세스 및 데이터 관리 → API 관리 → 서드 파티 앱 액세스 관리’에서 해당 앱의 요청 권한을 검토하고, 필요한 학생 조직에 사용을 허용할 수 있어요.</li>
        </ol>
        <p>이 제한은 사이트에서 해제할 수 없어요. 승인 전에도 브라우저 프로필을 만들어 게임과 랭킹 제출을 이용할 수 있어요. Google 계정 연동은 관리자 승인 후 사용할 수 있어요.</p>
        <p><a href="https://support.google.com/edu/classroom/answer/11081157?hl=ko" target="_blank" rel="noopener noreferrer">Google 공식 안내 보기 ↗</a></p>
      </details>`;
    body.querySelector('#ps-local-start').onclick=()=>{creatingLocal=true;profile=localProfiles.current()||{};renderAccount();};
    body.querySelector('#ps-google-login').onclick = async e => {
      e.currentTarget.disabled = true; message('Google 로그인 창을 여는 중입니다.');
      try { const s = await loadSdk(); const provider = new s.authApi.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' }); await s.authApi.signInWithPopup(s.auth, provider); }
      catch (error) { message(error.code === 'auth/popup-closed-by-user' ? '로그인 창을 닫았습니다.' : error.code === 'auth/popup-blocked' ? '브라우저에서 로그인 팝업을 허용해 주세요.' : '로그인에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
      finally { const button = body.querySelector('#ps-google-login'); if (button) button.disabled = false; }
    };
    return;
  }
  body.innerHTML = '<img class="ps-profile-photo" alt="내 프로필 사진"><label>프로필 이미지<input type="file" id="ps-photo" accept="image/png,image/jpeg,image/webp"></label><label>이름<input id="ps-nickname" maxlength="20" minlength="2" autocomplete="nickname" required></label><small>실명은 사용하지 마세요. 2~20자의 별명을 입력해 주세요.</small><label>학교 이름<input id="ps-school" maxlength="60" placeholder="학교 검색 · 선택 사항" readonly aria-haspopup="dialog"></label><div class="ps-selected-school" hidden></div><small>학교 이름은 선택 사항이며 스펠 드릴·지오웹 기록 제출 시 랭킹에 공개됩니다. 미입력 시 재미있는 모험 별명이 표시됩니다.</small><button class="ps-primary" type="button" id="ps-save-profile">프로필 저장</button><p class="ps-message" role="status"></p>' + legalLinks() + ((user&&!user.isAnonymous)?'<button type="button" class="ps-menu-action" id="ps-signout">로그아웃</button>':'');
  const browserOnly=!user||user.isAnonymous;
  if(browserOnly){const note=document.createElement('p');note.className='ps-muted ps-device-note';note.textContent='현재 기기·브라우저에서만 확인할 수 있는 프로필이에요. 사이트 데이터를 지우면 복구할 수 없어요. 프로필을 수정하면 새 프로필로 구분되어 이전 랭킹 기록과 분리됩니다.';body.prepend(note);}
  let selectedSchool=normalizeSchool(profile.schoolInfo);
  const schoolField=body.querySelector('#ps-school');
  const showSchool=()=>{const card=body.querySelector('.ps-selected-school');card.replaceChildren();const name=selectedSchool?.name||schoolField.value;card.hidden=!name;if(!name)return;const icon=document.createElement('img');icon.width=36;icon.height=36;icon.alt='학교 아이콘';icon.referrerPolicy='no-referrer';setSchoolIcon(icon,selectedSchool);icon.onerror=()=>{icon.onerror=null;icon.src=SCHOOL_ICON;};const label=document.createElement('span');label.textContent=name;const change=document.createElement('button');change.type='button';change.textContent='변경';change.onclick=()=>openSchoolSearch(chooseSchool);card.append(icon,label,change);};
  const chooseSchool=school=>{selectedSchool=school;schoolField.value=school.name;showSchool();message('학교를 선택했어요. 프로필 저장을 눌러 적용하세요.');};
  schoolField.onclick=()=>openSchoolSearch(chooseSchool);
  schoolField.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openSchoolSearch(chooseSchool);}};
  const preview = body.querySelector('.ps-profile-photo'); preview.src = profile.photo || user?.photoURL || MASCOT; preview.referrerPolicy = 'no-referrer';
  const nicknameField = body.querySelector('#ps-nickname');
  nicknameField.setAttribute('aria-label', '이름');
  nicknameField.value = profile.nickname || randomNickname();
  const nicknameRow = document.createElement('div'); nicknameRow.className = 'ps-nickname-row'; nicknameField.before(nicknameRow); nicknameRow.append(nicknameField);
  const randomButton = document.createElement('button'); randomButton.type = 'button'; randomButton.className = 'ps-random-name'; randomButton.setAttribute('aria-label', '두 단어로 무작위 별명 생성'); randomButton.title = '새 별명 만들기';
  randomButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7"/></svg>';
  randomButton.onclick = () => { let name; do { name = randomNickname(); } while (name === nicknameField.value); nicknameField.value = name; nicknameField.focus(); message('새 별명을 만들었어요. 프로필 저장을 눌러 적용하세요.'); };
  nicknameRow.append(randomButton);
  body.querySelector('#ps-school').value = profile.school || '';showSchool();
  body.querySelector('#ps-photo').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { message('8MB 이하의 PNG·JPG·WebP 이미지를 선택해 주세요.'); e.target.value = ''; return; }
    try {
      const bitmap = await createImageBitmap(file); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const side = Math.min(bitmap.width, bitmap.height); canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 128, 128); bitmap.close();
      photo = canvas.toDataURL('image/webp', .8); preview.src = photo; message('저장하면 새 사진이 적용됩니다.');
    } catch { message('이 이미지를 열지 못했습니다. 다른 이미지를 선택해 주세요.'); }
  };
  body.querySelector('#ps-save-profile').onclick = async e => {
    const nickname = body.querySelector('#ps-nickname').value.trim(); const school = body.querySelector('#ps-school').value.trim();
    if (nickname.length < 2 || nickname.length > 20) { message('2~20자의 별명을 입력해 주세요. 실명은 사용하지 마세요.'); return; }
    if (isReservedNickname(nickname)) { message('DEXTER와 parcyun이 포함된 별명은 사용할 수 없어요. 다른 별명을 입력해 주세요.'); return; }
    e.currentTarget.disabled = true;
    try {
      const next={nickname,school,photo:photo||profile.photo||'',...(selectedSchool?{schoolInfo:selectedSchool}:{})};
      if(browserOnly){profile=localProfiles.save(next);creatingLocal=false;photo='';renderTrigger();account.close();ensureBrowserIdentity().catch(()=>message('프로필은 이 브라우저에 저장됐어요. 랭킹 연결은 네트워크가 복구되면 다시 시도해 주세요.'));}
      else{const s=await loadSdk();next.updatedAt=s.dbApi.serverTimestamp();await s.dbApi.setDoc(s.dbApi.doc(s.db,'profiles',user.uid),next);profile=next;photo='';renderTrigger();account.close();}
    } catch { message('저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.'); }
    finally { const button = body.querySelector('#ps-save-profile'); if (button) button.disabled = false; }
  };
  if(body.querySelector('#ps-signout'))body.querySelector('#ps-signout').onclick = async () => { try { const s = await loadSdk(); await s.authApi.signOut(s.auth); } catch { message('로그아웃하지 못했습니다. 다시 시도해 주세요.'); } };
}
function install() {
  studio.querySelector('.ps-menu-action').style.display = document.querySelector('#foot-report') ? '' : 'none';
  const coffeeOriginal = document.querySelector('#ps-coffee');
  const shareOriginal = document.querySelector('.ps-share-fab');
  if (!support.childElementCount && coffeeOriginal && shareOriginal) {
    for (const [original, className] of [[coffeeOriginal, 'ps-studio-coffee'], [shareOriginal, 'ps-studio-share']]) {
      const copy = original.cloneNode(true); copy.removeAttribute('id'); copy.removeAttribute('style'); copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id')); copy.className = className;
      const computed = getComputedStyle(original);
      for (const property of ['color', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'gap']) copy.style[property] = computed[property];
      if (original === shareOriginal) copy.style.backgroundColor = computed.backgroundColor;
      copy.onclick = () => { studio.close(); original.click(); }; support.append(copy);
    }
  }
  const home = document.querySelector('#ps-back-btn,.home-fab,.ps-back');
  if (home && !home.dataset.studioMenu) {
    home.dataset.studioMenu = 'true'; home.removeAttribute('onclick'); home.classList.add('ps-studio-home'); home.setAttribute('role', 'button'); home.setAttribute('aria-label', 'parcyun studio 메뉴'); home.setAttribute('aria-haspopup', 'dialog'); home.title = 'parcyun studio 메뉴';
    const img = document.createElement('img'); img.src = MASCOT; img.alt = ''; img.className = 'ps-studio-avatar'; home.querySelector('svg')?.setAttribute('style', 'display:none'); home.append(img);
    home.addEventListener('click', e => { e.preventDefault(); studio.showModal(); });
    home.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); studio.showModal(); } });
  }
  const row = document.querySelector('.ps-service-row');
  if (row && !trigger) {
    trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'ps-account-trigger'; trigger.setAttribute('aria-haspopup', 'dialog'); row.prepend(trigger); renderTrigger();
    trigger.onclick = () => { renderAccount(); account.showModal(); loadSdk().catch(() => message('계정 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')); };
  }
}
new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
install();
loadSdk().catch(() => {});
let anonymousLogin;
async function ensureBrowserIdentity(){const s=await loadSdk();await s.auth.authStateReady();if(!s.auth.currentUser&&localProfiles.current()){if(!anonymousLogin)anonymousLogin=s.authApi.signInAnonymously(s.auth).finally(()=>{anonymousLogin=null;});await anonymousLogin;}return s;}
const rankingContext=async()=>{const s=await ensureBrowserIdentity();const value=s.auth.currentUser;let saved={},entryId;
  if(value?.isAnonymous){const local=localProfiles.current();if(!local)return {s,user:null,profile:{},nickname:randomNickname()};saved=local;entryId=`${value.uid}_${local.version}`;}
  else if(value){const snap=await s.dbApi.getDoc(s.dbApi.doc(s.db,'profiles',value.uid));saved=snap.exists()?snap.data():{};}
  return {s,user:value,profile:saved,entryId,nickname:randomNickname()};};
window.psGameRanking=createLeaderboard(rankingContext);
window.psGeoRanking=createLeaderboard(rankingContext,'geo');

window.psRankingAffiliation=rankingAffiliation;

window.addEventListener('ps-browser-profile-updated',()=>{if(!user||user.isAnonymous){profile=localProfiles.current()||{};renderTrigger();if(account.open)renderAccount();}});

style.textContent+='@keyframes ps-profile-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.ps-account-dialog[open]{animation:ps-profile-enter .25s ease-out}.ps-selected-school,.ps-school-results button,.ps-local-start{transition:background .2s ease,border-color .2s ease}@media(prefers-reduced-motion:reduce){.ps-account-dialog[open]{animation:none}.ps-selected-school,.ps-school-results button,.ps-local-start{transition:none}}';

style.textContent+='.ps-school-results button{display:flex;align-items:center;gap:12px}.ps-school-results button img{width:36px;height:36px;object-fit:contain;flex:none}.ps-school-results button div{min-width:0}';
