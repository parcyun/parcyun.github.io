(() => {
 const intro=document.getElementById('ps-game-intro');if(!intro)return;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const started=performance.now();
 const blocked=[...document.body.children].filter(el=>el!==intro&&!el.inert&&!['SCRIPT','STYLE','LINK'].includes(el.tagName));
 blocked.forEach(el=>{el.inert=true});
 function finish(){
  if(intro.hidden)return;
  intro.hidden=true;blocked.forEach(el=>{el.inert=false});
  document.removeEventListener('keydown',key,true);
  document.documentElement.dataset.gameIntro='complete';
  const guide=document.querySelector('#spell-onboarding:not([hidden]),.update-story');
  guide?.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  document.dispatchEvent(new CustomEvent('ps-game-intro-complete'));
 }
 function key(event){if(event.key==='Escape'){event.preventDefault();finish()}else if(['Tab','Enter',' '].includes(event.key))event.preventDefault()}
 document.addEventListener('keydown',key,true);
 // CSS starts at first paint, not after DOMContentLoaded or a network request.
 const animation=intro.getAnimations().find(a=>a.animationName==='psIntroVeil');
 if(animation)animation.finished.then(finish).catch(finish);
 const elapsed=animation?.currentTime??performance.now()-started;
 setTimeout(finish,Math.max(0,(reduced?100:2000)-Number(elapsed)));
})();
