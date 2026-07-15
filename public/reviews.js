/* Anonymous review composer and published review list. Button label: 리뷰 남기기. */
(function () {
  var app = document.querySelector('[data-reviews-app]');
  if (!app || window.__psReviews) return;
  window.__psReviews = true;
  var url = 'https://myeouecgpjxcddemexcg.supabase.co';
  var key = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';
  var selected = 0;
  var stars = app.querySelector('[data-review-stars]');
  var body = app.querySelector('[data-review-body]');
  var count = app.querySelector('[data-review-count]');
  var submit = app.querySelector('[data-review-submit]');
  var message = app.querySelector('[data-review-message]');
  var list = document.querySelector('[data-review-list]');

  function rpc(name, args) {
    return fetch(url + '/rest/v1/rpc/' + name, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
      .then(function (res) { return res.text().then(function (text) { if (!res.ok) throw new Error((JSON.parse(text || '{}').message) || '요청에 실패했습니다.'); return text ? JSON.parse(text) : null; }); });
  }
  function drawStars() {
    stars.replaceChildren();
    for (var i = 1; i <= 5; i += 1) {
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'review-star' + (i <= selected ? ' active' : '');
      button.textContent = '★'; button.setAttribute('aria-label', i + '점');
      button.addEventListener('click', function () { selected = Number(this.getAttribute('aria-label').slice(0, 1)); drawStars(); });
      stars.appendChild(button);
    }
  }
  function render(reviews) {
    list.replaceChildren();
    if (!reviews || !reviews.length) { var empty = document.createElement('p'); empty.className = 'review-empty'; empty.textContent = '아직 공개된 리뷰가 없습니다.'; list.appendChild(empty); return; }
    reviews.forEach(function (review) {
      var card = document.createElement('article'); card.className = 'review-card';
      var head = document.createElement('div'); head.className = 'review-card-head';
      var rating = document.createElement('span'); rating.className = 'review-card-stars'; rating.textContent = '★'.repeat(Number(review.rating)); rating.setAttribute('aria-label', review.rating + '점');
      var date = document.createElement('time'); date.textContent = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(review.created_at));
      var text = document.createElement('p'); text.textContent = review.body;
      head.appendChild(rating); head.appendChild(date); card.appendChild(head); card.appendChild(text); list.appendChild(card);
    });
  }
  body.addEventListener('input', function () { count.textContent = body.value.length + ' / 500'; });
  submit.addEventListener('click', function () {
    var text = body.value.trim();
    if (!selected) { message.textContent = '별점을 먼저 선택해 주세요.'; return; }
    if (!text || text.length > 500) { message.textContent = '리뷰는 1자 이상 500자 이하로 작성해 주세요.'; return; }
    submit.disabled = true; message.textContent = '등록 중…';
    rpc('submit_review', { p_rating: selected, p_body: text }).then(function (result) {
      if (!result || !result.ok) throw new Error((result && result.error) || '등록할 수 없습니다.');
      body.value = ''; count.textContent = '0 / 500'; selected = 0; drawStars(); message.textContent = '리뷰가 등록되었습니다. 검토 후 공개됩니다.';
    }).catch(function (error) { message.textContent = error.message; }).finally(function () { submit.disabled = false; });
  });
  drawStars();
  rpc('list_reviews').then(render).catch(function () { list.textContent = '리뷰를 불러오지 못했습니다.'; });
})();
