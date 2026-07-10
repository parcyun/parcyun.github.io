/* parcyun studio · 정적 텍스트 인라인 편집/오버라이드 (단일 소스, 빌드 불필요)
   - 모든 방문자: site_content 의 오버라이드를 해당 페이지의 편집대상 요소에 적용
   - 관리자(sessionStorage ps_admin_pw): 화면에서 바로 클릭→편집→저장(RPC)
   편집대상 = 정적 프로세만. React 아일랜드(astro-island)·푸터·nav·미디어 포함 요소는 제외
   → 자료/Works 카드 같은 동적 콘텐츠는 기존 모달이 담당하므로 충돌 없음. */
(function () {
  if (window.__psContent) return;            // world-map 처럼 스크립트 2회 로드돼도 1회만
  window.__psContent = true;

  var SB_URL = 'https://myeouecgpjxcddemexcg.supabase.co';
  var SB_KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';
  var PW_KEY = 'ps_admin_pw';
  var SEL = 'h1,h2,h3,h4,h5,h6,p,li,figcaption,blockquote,dd,dt,summary';
  var INLINE = { A: 1, STRONG: 1, EM: 1, B: 1, I: 1, BR: 1, SPAN: 1, SMALL: 1, MARK: 1, U: 1, CODE: 1 };

  function path() { return location.pathname.replace(/\/index\.html$/, '/'); }

  // 편집대상 목록(적용·편집이 동일 순서를 쓰도록 한 함수로 산출)
  function editables() {
    var out = [], nodes = document.body.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('astro-island') || el.closest('.ps-footer') || el.closest('nav') || el.closest('[data-noedit]')) continue;
      if (!el.textContent || !el.textContent.trim()) continue;
      var ok = true;                          // 자식은 인라인 태그만 허용(블록/미디어 있으면 제외)
      for (var c = 0; c < el.children.length; c++) { if (!INLINE[el.children[c].tagName]) { ok = false; break; } }
      if (ok) out.push(el);
    }
    return out;
  }
  function keyOf(el, idx) { return path() + '::' + el.tagName + '::' + idx; }

  function sanitize(html) {
    var t = document.createElement('template'); t.innerHTML = html;
    var bad = t.content.querySelectorAll('script,style,iframe,object');
    for (var i = 0; i < bad.length; i++) bad[i].remove();
    var all = t.content.querySelectorAll('*');
    for (var j = 0; j < all.length; j++) {
      var a = all[j].attributes;
      for (var k = a.length - 1; k >= 0; k--) if (/^on/i.test(a[k].name)) all[j].removeAttribute(a[k].name);
    }
    return t.innerHTML;
  }

  function headers() { return { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }; }

  // ===== 1) 오버라이드 적용(전 방문자) =====
  var list = editables();
  fetch(SB_URL + '/rest/v1/site_content?select=key,value', { headers: headers() })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      var map = {}; (rows || []).forEach(function (row) { map[row.key] = row.value; });
      list.forEach(function (el, i) { var v = map[keyOf(el, i)]; if (v != null) el.innerHTML = sanitize(v); });
    })
    .catch(function () {});

  // ===== 2) 관리자 인라인 편집 =====
  if (!sessionStorage.getItem(PW_KEY)) return;

  var css = document.createElement('style');
  css.textContent =
    '.ps-edit-on [data-ps-edit]{outline:1.5px dashed rgba(255,177,26,.55);outline-offset:3px;cursor:text;border-radius:3px;transition:outline-color .15s}' +
    '.ps-edit-on [data-ps-edit]:hover{outline-color:#FFB11A}' +
    '.ps-edit-on [data-ps-edit][contenteditable="true"]:focus{outline:2px solid #FFB11A;background:rgba(255,177,26,.08)}' +
    '#ps-edit-bar{position:fixed;left:14px;bottom:14px;z-index:99999;display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif}' +
    '#ps-edit-bar button{font:600 12.5px/1 system-ui;border:0;border-radius:100px;padding:9px 14px;cursor:pointer;background:#FFB11A;color:#000;box-shadow:0 4px 16px rgba(0,0,0,.4)}' +
    '#ps-edit-bar .ps-off{background:#222;color:#fff}' +
    '#ps-toast{position:fixed;left:14px;bottom:60px;z-index:99999;background:#111;color:#fff;font:500 12.5px system-ui;padding:8px 13px;border-radius:8px;opacity:0;transform:translateY(6px);transition:.2s;pointer-events:none}' +
    '#ps-toast.on{opacity:1;transform:none}';
  document.head.appendChild(css);

  var toast = document.createElement('div'); toast.id = 'ps-toast'; document.body.appendChild(toast);
  var tt;
  function say(m) { toast.textContent = m; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 1800); }

  list.forEach(function (el, i) { el.setAttribute('data-ps-edit', keyOf(el, i)); });

  function save(el) {
    var key = el.getAttribute('data-ps-edit'), val = sanitize(el.innerHTML.trim());
    if (val === el.getAttribute('data-ps-orig')) return;
    el.setAttribute('data-ps-orig', val);
    fetch(SB_URL + '/rest/v1/rpc/admin_save_content', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ p_pw: sessionStorage.getItem(PW_KEY), p_key: key, p_value: val })
    }).then(function (r) { say(r.ok ? '저장됨' : '저장 실패'); }).catch(function () { say('저장 실패'); });
  }

  var on = false;
  function setMode(v) {
    on = v; document.body.classList.toggle('ps-edit-on', on);
    list.forEach(function (el) {
      if (on) { el.setAttribute('contenteditable', 'true'); el.setAttribute('data-ps-orig', sanitize(el.innerHTML.trim())); el.addEventListener('blur', onBlur); }
      else { el.removeAttribute('contenteditable'); el.removeEventListener('blur', onBlur); }
    });
    btn.textContent = on ? '편집 끄기' : '✏️ 편집 켜기'; btn.className = on ? 'ps-off' : '';
  }
  function onBlur(e) { save(e.currentTarget); }

  var bar = document.createElement('div'); bar.id = 'ps-edit-bar';
  var btn = document.createElement('button'); btn.textContent = '✏️ 편집 켜기';
  btn.addEventListener('click', function () { setMode(!on); say(on ? '편집 모드 · 문구 클릭해 수정, 밖 클릭 시 저장' : '편집 종료'); });
  bar.appendChild(btn); document.body.appendChild(bar);
})();
