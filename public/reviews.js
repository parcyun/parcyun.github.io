/* Anonymous review composer and published review list. Button label: 리뷰 남기기. */
(function () {
  var app = document.querySelector('[data-reviews-app]');
  if (!app || window.__psReviews) return;
  window.__psReviews = true;
  var url = 'https://myeouecgpjxcddemexcg.supabase.co';
  var key = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';
  var VOTER_KEY = 'ps_review_voter';
  var serviceContext = window.PSServiceContext;
  var serviceKey = serviceContext
    ? serviceContext.resolveViewServiceKey(location.pathname, location.search)
    : 'other';
  var submissionServiceKey = serviceContext
    ? serviceContext.resolveSubmissionServiceKey(location.pathname, location.search)
    : 'other';
  var SERVICE_LABELS = {
    home: 'parcyun studio',
    'spell-drill': 'Spell Drill',
    'atlas-gears': 'ATLAS GEARS',
    geoweb: 'GeoWeb',
    other: '기타'
  };
  var selected = 0;
  var stars = app.querySelector('[data-review-stars]');
  var body = app.querySelector('[data-review-body]');
  var count = app.querySelector('[data-review-count]');
  var submit = app.querySelector('[data-review-submit]');
  var message = app.querySelector('[data-review-message]');
  var list = document.querySelector('[data-review-list]');
  var listWrap = document.querySelector('.review-list-wrap');

  function voterId() {
    var saved = localStorage.getItem(VOTER_KEY);
    if (saved) return saved;
    var id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'review-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
    localStorage.setItem(VOTER_KEY, id);
    return id;
  }

  function rpc(name, args) {
    return fetch(url + '/rest/v1/rpc/' + name, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
      .then(function (res) { return res.text().then(function (text) { if (!res.ok) throw new Error((JSON.parse(text || '{}').message) || '요청에 실패했습니다.'); return text ? JSON.parse(text) : null; }); });
  }
  function drawStars() {
    stars.replaceChildren();
    for (var i = 1; i <= 5; i += 1) {
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'review-star' + (i <= selected ? ' active' : '');
      button.textContent = '★'; button.setAttribute('aria-label', i + '점'); button.setAttribute('aria-pressed', i === selected ? 'true' : 'false');
      button.addEventListener('click', function () { selected = Number(this.getAttribute('aria-label').slice(0, 1)); drawStars(); });
      stars.appendChild(button);
    }
  }
  function updateListViewport() {
    var cards = list.querySelectorAll('.review-card');
    var heights = Array.prototype.map.call(cards, function (card) {
      return card.getBoundingClientRect().height;
    });
    var maxHeight = window.PSReviewViewport.maxHeight(heights);
    if (maxHeight !== null) list.style.setProperty('--review-list-max-height', maxHeight + 'px');
    else list.style.removeProperty('--review-list-max-height');
    var state = window.PSReviewViewport.fadeState(cards.length, list.scrollTop, list.clientHeight, list.scrollHeight);
    listWrap.classList.toggle('has-overflow', state.hasOverflow);
    listWrap.classList.toggle('is-at-end', state.isAtEnd);
  }
  function scheduleListViewport() {
    window.requestAnimationFrame(updateListViewport);
  }
  function render(reviews) {
    reviews = (reviews || []).slice().sort(function (a, b) {
      var likes = Number(b.like_count || 0) - Number(a.like_count || 0);
      return likes || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    list.replaceChildren();
    if (!reviews.length) { var empty = document.createElement('p'); empty.className = 'review-empty'; empty.textContent = '아직 공개된 리뷰가 없습니다.'; list.appendChild(empty); scheduleListViewport(); return; }
    reviews.forEach(function (review) {
      var card = document.createElement('article'); card.className = 'review-card';
      var head = document.createElement('div'); head.className = 'review-card-head';
      if (serviceKey === 'all') {
        var serviceTag = document.createElement('span');
        serviceTag.className = 'review-service-tag';
        serviceTag.textContent = SERVICE_LABELS[review.service_key] || '기타';
        card.appendChild(serviceTag);
      }
      var rating = document.createElement('span'); rating.className = 'review-card-stars'; rating.textContent = '★'.repeat(Number(review.rating)); rating.setAttribute('aria-label', review.rating + '점');
      var date = document.createElement('time'); date.textContent = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(review.created_at));
      var text = document.createElement('p'); text.textContent = review.body;
      var like = document.createElement('button'); like.type = 'button'; like.className = 'review-like'; like.setAttribute('aria-pressed', review.liked ? 'true' : 'false');
      like.textContent = (review.liked ? '공감함 ' : '공감 ') + Number(review.like_count || 0).toLocaleString('ko-KR');
      like.addEventListener('click', function () {
        like.disabled = true;
        rpc('toggle_review_like', { p_review_id: review.id, p_voter_id: voterId() }).then(function (result) {
          review.liked = !!result.liked;
          review.like_count = Number(result.like_count || 0);
          render(reviews);
        }).catch(function () { message.textContent = '공감 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.'; }).finally(function () { like.disabled = false; });
      });
      head.appendChild(rating); head.appendChild(date); card.appendChild(head); card.appendChild(text); card.appendChild(like); list.appendChild(card);
    });
    scheduleListViewport();
  }
  body.addEventListener('input', function () { count.textContent = body.value.length + ' / 500'; });
  submit.addEventListener('click', function () {
    var text = body.value.trim();
    if (!selected) { message.textContent = '별점을 먼저 선택해 주세요.'; return; }
    if (!text || text.length > 500) { message.textContent = '리뷰는 1자 이상 500자 이하로 작성해 주세요.'; return; }
    submit.disabled = true; message.textContent = '등록 중…';
    rpc('submit_review', { p_rating: selected, p_body: text, p_service_key: submissionServiceKey, p_voter_id: voterId() }).then(function (result) {
      if (!result || !result.ok) throw new Error((result && result.error) || '등록할 수 없습니다.');
      body.value = ''; count.textContent = '0 / 500'; selected = 0; drawStars(); message.textContent = '리뷰가 등록되었습니다. 검토 후 공개됩니다.';
    }).catch(function (error) { message.textContent = error.message; }).finally(function () { submit.disabled = false; });
  });
  drawStars();
  list.addEventListener('scroll', updateListViewport);
  window.addEventListener('resize', scheduleListViewport);
  (serviceKey === 'all'
    ? rpc('list_all_reviews', { p_voter_id: voterId() })
    : rpc('list_reviews', { p_service_key: serviceKey, p_voter_id: voterId() }))
    .then(render)
    .catch(function () { list.textContent = '리뷰를 불러오지 못했습니다.'; });
})();
