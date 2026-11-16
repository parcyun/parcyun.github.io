/* parcyun studio · 방문자 카운터 (Supabase)
   같은 브라우저에서는 페이지별·방문일별 한 번만 방문을 집계하고,
   - 메인 페이지(/)  : 사이트 전역 토탈 표시 (오늘=오늘 전역, 전체=전 기간 전역)
   - 자료실·Works    : 자체 페이지와 연결된 내부 페이지 방문 합계
   - 개별 서비스    : 해당 페이지의 방문만 표시
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
  var LOCAL_HOSTS = { localhost: true, '127.0.0.1': true, '::1': true, '[::1]': true };
  if (LOCAL_HOSTS[location.hostname]) return;

  var path = (location.pathname || '/').replace(/index\.html$/, '');
  if (path === '') path = '/';
  // 상위 페이지도 원본 page_visits만 합산한다. 이미 계산한 상위 합계나
  // 외부 링크 클릭 수를 다시 더하면 같은 방문이 중복되므로 포함하지 않는다.
  var atlasPaths = ['/atlas-gears/', '/spell-drill/', '/world-map/', '/satury/', '/math-solid-volume/'];
  var lecturePaths = ['/academica/', '/academica-parcyun-studio/', '/llm-fundamentals/'];
  var worksPaths = ['/works/', '/works/002-i-am-serif/', '/works/masterclass/', '/works/mdbf/'];
  var parentScopes = {
    '/atlas-gears/': atlasPaths,
    '/academica/': lecturePaths,
    '/works/': worksPaths,
    '/': ['/'].concat(atlasPaths, lecturePaths, worksPaths, [
      '/reviews/', '/studio/', '/dexterity/hyangmisa/', '/spell-drill/about/',
      '/world-map/about/', '/satury/about/', '/terms/', '/privacy/', '/library/', '/arcade/',
      '/mongdang-production-schedule.html', '/dashboard.html'
    ])
  };
  var configuredPaths = Array.isArray(window.__psVisitorScopePaths) && window.__psVisitorScopePaths.length
    ? window.__psVisitorScopePaths
    : null;
  var scopePaths = parentScopes[path] || configuredPaths || [path];

  function visitorDay() {
    var shifted = new Date(Date.now() - 6 * 60 * 60 * 1000);
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(shifted);
    } catch (e) { return shifted.toISOString().slice(0, 10); }
  }
  var visitKey = 'ps_visit_counted:' + visitorDay() + ':' + path;
  function alreadyCounted() { try { return localStorage.getItem(visitKey) === '1'; } catch (e) { return false; } }
  function markCounted() { try { localStorage.setItem(visitKey, '1'); } catch (e) {} }

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
      + ".ps-visits-float{position:fixed;left:var(--ps-brand-left, 16px);bottom:calc(var(--ps-footer-h,0px) + var(--ps-brand-h,30px) + 18px);z-index:80;background:rgba(0,0,0,.55);"
      + "backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:6px 12px;border-radius:100px;"
      + "border:1px solid rgba(255,255,255,.08)}"
      + "@media(max-width:480px){.ps-visits-float{font-size:10px;gap:8px}}";
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
    }
    host.innerHTML =
      '<span class="ps-visits-item">오늘 <b>' + fmt(today) + '</b></span>'
      + '<span class="ps-visits-item">전체 <b>' + fmt(total) + '</b></span>';
    host.hidden = false;
  }

  function renderScopeTotals(fallback) {
    fetch(SUPABASE_URL + '/rest/v1/rpc/get_visit_totals', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ p_paths: scopePaths })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        if (!d) return;
        render(d.today, d.total);
      })
      .catch(function () {
        // 집계 실패를 자체 방문수로 바꾸면 상위 페이지 숫자가 갑자기 작아진다.
        if (fallback && !parentScopes[path]) render(fallback.today, fallback.total);
      });
  }

  function readTotals() {
    renderScopeTotals();
  }

  function run() {
    if (alreadyCounted()) { readTotals(); return; }
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
        markCounted();
        renderScopeTotals({ today: d.page_today, total: d.page_total });
      })
      .catch(function () { /* 네트워크/설정 오류는 조용히 무시 — 사이트에 영향 없음 */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
