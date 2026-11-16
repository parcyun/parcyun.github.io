(function () {
  const like = document.getElementById('article-like');
  const share = document.getElementById('article-share');
  const status = document.getElementById('article-action-status');
  if (!like || !share || !status) return;
  const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const key = 'dexterity:liked:' + new URL(url).pathname;
  let liked = false;
  try { liked = localStorage.getItem(key) === '1'; } catch {}
  function render() {
    like.setAttribute('aria-pressed', String(liked));
    like.querySelector('span').textContent = liked ? '좋아요 취소' : '좋아요';
  }
  render();
  like.addEventListener('click', () => {
    liked = !liked;
    render();
    try {
      if (liked) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
      status.textContent = liked ? '좋아요를 표시했어요.' : '좋아요를 취소했어요.';
    } catch { status.textContent = liked ? '좋아요를 표시했어요. 이 브라우저에서는 저장할 수 없어요.' : '좋아요를 취소했어요.'; }
  });
  share.addEventListener('click', async () => {
    status.replaceChildren();
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({title: document.querySelector('meta[property="og:title"]')?.content || document.title, url});
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = '링크를 복사했어요.';
    } catch {
      const field = document.createElement('input');
      field.type = 'url';
      field.readOnly = true;
      field.value = url;
      field.setAttribute('aria-label', '공유할 글 주소');
      status.append('주소를 복사해 공유해 주세요.', field);
      field.focus();
      field.select();
    }
  });
})();

