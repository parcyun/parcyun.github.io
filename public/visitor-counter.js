/* parcyun studio · 방문자 카운터 (Supabase)
   같은 브라우저에서는 페이지별·방문일별 한 번만 방문을 집계하고,
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
  var LOCAL_HOSTS = { localhost: true, '127.0.0.1': true, '::1': true, '[::1]': true };
  if (LOCAL_HOSTS[location.hostname]) return;

  var path = (location.pathname || '/').replace(/index\.html$/, '');
  if (path === '') path = '/';
  var isMain = (path === '/');   // 메인만 전역 토탈, 나머지는 각 페이지 카운트
  var scopePaths = Array.isArray(window.__psVisitorScopePaths) && window.__psVisitorScopePaths.length
    ? window.__psVisitorScopePaths
    : null;

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
    if (!scopePaths) {
      render(fallback.today, fallback.total);
      return;
    }
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
        if (!d) return render(fallback.today, fallback.total);
        render(d.today, d.total);
      })
      .catch(function () { render(fallback.today, fallback.total); });
  }

  function readTotals() {
    fetch(SUPABASE_URL + '/rest/v1/rpc/get_visit_totals', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ p_paths: scopePaths || [path] })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) { if (d) render(d.today, d.total); })
      .catch(function () {});
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
        // 메인(/)은 사이트 전역 토탈, 그 외 페이지는 해당 페이지 카운트
        var today = isMain ? d.all_today : d.page_today;
        var total = isMain ? d.all_total : d.page_total;
        renderScopeTotals({ today: today, total: total });
      })
      .catch(function () { /* 네트워크/설정 오류는 조용히 무시 — 사이트에 영향 없음 */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
