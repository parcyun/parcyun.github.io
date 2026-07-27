/* parcyun studio · 기능 개선 요청 게시판 (공개 글은 관리자 승인 후에만 표시) */
(function () {
  if (window.__psFeedbackBoard) return;
  window.__psFeedbackBoard = true;

  var SUPABASE_URL = 'https://myeouecgpjxcddemexcg.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';
  var VOTER_KEY = 'ps_feedback_voter';
  var serviceKey = window.__psFeedbackServiceKey || 'other';
  var submissionServiceKey = window.__psFeedbackSubmissionServiceKey || 'other';
  var serviceContext = window.PSServiceContext;
  var SERVICE_LABELS = {
    home: 'parcyun studio',
    'spell-drill': 'Spell Drill',
    'atlas-gears': 'ATLAS GEARS',
    geoweb: 'GeoWeb',
    works: 'Works',
    other: '기타'
  };
  var opener = null;

  function voterId() {
    var saved = localStorage.getItem(VOTER_KEY);
    if (saved) return saved;
    var id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'feedback-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
    localStorage.setItem(VOTER_KEY, id);
    return id;
  }

  function rpc(fn, args) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) {
          try { throw new Error(JSON.parse(text).message || text); } catch (e) { throw e instanceof Error ? e : new Error(text); }
        }
        return text ? JSON.parse(text) : null;
      });
    });
  }

  function dateText(value) {
    try { return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(value)); }
    catch (e) { return ''; }
  }

  var modal = document.createElement('section');
  modal.className = 'ps-feedback-modal';
  modal.hidden = true;
  modal.innerHTML = ''
    + '<div class="ps-feedback-backdrop" data-feedback-close></div>'
    + '<div class="ps-feedback-card" role="dialog" aria-modal="true" aria-labelledby="ps-feedback-title">'
    + '<button class="ps-feedback-close" type="button" aria-label="닫기" data-feedback-close>×</button>'
    + '<p class="ps-feedback-kicker">PARCYUN STUDIO</p>'
    + '<h2 id="ps-feedback-title">기능 개선 요청</h2>'
    + '<p class="ps-feedback-intro">아이디어를 남겨 주세요. 관리자 승인 후 게시판에 공개됩니다.</p>'
    + '<form class="ps-feedback-form">'
    + '<label><span class="sr-only">요청 내용</span><textarea name="body" minlength="3" maxlength="1000" required placeholder="당신의 아이디어가 대한민국 교실에서 실현됩니다!"></textarea></label>'
    + '<div class="ps-feedback-form-row"><p class="ps-feedback-status" aria-live="polite"></p><button type="submit">요청 등록</button></div>'
    + '</form>'
    + '<div class="ps-feedback-divider"></div>'
    + '<div class="ps-feedback-head"><h3>개선 아이디어 목록</h3><span class="ps-feedback-count"></span></div>'
    + '<div class="ps-feedback-list" aria-live="polite"></div>'
    + '</div>';
  document.body.appendChild(modal);

  var form = modal.querySelector('.ps-feedback-form');
  var textarea = form.querySelector('textarea');
  var status = modal.querySelector('.ps-feedback-status');
  var list = modal.querySelector('.ps-feedback-list');
  var count = modal.querySelector('.ps-feedback-count');

  function renderPosts(posts) {
    list.replaceChildren();
    count.textContent = posts.length ? posts.length + '개' : '';
    if (!posts.length) {
      var empty = document.createElement('p');
      empty.className = 'ps-feedback-empty';
      empty.textContent = serviceKey === 'all'
        ? '아직 공개된 개선 아이디어가 없어요. 첫 번째 아이디어를 남겨 주세요.'
        : (SERVICE_LABELS[serviceKey] || '이 서비스') + '에 공개된 개선 아이디어가 아직 없습니다. 첫 번째 아이디어를 남겨 주세요.';
      list.appendChild(empty);
      return;
    }
    posts.forEach(function (post) {
      var item = document.createElement('article');
      item.className = 'ps-feedback-post';
      var body = document.createElement('p');
      body.className = 'ps-feedback-post-body';
      body.textContent = post.body;
      if (serviceKey === 'all') {
        var serviceTag = document.createElement('span');
        serviceTag.className = 'ps-feedback-service-tag';
        serviceTag.textContent = SERVICE_LABELS[post.service_key] || '기타';
        item.appendChild(serviceTag);
      }
      if (post.implemented_at) {
        var implemented = document.createElement('span');
        implemented.className = 'ps-feedback-implemented';
        implemented.textContent = '업데이트에 반영됨';
        item.appendChild(implemented);
      }
      var meta = document.createElement('div');
      meta.className = 'ps-feedback-post-meta';
      var date = document.createElement('time');
      date.textContent = dateText(post.created_at);
      var like = document.createElement('button');
      like.type = 'button';
      like.className = 'ps-feedback-like';
      like.setAttribute('aria-label', '공감');
      like.textContent = '공감 ' + Number(post.like_count || 0).toLocaleString('ko-KR');
      like.addEventListener('click', function () {
        like.disabled = true;
        rpc('toggle_feedback_like', { p_post_id: post.id, p_voter_id: voterId() })
          .then(function (result) {
            like.classList.toggle('is-liked', !!result.liked);
            like.textContent = (result.liked ? '공감함 ' : '공감 ') + Number(result.like_count).toLocaleString('ko-KR');
          })
          .catch(function () { status.textContent = '공감 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'; })
          .finally(function () { like.disabled = false; });
      });
      meta.appendChild(date);
      meta.appendChild(like);
      item.appendChild(body);
      item.appendChild(meta);
      list.appendChild(item);
    });
  }

  function loadPosts() {
    list.textContent = '게시글을 불러오는 중…';
    return (serviceKey === 'all'
      ? rpc('list_all_feedback')
      : rpc('list_feedback', { p_service_key: serviceKey }))
      .then(renderPosts)
      .catch(function () { list.textContent = '게시글을 불러오지 못했습니다.'; });
  }

  function open(button) {
    opener = button || document.activeElement;
    modal.hidden = false;
    status.textContent = '';
    loadPosts();
    setTimeout(function () { textarea.focus(); }, 0);
  }

  function close() {
    modal.hidden = true;
    if (opener && typeof opener.focus === 'function') opener.focus();
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-feedback-open]');
    if (trigger) { event.preventDefault(); open(trigger); }
  });
  window.__psFeedbackOpenReady = true;
  if (window.__psPendingFeedbackOpen) {
    window.__psPendingFeedbackOpen = false;
    open(document.querySelector('[data-feedback-open]'));
  }
  modal.addEventListener('click', function (event) { if (event.target.hasAttribute('data-feedback-close')) close(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !modal.hidden) close(); });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var body = textarea.value.trim();
    if (body.length < 3) { status.textContent = '요청 내용은 3자 이상 작성해 주세요.'; return; }
    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    status.textContent = '등록 중…';
    var sourcePath = serviceContext
      ? serviceContext.sourcePathForFeedback(location.pathname, location.search)
      : (location.pathname || '/');
    rpc('submit_feedback', { p_body: body, p_source_path: sourcePath, p_author_id: voterId(), p_service_key: submissionServiceKey })
      .then(function () { textarea.value = ''; status.textContent = '등록되었습니다. 관리자 승인 후 공개됩니다.'; })
      .catch(function (error) { status.textContent = error.message || '등록에 실패했습니다.'; })
      .finally(function () { submit.disabled = false; });
  });

  var style = document.createElement('style');
  style.textContent = ''
    + '.ps-feedback-modal,.ps-feedback-modal *{box-sizing:border-box}'
    + '.ps-feedback-modal{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:24px;font-family:Pretendard Variable,Pretendard,Montserrat,sans-serif;color:#fff}'
    + '.ps-feedback-modal[hidden]{display:none}.ps-feedback-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}'
    + '.ps-feedback-card{position:relative;width:min(100%,560px);max-height:min(760px,88vh);overflow:auto;background:#141414;border:1px solid rgba(255,177,26,.5);border-radius:16px;padding:32px;box-shadow:0 28px 70px rgba(0,0,0,.62)}'
    + '.ps-feedback-close{position:absolute;top:12px;right:16px;border:0;background:transparent;color:#8C8C8C;font-size:26px;line-height:1;cursor:pointer}.ps-feedback-close:hover{color:#FFB11A}'
    + '.ps-feedback-kicker{margin:0 0 8px;font:600 10px Montserrat,sans-serif;letter-spacing:.18em;color:#FFB11A}.ps-feedback-card h2{margin:0;font-size:24px;letter-spacing:-.04em}.ps-feedback-intro{margin:8px 0 20px;color:#B8B8B8;font-size:13px;line-height:1.65}'
    + '.ps-feedback-form{width:100%}.ps-feedback-form label{display:block;width:100%;margin:0}.ps-feedback-form textarea{display:block;width:100%;margin:0;min-height:112px;resize:vertical;border:1px solid #333;border-radius:10px;background:#090909;color:#fff;padding:12px;font:14px/1.6 Pretendard Variable,Pretendard,sans-serif;outline:0}.ps-feedback-form textarea:focus{border-color:#FFB11A}'
    + '.ps-feedback-form-row{min-height:40px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}.ps-feedback-status{margin:0;color:#B8B8B8;font-size:12px;line-height:1.45}.ps-feedback-form button{flex:none;border:0;border-radius:999px;background:#FFB11A;color:#000;padding:9px 16px;font:600 13px Pretendard Variable,Pretendard,sans-serif;cursor:pointer}.ps-feedback-form button:hover{background:#E89500}.ps-feedback-form button:disabled,.ps-feedback-like:disabled{opacity:.55;cursor:wait}'
    + '.ps-feedback-divider{height:1px;background:#2A2A2A;margin:24px 0 16px}.ps-feedback-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.ps-feedback-head h3{margin:0;font-size:15px}.ps-feedback-count{font:11px Montserrat,sans-serif;color:#8C8C8C}.ps-feedback-list{display:flex;flex-direction:column;margin-top:8px}.ps-feedback-post{padding:16px 0;border-bottom:1px solid #2A2A2A}.ps-feedback-post:last-child{border:0}.ps-feedback-implemented{display:inline-flex;margin-bottom:8px;border:1px solid rgba(135,216,163,.45);border-radius:999px;padding:4px 8px;color:#87D8A3;font-size:11px}.ps-feedback-post-body{white-space:pre-wrap;margin:0;color:#EEE;font-size:14px;line-height:1.65}.ps-feedback-post-meta{display:flex;align-items:center;justify-content:space-between;margin-top:10px;color:#8C8C8C;font:11px Montserrat,sans-serif}.ps-feedback-like{border:1px solid #333;background:transparent;border-radius:999px;color:#B8B8B8;padding:5px 9px;font:11px Pretendard Variable,Pretendard,sans-serif;cursor:pointer}.ps-feedback-like:hover,.ps-feedback-like.is-liked{border-color:#FFB11A;color:#FFB11A}.ps-feedback-empty{margin:12px 0;color:#8C8C8C;font-size:13px;line-height:1.6}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}'
    + '.ps-feedback-service-tag{display:inline-flex;margin-bottom:8px;border:1px solid rgba(255,177,26,.35);border-radius:999px;padding:3px 8px;color:#FFB11A;font:600 10px Montserrat,Pretendard,sans-serif;letter-spacing:.04em}'
    + '@media(max-width:520px){.ps-feedback-modal{padding:12px}.ps-feedback-card{max-height:92vh;padding:24px 20px}.ps-feedback-form-row{align-items:flex-end}.ps-feedback-form button{padding:9px 13px}}';
  document.head.appendChild(style);
})();
