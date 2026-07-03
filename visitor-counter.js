/* parcyun studio · 방문자 카운터 (Supabase)
   페이지 로드마다 bump_visit RPC를 호출해 방문을 집계하고,
   - 메인 페이지(/)  : 사이트 전역 토탈 표시 (오늘=오늘 전역, 전체=전 기간 전역)
   - 그 외 페이지     : 해당 페이지의 방문만 표시 (오늘=그 페이지 오늘, 전체=그 페이지 전 기간)
   표시 대상: #visitor-stats 요소가 있으면 그곳에, 없으면 좌측 하단에 자동 주입.
   설정(SUPABASE_URL / ANON_KEY)이 비어 있으면 아무 동작도 하지 않음(오류·요청 없음). */
(function () {
  // ===== CONFIG — 값이 채워지면 활성화됨 =====
  var SUPABASE_URL = 'https://myeouecgpjxcddemexcg.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';
  // ==========================================

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;   // 미설정 시 완전 무동작
  if (window.__psVisitorCounter) return;
  window.__psVisitorCounter = true;

  var path = (location.pathname || '/').replace(/index\.html$/, '');
  if (path === '') path = '/';
  var isMain = (path === '/');   // 메인만 전역 토탈, 나머지는 각 페이지 카운트

  function fmt(n) { try { return Number(n).toLocaleString('en-US'); } catch (e) { return String(n); } }

  function injectStyle() {
    if (document.getElementById('ps-visits-style')) return;
    var s = document.createElement('style');
    s.id = 'ps-visits-style';
    s.textContent =
      ".ps-visits{font-family:'JetBrains Mono','Montserrat',ui-monospace,monospace;font-size:11px;"
      + "letter-spacing:.02em;color:#8C8C8C;display:inline-flex;gap:10px;align-items:center}"
      + ".ps-visits b{color:#FFB11A;font-weight:700}"
      + ".ps-visits-item{white-space:nowrap}"
      + ".ps-visits-float{position:fixed;left:16px;bottom:14px;z-index:80;background:rgba(0,0,0,.55);"
      + "backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:6px 12px;border-radius:100px;"
      + "border:1px solid rgba(255,255,255,.08)}"
      + "@media(max-width:430px){.ps-visits-float{left:12px;bottom:12px;font-size:10px;gap:8px}}";
    document.head.appendChild(s);
  }

  function render(today, total) {
    injectStyle();
    var host = document.getElementById('visitor-stats');
    if (!host) {
      host = document.createElement('div');
      host.id = 'visitor-stats';
      host.className = 'ps-visits ps-visits-float';
      document.body.appendChild(host);
      // 고정 푸터(.ps-footer)가 좌하단 카운터 위치를 덮을 때만(모바일 전폭 푸터) 위로 띄움.
      // 데스크톱은 푸터가 우하단 pill이라 좌하단 코너 그대로 둠 → 히어로 버튼과 덜 겹침.
      var footer = document.querySelector('.ps-footer');
      if (footer) {
        try {
          var fr = footer.getBoundingClientRect();
          var hr = host.getBoundingClientRect();
          var overlaps = !(hr.right < fr.left || hr.left > fr.right || hr.bottom < fr.top || hr.top > fr.bottom);
          if (overlaps) host.style.bottom = (fr.height + 26) + 'px';
        } catch (e) {}
      }
    }
    host.innerHTML =
      '<span class="ps-visits-item">오늘 <b>' + fmt(today) + '</b></span>'
      + '<span class="ps-visits-item">전체 <b>' + fmt(total) + '</b></span>';
    host.hidden = false;
  }

  function run() {
    fetch(SUPABASE_URL + '/rest/v1/rpc/bump_visit', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ p_path: path })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        if (!d) return;
        // 메인(/)은 사이트 전역 토탈, 그 외 페이지는 해당 페이지 카운트
        var today = isMain ? d.all_today : d.page_today;
        var total = isMain ? d.all_total : d.page_total;
        render(today, total);
        // 공유 위젯이 초기 누적 공유 수를 이 응답에서 읽도록 전달 (별도 호출 없이)
        try {
          window.__psVisit = d;
          document.dispatchEvent(new CustomEvent('ps:visit', { detail: d }));
        } catch (e) {}
      })
      .catch(function () { /* 네트워크/설정 오류는 조용히 무시 — 사이트에 영향 없음 */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
