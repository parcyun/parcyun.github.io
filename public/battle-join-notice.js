export function createJoinNotice(container) {
  let code, seen;
  const timers=new Set();
  const layer=document.createElement('div');
  layer.setAttribute('aria-live','polite');
  layer.style.cssText='position:fixed;left:16px;top:88px;z-index:10030;display:grid;gap:8px;pointer-events:none;max-width:calc(100vw - 32px)';
  container.append(layer);
  return {
    update(room){
      const members=room?.participants||[];
      if(!room){code=null;seen=null;layer.replaceChildren();return;}
      const next=new Set(members.map(p=>p.id));
      if(seen&&code===room.code&&['playing','between','starting'].includes(room.phase)){
        for(const member of members){
          if(seen.has(member.id)||member.id===room.me)continue;
          const item=document.createElement('div');
          item.textContent=member.name+'님이 참여하였습니다';
          item.style.cssText='padding:12px 18px;border-radius:18px;border:1px solid #71d99b;background:#174b35ee;color:#dcffe9;font:700 14px/1.5 Pretendard,sans-serif;box-shadow:0 8px 24px #0004;overflow-wrap:anywhere';
          layer.append(item);
          if(!matchMedia('(prefers-reduced-motion: reduce)').matches)item.animate([{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],{duration:240});
          const timer=setTimeout(async()=>{timers.delete(timer);if(item.isConnected&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await item.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-6px)'}],{duration:240,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});item.remove();},4500);timers.add(timer);
        }
      }
      code=room.code;seen=next;
    },
    dispose(){timers.forEach(clearTimeout);layer.remove();}
  };
}
