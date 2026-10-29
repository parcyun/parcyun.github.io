/* One scroll owner; each input gesture advances at most one scene. */
(()=>{
 const root=document.querySelector('#home-scenes');if(!root)return;
 const sections=[...root.children].filter(n=>n.tagName==='SECTION');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let index=0,locked=false,ends=0,lastAt=0,lastSize=0,lastDir=0,timer;
 const release=()=>{clearTimeout(timer);timer=setTimeout(()=>locked=false,Math.max(150,ends-performance.now()))};
 function move(dir){const next=Math.max(0,Math.min(sections.length-1,index+dir));if(next===index)return;index=next;locked=true;ends=performance.now()+(reduced.matches?0:650);release();root.scrollTo({top:sections[index].offsetTop,behavior:reduced.matches?'instant':'smooth'});sections.forEach((s,i)=>s.inert=i!==index)}
 function canScroll(dir){const s=sections[index];return dir>0?s.scrollTop+s.clientHeight<s.scrollHeight-2:s.scrollTop>2}
 root.addEventListener('wheel',e=>{
  if(e.ctrlKey||!e.deltaY||document.querySelector('dialog[open]'))return;
  const now=performance.now(),size=Math.abs(e.deltaY),dir=Math.sign(e.deltaY),gap=now-lastAt;
  const fresh=now>=ends&&(gap>100||dir!==lastDir||size>=Math.max(16,lastSize*2.2));
  lastAt=now;lastSize=size;lastDir=dir;
  if(locked&&!fresh){e.preventDefault();release();return}
  // Keep a gesture that reaches an inner boundary from spilling into a scene change.
  if(canScroll(dir)){locked=false;return}
  e.preventDefault();if(!fresh&&gap<150){release();return}move(dir);
 },{passive:false});
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.target.closest('input,textarea,select,[contenteditable],dialog'))return;const dir=['ArrowDown','PageDown'].includes(e.key)?1:['ArrowUp','PageUp'].includes(e.key)?-1:0;if(!dir||locked)return;if(canScroll(dir))return;e.preventDefault();move(dir)});
 let touchY=0,touchDown=false,touchUp=false;
 root.addEventListener('touchstart',e=>{touchY=e.touches[0].clientY;touchDown=canScroll(1);touchUp=canScroll(-1)},{passive:true});
 root.addEventListener('touchend',e=>{const delta=touchY-e.changedTouches[0].clientY;if(Math.abs(delta)<65||locked||(delta>0?touchDown:touchUp)||document.querySelector('dialog[open]'))return;move(Math.sign(delta))},{passive:true});
 const nav=document.querySelectorAll('.float-nav button');nav.forEach((button,i)=>{button.removeAttribute('onclick');button.setAttribute('aria-label',i?'다음 섹션':'이전 섹션');button.addEventListener('click',()=>{if(!locked)move(i?1:-1)})});
 new ResizeObserver(()=>root.scrollTo({top:sections[index].offsetTop,behavior:'instant'})).observe(root);
 sections.forEach((s,i)=>s.inert=i!==0);
})();
