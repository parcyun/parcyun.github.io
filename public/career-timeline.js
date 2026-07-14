/* parcyun studio · database-backed home career timeline.
   The static Astro timeline stays visible if the request fails. */
(function () {
  var list = document.getElementById('career-list');
  if (!list || window.__psCareerTimeline) return;
  window.__psCareerTimeline = true;
  var URL = 'https://myeouecgpjxcddemexcg.supabase.co';
  var KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';

  function request() {
    return fetch(URL + '/rest/v1/rpc/list_career_timeline', {
      method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}'
    }).then(function (res) { if (!res.ok) throw new Error('career load failed'); return res.json(); });
  }
  function span(className, value) { var el = document.createElement('span'); el.className = className; el.textContent = value || ''; return el; }
  function render(sections) {
    if (!Array.isArray(sections) || !sections.length) return;
    var fragment = document.createDocumentFragment();
    sections.forEach(function (section) {
      var heading = document.createElement('div'); heading.className = 'career-category-header'; heading.textContent = section.title || ''; fragment.appendChild(heading);
      (section.items || []).forEach(function (item) {
        var row = document.createElement('div'); row.className = 'career-item'; row.dataset.careerId = item.id || '';
        row.appendChild(span('career-year', item.year)); row.appendChild(span('career-role', item.role)); row.appendChild(span('career-org', item.org)); fragment.appendChild(row);
      });
    });
    list.replaceChildren(fragment);
  }
  request().then(render).catch(function () {});
})();
