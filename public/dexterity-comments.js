(async function () {
  const host = document.getElementById('dexterity-comments');
  if (!host) return;
  const list = document.getElementById('comment-list');
  const draft = document.getElementById('comment-draft');
  const dialog = document.getElementById('github-comment-dialog');
  let prompted = false;
  function promptLogin() {
    prompted = true;
    if (!dialog.open) dialog.showModal();
  }
  draft?.addEventListener('focus', () => { if (!prompted) promptLogin(); });
  document.getElementById('comment-continue')?.addEventListener('click', promptLogin);
  document.getElementById('comment-copy')?.addEventListener('click', async () => {
    const status = document.getElementById('comment-copy-status');
    if (!draft.value.trim()) { status.textContent = '모달을 닫고 댓글을 먼저 입력해 주세요.'; return; }
    try {
      await navigator.clipboard.writeText(draft.value);
      status.textContent = '복사했어요. GitHub 댓글 창에 붙여 넣어 주세요.';
    } catch { status.textContent = '자동 복사가 허용되지 않았어요. 모달을 닫고 입력 내용을 직접 복사해 주세요.'; }
  });
  dialog?.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
  try {
    const response = await fetch('https://api.github.com/repos/parcyun/parcyun.github.io/issues/' + host.dataset.issue + '/comments?per_page=100', {headers: {Accept: 'application/vnd.github+json'}});
    if (!response.ok) throw new Error('Comments unavailable');
    const comments = await response.json();
    list.replaceChildren();
    if (!comments.length) list.textContent = '아직 댓글이 없습니다.';
    for (const comment of comments) {
      const item = document.createElement('article');
      const author = document.createElement('strong');
      author.textContent = comment.user?.login || 'GitHub 사용자';
      const body = document.createElement('p');
      body.textContent = comment.body;
      body.style.whiteSpace = 'pre-wrap';
      item.append(author, body);
      list.append(item);
    }
    if (response.headers.get('link')?.includes('rel="next"')) {
      const more = document.createElement('a');
      more.href = 'https://github.com/parcyun/parcyun.github.io/issues/' + host.dataset.issue;
      more.textContent = 'GitHub에서 댓글 전체 보기';
      list.append(more);
    }
  } catch {
    list.textContent = '댓글을 불러오지 못했습니다. 위 GitHub 링크에서 확인할 수 있습니다.';
  }
})();
