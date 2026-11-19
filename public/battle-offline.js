import {applyRoundEvent,questionFor,tickRound} from './battle-round.js';

export function createOfflineBattle(game){
 let pack=null,room=null,events=[],raw=null,preparing=null,syncing=null,refreshing=null,offset=0,key='',offline=false;
 const now=()=>Date.now()+offset;
 const persist=()=>{if(!key)return;try{localStorage.setItem(key,JSON.stringify({pack,room,events,offset}));}catch{}};
 function clear(){if(key)localStorage.removeItem(key);pack=null;events=[];room=null;key='';offline=false;}
 function restore(r){
  const nextKey=`ps.battle-round.v1:${game}:${r.code}:${r.me}`;
  if(key===nextKey)return;
  pack=null;events=[];key=nextKey;
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.pack){pack=saved.pack;events=saved.events||[];}}catch{}
 }
 function localView(){
  const view=structuredClone(room);if(!pack||(!offline&&!events.length&&room.phase!=='playing'))return view;
  tickRound(pack,now());const s=pack.state,p=view.players.find(p=>p.id===view.me);
  const old=p?.score||0;if(p)Object.assign(p,s);
  view.stats={...s};view.round=pack.round;view.deadline=pack.deadline;
  view.phase=now()>=pack.deadline?(pack.round>=pack.settings.rounds?'finished':'between'):'playing';
  view.nextAt=pack.deadline+10000;
  if(view.phase==='finished'&&p)p.score=(p.totalScore||0)+s.score;
  if(view.mode==='team')view.teamTotals[view.myTeam]+=(p?.score??s.score)-old;
  else {const standing=view.standings.find(p=>p.id===view.me);if(standing)standing.score=p?.score??s.score;}
  view.question=view.phase==='playing'?questionFor(pack):null;
  view.nextQuestion=view.phase==='playing'&&pack.settings.level==='expert'?{...questionFor(pack,s.index+1),startedAt:s.questionStartedAt+5000,hintUsed:false,hint:''}:null;
  view.offline=offline;return view;
 }
 async function sync(){
  if(!events.length||!pack||!navigator.onLine)return;
  if(syncing)return syncing;
  const batch=events.slice(0,20),leaseId=pack.id,code=room.code;
  syncing=(async()=>{
   try{
    const response=await raw(`rooms/${code}/sync`,{leaseId,events:batch});
    if(pack?.id!==leaseId)return;
    pack.seq=response.ack;events=events.filter(event=>event.seq>response.ack);offline=false;room=response.room;
    if(!events.length&&room.round!==pack.round){pack=null;}
    persist();
   }catch(error){offline=true;if(error.status&&error.status<500){clear();throw error;}}
   finally{syncing=null;}
  })();
  return syncing;
 }
 function observe(r){
  if(!r?.code)return r;
  if(Number.isFinite(r.serverNow))offset=r.serverNow-Date.now();
  restore(r);
  if(r.dailyClosed||r.phase==='cancelled'){clear();return r;}
  if(r.me===r.host)return r;
  room=r;
  if(pack&&!events.length&&(pack.round!==r.round||pack.deadline!==r.deadline))pack=null;
  if(!pack&&r.phase==='playing'&&!r.waiting&&!preparing&&navigator.onLine){
   const code=r.code,id=r.me;
   preparing=raw(`rooms/${code}/offline`,{}).then(response=>{
    if(room?.code!==code||room?.me!==id)return;
    pack=response.pack;room=response.room;events=[];persist();
    for(const q of pack.questions)if(q.image){const image=new Image();image.src=q.image;}
   }).catch(()=>{}).finally(()=>{preparing=null;});
  }
  if(pack&&(events.length||offline))return localView();
  // Keep the local clock aligned with server timeouts without replacing unsent answers.
  if(pack&&r.round===pack.round&&r.question&&r.question.index>=pack.state.index){
   const p=r.players.find(p=>p.id===r.me);for(const name of ['index','score','roundScore','earnedScore','combo','maxCombo','passesRemaining','passCount','wrongCount','hintUsed','questionStartedAt','lastAnswer','focusPausedAt','focusWarned'])if(p?.[name]!==undefined)pack.state[name]=p[name];
  }
  persist();return pack&&r.round===pack.round&&r.phase==='playing'?localView():r;
 }
 return {clear,async request(path,body,transport){
  raw=transport;
  const match=path.match(/^rooms\/(\d{6})(?:\/(\w+))?$/),action=match?.[2];
  if(pack&&room?.code===match?.[1]&&['answer','hint','pass','focus'].includes(action)&&room.me!==room.host){
   const event={...body,type:action,at:Math.max(pack.lastAt||pack.issuedAt,now()),seq:(events.at(-1)?.seq??pack.seq)+1};
   let result;try{result=applyRoundEvent(pack,event);}catch(error){error.status=400;throw error;}events.push(event);pack.lastAt=event.at;persist();
   // Apply immediately. The server independently replays and validates every answer.
   sync().catch(()=>{});
   const view=localView();return action==='answer'||action==='pass'?{...result,room:view}:view;
  }
  if(match&&!action&&pack&&room?.code===match[1]){
   if(!navigator.onLine)offline=true;
   else if(!refreshing){refreshing=(async()=>{try{await sync();const latest=await transport(path,body);offline=false;observe(latest);}catch(error){offline=true;if(error.status&&error.status<500)pack=null;}finally{refreshing=null;}})();}
   return localView();
  }
  try{
   const result=await transport(path,body);offline=false;
   const r=result?.room||result;if(Number.isFinite(r?.serverNow))offset=r.serverNow-Date.now();
   if(action==='leave'||action==='end'){clear();return result;}
   if(result?.room)result.room=observe(result.room);else if(result?.code)return observe(result);
   return result;
  }catch(error){
   if((!error.status||error.status>=500)&&pack&&room?.code===match?.[1]&&!action){offline=true;return localView();}
   throw error;
  }
 }};
}
