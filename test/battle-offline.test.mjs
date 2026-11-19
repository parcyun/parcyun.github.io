import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle as Spell} from '../server/spell-battle/engine.mjs';
import {Battle as Geo} from '../server/geoweb-battle/engine.mjs';
import {issueRound,syncRound} from '../server/spell-battle/offline-round.mjs';
import {applyRoundEvent,tickRound} from '../public/battle-round.js';
const person=id=>({id,subject:id,name:id,kind:'browser'});
for(const game of ['spell','geo'])test(`${game}: offline round replay, duplicates, late sync, privacy and daily cutoff`,()=>{
 let time=Date.UTC(2026,10,19,6),now=()=>time;
 const engine=game==='spell'?new Spell({ko:{easy:[{wrong:'됬다',correct:'됐다'}]}},{now}):new Geo({country:[{id:'KR',answers:['한국'],prompt:'국가',mode:'country'}]},{now});
 const r=engine.create(person('host'));engine.join(r.code,person('player'));engine.join(r.code,person('other'));r.settings.seconds=15;r.settings.rounds=2;engine.nextRound(r);
 const {pack}=issueRound(engine,r,'player',game),local=structuredClone(pack);
 const event={seq:1,at:time+1000,type:'answer',index:0,answer:game==='spell'?'됐다':'한국'};
 const localResult=applyRoundEvent(local,event);assert.ok(localResult.points>0);
 time+=2000;syncRound(engine,r,'player',{leaseId:pack.id,events:[event]});
 assert.equal(r.players[1].score,local.state.score);const score=r.players[1].score;
 syncRound(engine,r,'player',{leaseId:pack.id,events:[event]});assert.equal(r.players[1].score,score);
 const second={...event,seq:2,index:1,at:time+1000};applyRoundEvent(local,second);
 time+=14000;engine.tick(r);assert.equal(r.phase,'between');
 syncRound(engine,r,'player',{leaseId:pack.id,events:[second]});assert.equal(r.players[1].totalScore,local.state.score);
 const total=r.players[1].totalScore;syncRound(engine,r,'player',{leaseId:pack.id,events:[second]});assert.equal(r.players[1].totalScore,total);
 assert.throws(()=>syncRound(engine,r,'other',{leaseId:pack.id,events:[]}),/경기/);
 assert.throws(()=>syncRound(engine,r,'player',{leaseId:pack.id,events:[{...second,seq:3,at:pack.deadline}]}),/시간/);
 assert.ok(engine.view(r,'host').players.every(p=>!p.offlineLease&&!p.deck));
 time+=11000;engine.tick(r);assert.equal(r.round,2);assert.equal(r.players[1].score,0);
 const third={...second,seq:3,index:2,at:pack.deadline-1};applyRoundEvent(local,third);
 syncRound(engine,r,'player',{leaseId:pack.id,events:[third]});assert.equal(r.players[1].score,0);assert.equal(r.players[1].totalScore,local.state.score);
 time=Date.UTC(2026,10,19,8);engine.tick(r);assert.equal(r.dailyClosed,true);assert.throws(()=>syncRound(engine,r,'player',{leaseId:pack.id,events:[]}),/경기/);
});
test('offline expert ticks multiple questions with 5 second boundaries',()=>{
 const pack={issuedAt:0,deadline:60000,settings:{level:'expert'},state:{index:0,questionStartedAt:0,combo:3,hintUsed:true}};
 tickRound(pack,4999);assert.equal(pack.state.index,0);tickRound(pack,5000);assert.equal(pack.state.index,1);tickRound(pack,15000);assert.equal(pack.state.index,3);assert.equal(pack.state.questionStartedAt,15000);assert.equal(pack.state.combo,0);
});

test('offline passes remain usable and focus can resume after the round deadline',()=>{
 const pack={game:'spell',issuedAt:0,deadline:1000,settings:{},questions:[{wrong:'됬다',correct:'됐다',difficulty:'easy'}],state:{index:0,score:100,roundScore:100,earnedScore:100,combo:0,maxCombo:0,passesRemaining:3,passCount:0,wrongCount:0,questionStartedAt:0}};
 applyRoundEvent(pack,{type:'pass',index:0,at:100});applyRoundEvent(pack,{type:'pass',index:1,at:200});assert.equal(pack.state.passesRemaining,1);
 applyRoundEvent(pack,{type:'focus',paused:true,at:900});applyRoundEvent(pack,{type:'focus',paused:false,at:1100});assert.equal(pack.state.focusPausedAt,null);
});
