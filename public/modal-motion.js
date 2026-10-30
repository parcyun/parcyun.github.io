(function () {
  if (typeof window === 'undefined' || window.psModalMotion) return;
  const pending = new WeakMap();
  const style = document.createElement('style');
  style.textContent = '[data-ps-modal-closing]{pointer-events:none!important}dialog[data-ps-modal-closing]::backdrop{animation:ps-modal-backdrop-out .18s ease-in forwards}@keyframes ps-modal-backdrop-out{to{background-color:transparent;backdrop-filter:blur(0);-webkit-backdrop-filter:blur(0)}}';
  style.textContent += '.ps-sheet-handle{display:grid;place-items:center;align-self:center;flex:none;min-width:72px;min-height:24px!important;margin:-6px auto 4px;padding:6px 16px!important;border:0!important;border-radius:99px;background:transparent!important;color:#8c93a1;cursor:grab;touch-action:none}.ps-sheet-handle span{display:block;width:36px;height:4px;border-radius:99px;background:currentColor}[data-ps-sheet-dragging]{animation:none!important;transition:none!important;user-select:none}';
  document.head.append(style);
  function cancel(node) {
    const entry = pending.get(node);
    if (!entry) return;
    entry.cancelled = true;
    entry.animations.forEach(animation => animation.cancel());
    pending.delete(node);
    node.removeAttribute('data-ps-modal-closing');
  }
  function exit(node, complete) {
    if (!node || !node.isConnected || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !node.animate) {
      complete(); return Promise.resolve();
    }
    if (pending.has(node)) return pending.get(node).promise;
    const sheet = node.matches('.ranking-sheet,.gg-ranking-dialog');
    const card = node.querySelector('.coffee-card,.ps-feedback-card,.spell-onboarding-card,.update-story-card,.ts-popup-card');
    const moving = card || node;
    const current = getComputedStyle(moving);
    const animations = [moving.animate([
      { opacity: current.opacity, transform: current.transform },
      { opacity: 0, transform: sheet ? 'translateY(100%)' : 'translateY(12px) scale(.98)' }
    ], { duration: sheet ? 200 : 180, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })];
    if (card) animations.push(node.animate([{ opacity: getComputedStyle(node).opacity }, { opacity: 0 }], { duration: 180, fill: 'forwards' }));
    node.setAttribute('data-ps-modal-closing', '');
    const entry = { animations, cancelled: false };
    pending.set(node, entry);
    entry.promise = Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (entry.cancelled) return;
      try { complete(); } finally { cancel(node); }
    });
    return entry.promise;
  }
  function bindBackdrop(node, dismiss) {
    const click=event=>{
      if(event.target!==node)return;
      const rect=node.getBoundingClientRect();
      if(node.tagName!=='DIALOG'||event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dismiss();
    };
    node.addEventListener('click',click);
    return ()=>node.removeEventListener('click',click);
  }
  function bindSheet(node, dismiss, backdrop = true) {
    const handle=document.createElement('button');
    handle.type='button';handle.className='ps-sheet-handle';handle.setAttribute('aria-label','아래로 당겨 모달 닫기');
    handle.innerHTML='<span aria-hidden="true"></span>';node.prepend(handle);
    const unbindBackdrop=backdrop?bindBackdrop(node,dismiss):()=>{};
    const base=node.style.transform;
    let gesture=null,snap=null,dragClick=null,wheel=null;
    const editable=target=>!!target.closest('input,textarea,select,[contenteditable=true],a,button');
    const atTop=target=>{
      for(let el=target;el&&el!==node.parentElement;el=el.parentElement){
        if(el.scrollHeight>el.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)&&el.scrollTop>1)return false;
      }
      return true;
    };
    const restore=()=>{node.style.transform=base;node.removeAttribute('data-ps-sheet-dragging');};
    const rollback=()=>{
      if(!node.hasAttribute('data-ps-sheet-dragging'))return;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){restore();return;}
      const animation=node.animate([{transform:getComputedStyle(node).transform},{transform:base||'none'}],{duration:160,easing:'ease-out'});
      snap=animation;animation.finished.catch(()=>{}).finally(()=>{if(snap===animation){snap=null;restore();}});
    };
    const begin=(x,y,target,source)=>{
      if(node.hasAttribute('data-ps-modal-closing'))return;
      const onHandle=handle.contains(target);
      if(!onHandle&&editable(target))return;
      if(snap){snap.cancel();snap=null;restore();}
      gesture={x,y,lastX:x,lastY:y,eligible:onHandle||atTop(target),active:false,source};
    };
    const move=(x,y,event)=>{
      if(!gesture||!gesture.eligible)return;
      const dx=x-gesture.x,dy=y-gesture.y;
      gesture.lastX=x;gesture.lastY=y;
      if(!gesture.active){
        if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){gesture.eligible=false;return;}
        if(dy<=8||dy<Math.abs(dx)*1.2)return;
        gesture.active=true;
      }
      event.preventDefault();
      node.setAttribute('data-ps-sheet-dragging','');
      node.style.transform=`translateY(${Math.min(160,Math.max(0,dy)*.7)}px)`;
    };
    const end=cancelled=>{
      const current=gesture;gesture=null;
      if(!current?.active)return;
      if(!cancelled)dragClick={x:current.lastX,y:current.lastY,at:performance.now()};
      if(!cancelled&&current.lastY-current.y>=80)Promise.resolve(dismiss()).finally(restore);
      else rollback();
    };
    const touchStart=event=>{if(event.touches.length!==1){end(true);return;}const t=event.touches[0];begin(t.clientX,t.clientY,event.target,'touch');};
    const touchMove=event=>{if(event.touches.length!==1){end(true);return;}const t=event.touches[0];move(t.clientX,t.clientY,event);};
    const touchEnd=()=>end(false),touchCancel=()=>end(true);
    const pointerDown=event=>{if(event.pointerType==='touch'||event.button!==0||!handle.contains(event.target))return;begin(event.clientX,event.clientY,event.target,'pointer');handle.setPointerCapture(event.pointerId);};
    const pointerMove=event=>{if(gesture?.source==='pointer')move(event.clientX,event.clientY,event);};
    const pointerEnd=event=>{if(gesture?.source==='pointer'){end(event.type==='pointercancel');if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);}};
    const click=event=>{
      if(dragClick){const previous=dragClick;dragClick=null;if(event.detail&&performance.now()-previous.at<350&&Math.abs(event.clientX-previous.x)<8&&Math.abs(event.clientY-previous.y)<8){event.preventDefault();event.stopPropagation();}}
    };
    const handleClick=event=>{if(!event.defaultPrevented)dismiss();};
    const wheelMove=event=>{
      if(event.ctrlKey||(editable(event.target)&&!handle.contains(event.target))||node.hasAttribute('data-ps-modal-closing'))return;
      const now=performance.now();
      if(!wheel||now-wheel.at>200)wheel={at:now,eligible:atTop(event.target),distance:0};
      wheel.at=now;
      if(Math.abs(event.deltaX)>Math.abs(event.deltaY)){wheel.eligible=false;return;}
      if(!wheel.eligible||event.deltaY>=0)return;
      wheel.distance+=-event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?node.clientHeight:1);
      event.preventDefault();
      if(wheel.distance>=100){wheel.eligible=false;dismiss();}
    };
    node.addEventListener('touchstart',touchStart,{passive:true});node.addEventListener('touchmove',touchMove,{passive:false});
    node.addEventListener('touchend',touchEnd);node.addEventListener('touchcancel',touchCancel);
    node.addEventListener('pointerdown',pointerDown);node.addEventListener('pointermove',pointerMove);node.addEventListener('pointerup',pointerEnd);node.addEventListener('pointercancel',pointerEnd);
    node.addEventListener('wheel',wheelMove,{passive:false});node.addEventListener('click',click,true);handle.addEventListener('click',handleClick);
    return ()=>{
      if(snap)snap.cancel();restore();unbindBackdrop();handle.remove();
      node.removeEventListener('touchstart',touchStart);node.removeEventListener('touchmove',touchMove);node.removeEventListener('touchend',touchEnd);node.removeEventListener('touchcancel',touchCancel);
      node.removeEventListener('pointerdown',pointerDown);node.removeEventListener('pointermove',pointerMove);node.removeEventListener('pointerup',pointerEnd);node.removeEventListener('pointercancel',pointerEnd);
      node.removeEventListener('wheel',wheelMove);node.removeEventListener('click',click,true);
    };
  }
  function bindDialog(node) {
    const close = node.close.bind(node), show = node.showModal.bind(node);
    node.close = (...args) => node.open ? exit(node, () => close(...args)) : close(...args);
    node.showModal = (...args) => { cancel(node); return show(...args); };
    node.addEventListener('cancel', event => { event.preventDefault(); node.close(); });
    bindBackdrop(node,()=>node.close());
    return node;
  }
  window.psModalMotion = { exit, cancel, bindDialog, bindBackdrop, bindSheet };
})();
