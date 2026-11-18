(function(root){
  function fly(word,target,onComplete,onFlying=()=>{}){
    let flight;const timer=setTimeout(()=>{
      if(!word.isConnected||!target.isConnected)return;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){onComplete();return;}
      const from=word.getBoundingClientRect(),to=target.getBoundingClientRect();
      const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
      onFlying();
      flight=word.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx}px,${dy}px) scale(${to.width/from.width},${to.height/from.height})`}],{duration:320,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
      flight.finished.then(onComplete).catch(()=>{});
    },700);
    return()=>{clearTimeout(timer);flight?.cancel();};
  }
  function celebrate(host,target,onComplete=()=>{}){
    root.psGameSfx?.celebrate();
    const overlay=document.createElement('div');overlay.className='gg-ranking-award';overlay.setAttribute('role','status');overlay.innerHTML='<div class="gg-ranking-award-flash"></div><div class="gg-ranking-award-title"><small>NEW PERSONAL BEST</small><strong><span class="gg-ranking-award-prefix">기록 </span><span class="gg-ranking-award-word">경신!</span></strong></div>';
    target.classList.remove('is-renewed');host.append(overlay);
    const cancel=fly(overlay.querySelector('.gg-ranking-award-word'),target,()=>{overlay.remove();target.classList.add('is-renewed');onComplete();},()=>overlay.classList.add('is-flying'));
    return()=>{cancel();overlay.remove();};
  }
  const SPELL_PENDING_KEY='spell-drill.pending-records.v1';
  const spellBoardKey=r=>`${r.lang}:${r.diff}:${r.mode}`;
  const valid=r=>r&&['ko','en'].includes(r.lang)&&['easy','med','hard','mix'].includes(r.diff)&&['practice','timer','custom'].includes(r.mode)&&Number.isFinite(r.score)&&r.score>0&&Number.isFinite(r.elapsedMs)&&r.elapsedMs>0&&Number.isFinite(r.playedAt)&&r.playedAt>0;
  const better=(a,b)=>!b||a.score>b.score||(a.score===b.score&&a.elapsedMs<b.elapsedMs);
  function readSpellPending(storage){try{const records=JSON.parse(storage.getItem(SPELL_PENDING_KEY)||'{}');return Object.fromEntries(Object.entries(records).filter(([key,r])=>valid(r)&&key===spellBoardKey(r)));}catch{return {};}}
  function saveSpellPending(storage,record){if(!valid(record))return;const records=readSpellPending(storage),key=spellBoardKey(record);if(better(record,records[key])){records[key]={...record};storage.setItem(SPELL_PENDING_KEY,JSON.stringify(records));}}
  function acknowledgeSpellPending(storage,record){const records=readSpellPending(storage),key=spellBoardKey(record);if(records[key]&&!better(records[key],record)){delete records[key];storage.setItem(SPELL_PENDING_KEY,JSON.stringify(records));}return records;}
  root.psRecordFeedback={fly,celebrate,spellBoardKey,readSpellPending,saveSpellPending,acknowledgeSpellPending};
})(window);
