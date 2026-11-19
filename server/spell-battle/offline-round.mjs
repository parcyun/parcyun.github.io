import {randomUUID} from 'node:crypto';
import {applyRoundEvent,roundFields,tickRound} from '../../public/battle-round.js';
const clone=value=>structuredClone(value);
function questions(battle,room,lease){
 const shell={...room,settings:lease.settings,deck:lease.deck};
 return lease.deck.map((_,index)=>battle.question(shell,{deck:lease.deck,index}));
}
export function issueRound(battle,room,id,game){
 const p=battle.member(room,id);
 if(p.isHost||p.left||room.phase!=='playing'||(p.eligibleRound||1)>room.round)throw Error('문제를 풀 때만 준비할 수 있어요.');
 battle.view(room,id);
 if(!p.offlineLease||p.offlineLease.round!==room.round||p.offlineLease.deadline!==room.deadline){
  p.offlineLease={id:randomUUID(),game,round:room.round,deadline:room.deadline,issuedAt:battle.now(),settings:clone(room.settings),deck:[...(p.deck||room.deck)],state:Object.fromEntries(roundFields.map(key=>[key,p[key]??(key==='questionStartedAt'||key==='focusPausedAt'||key==='lastAnswer'?null:0)])),seq:0,lastAt:battle.now(),syncedScore:p.score};
 }
 const lease=clone(p.offlineLease);
 return {pack:{...lease,questions:questions(battle,room,lease)}};
}
export function syncRound(battle,room,id,input){
 const p=battle.member(room,id),lease=p.offlineLease,now=battle.now();
 if(!lease||lease.id!==input.leaseId||p.left||room.dailyClosed||room.phase==='cancelled')throw Error('종료되었거나 새로 시작한 경기예요.');
 if(!Array.isArray(input.events)||input.events.length>150)throw Error('동기화할 답안을 확인해 주세요.');
 const pack={...clone(lease),questions:questions(battle,room,lease)};
 for(const event of input.events){
  if(event.seq<=pack.seq)continue;
  if(event.seq!==pack.seq+1||!Number.isFinite(event.at)||event.at<pack.lastAt||event.at>now+1000||(event.type!=='focus'&&event.at>=Math.min(pack.deadline,room.endedEarly?room.deadline:Infinity)))throw Error('답안 순서와 제출 시간을 확인해 주세요.');
  applyRoundEvent(pack,event);pack.seq=event.seq;pack.lastAt=event.at;
 }
 const delta=pack.state.score-lease.syncedScore;
 if(room.round===lease.round){
  for(const key of roundFields)p[key]=pack.state[key];
  if(room.committedRound>=lease.round)p.totalScore=(p.totalScore||0)+delta;
 }else p.totalScore=(p.totalScore||0)+delta;
 if(input.events.some(event=>event.type==='focus')){p.focusPausedAt=pack.state.focusPausedAt;p.focusWarned=pack.state.focusWarned;}
 p.maxCombo=Math.max(p.maxCombo||0,pack.state.maxCombo||0);
 pack.syncedScore=pack.state.score;delete pack.questions;p.offlineLease=pack;
 return {ack:pack.seq};
}
