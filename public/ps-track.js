/* parcyun studio · 자료 클릭/다운로드 집계 (Supabase bump_resource RPC)
   [data-res-id] 속성이 있는 링크 클릭 시 조용히 집계. 실패해도 무동작(사용자 경험 영향 없음).
   [data-res-kind]="click"(기본)|"download". 스키마 미적용 시엔 그냥 실패→무시. */
(function () {
  var URL = 'https://myeouecgpjxcddemexcg.supabase.co';
  var KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';
  if (window.__psTrack) return;
  window.__psTrack = true;

  function bump(id, kind) {
    if (!id) return;
    try {
      fetch(URL + '/rest/v1/rpc/bump_resource', {
        method: 'POST',
        keepalive: true,
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_resource_id: String(id), p_kind: kind || 'click' })
      }).catch(function () {});
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var el = t && t.closest ? t.closest('[data-res-id]') : null;
    if (!el) return;
    bump(el.getAttribute('data-res-id'), el.getAttribute('data-res-kind') || 'click');
  }, true);

  window.psTrack = bump;   // 필요 시 수동 호출용
})();
