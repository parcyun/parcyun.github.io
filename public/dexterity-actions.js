(function(){
function init(){

const removers=[];
function listen(target,type,fn,options){target.addEventListener(type,fn,options);removers.push(()=>target.removeEventListener(type,fn,options));}
(function () {
  const viewer = document.createElement('dialog');
  viewer.className = 'photo-viewer';
  viewer.setAttribute('aria-label', '사진 크게 보기');
  const closePhoto = document.createElement('button');
  closePhoto.type = 'button';
  closePhoto.setAttribute('aria-label', '사진 닫기');
  const fullPhoto = document.createElement('img');
  closePhoto.append(fullPhoto);
  viewer.append(closePhoto);
  document.body.append(viewer);
  let photoTrigger;
  let previousOverflow;
  function dismissPhoto() {
    viewer.close();
    document.documentElement.style.overflow = previousOverflow;
    fullPhoto.removeAttribute('src');
    photoTrigger?.focus({preventScroll: true});
  }
  viewer.addEventListener('click', dismissPhoto);
  viewer.addEventListener('cancel', event => { event.preventDefault(); dismissPhoto(); });
  document.querySelectorAll('article figure > a').forEach(link => {
    const image = link.querySelector('img');
    if (!image) return;
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      photoTrigger = link;
      fullPhoto.src = link.href;
      fullPhoto.alt = image.alt;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      viewer.showModal();
    });
  });
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
  }
  render();
  like.addEventListener('click', () => {
    liked = !liked;
    render();
    try {
      if (liked) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
      status.replaceChildren();
    } catch { status.textContent = '이 브라우저에서는 선택을 저장할 수 없어요.'; }
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


return ()=>removers.forEach(remove=>remove());
}
if(window.psPageLifecycle)window.psPageLifecycle.register("dexterity-actions.js",init);else if(!window.__native_dexterity_actions_js){window.__native_dexterity_actions_js=true;init();}
})();

