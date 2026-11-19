/* The footer opens the same article that Dexterity publishes. */
(function(){
  const trigger=document.querySelector('[data-guidebook-href]');
  if(!trigger||window.__psGuidebook)return;
  window.__psGuidebook=true;
  const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/game-guidebooks.css?v=20261119-1';document.head.append(stylesheet);
  const dialog=document.createElement('dialog');dialog.className='ps-guidebook-sheet';dialog.setAttribute('aria-labelledby','ps-guidebook-title');
  dialog.innerHTML='<header class="ps-guidebook-toolbar"><strong id="ps-guidebook-title"></strong><a class="ps-guidebook-full" target="_blank" rel="noopener">글 전체 보기 ↗</a><button class="ps-guidebook-close" type="button" aria-label="가이드북 닫기">×</button></header><div class="ps-guidebook-body" tabindex="0"><p class="ps-guidebook-status" role="status">가이드북을 불러오고 있어요…</p></div>';
  document.body.append(dialog);
  const body=dialog.querySelector('.ps-guidebook-body'),closeButton=dialog.querySelector('button'),href=trigger.getAttribute('data-guidebook-href');
  dialog.querySelector('strong').textContent=trigger.getAttribute('data-guidebook-title');dialog.querySelector('.ps-guidebook-full').href=href;
  let loaded=false,loading=false,returnFocus,overflow,closeTimer;
  function finishClose(){clearTimeout(closeTimer);dialog.close();dialog.removeAttribute('data-closing');}
  function close(){if(!dialog.open||dialog.hasAttribute('data-closing'))return;if(matchMedia('(prefers-reduced-motion:reduce)').matches){finishClose();return;}dialog.setAttribute('data-closing','');closeTimer=setTimeout(finishClose,220);}
  trigger.addEventListener('click',async()=>{
    if(dialog.open)return;returnFocus=document.activeElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();trigger.setAttribute('aria-expanded','true');closeButton.focus();
    if(loaded||loading)return;loading=true;body.setAttribute('aria-busy','true');
    try{const response=await fetch(href);if(!response.ok)throw Error('Guide unavailable');const doc=new DOMParser().parseFromString(await response.text(),'text/html');const article=doc.querySelector('[data-guidebook-content]');if(!article)throw Error('Guide missing');body.replaceChildren(document.importNode(article,true));loaded=true;}
    catch(_){body.innerHTML='<p class="ps-guidebook-status" role="status">가이드북을 불러오지 못했어요.</p>';body.querySelector('p').textContent='가이드북을 불러오지 못했어요. 위의 글 전체 보기로 열거나, 닫은 뒤 다시 눌러 주세요.';}
    finally{loading=false;body.removeAttribute('aria-busy');}
  });
  closeButton.addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}},true);
  dialog.addEventListener('close',()=>{document.body.style.overflow=overflow;trigger.setAttribute('aria-expanded','false');if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
})();
