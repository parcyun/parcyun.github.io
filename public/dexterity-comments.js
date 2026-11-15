(async function () {
  const host = document.getElementById('dexterity-comments');
  if (!host) return;
  const list = document.getElementById('comment-list');
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
