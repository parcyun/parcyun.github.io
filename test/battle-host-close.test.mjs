import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle as Spell} from '../server/spell-battle/engine.mjs';
import {Battle as Geo} from '../server/geoweb-battle/engine.mjs';
const identity=id=>({id,subject:id,name:id,kind:'browser'});
for(const [label,Engine] of [['spell',Spell],['geo',Geo]])test(`${label}: explicit host termination closes every phase and cannot be rejoined`,()=>{
 for(const phase of ['lobby','starting','playing','between','finished']){
  const game=new Engine({}),r=game.create(identity('host'));game.join(r.code,identity('player'));
  r.phase=phase;r.round=1;r.startsAt=r.deadline=r.nextAt=Date.now()+60000;r.players[1].score=123;
  if(phase==='finished'||phase==='between'){r.committedRound=1;r.players[1].totalScore=123;}
  assert.throws(()=>game.end(r.code,'player'),/진행자/);
  game.end(r.code,'host');assert.equal(r.phase,'cancelled');
  assert.equal(game.view(r,'player').phase,'cancelled');
  assert.throws(()=>game.join(r.code,identity('player')),/종료/);assert.throws(()=>game.join(r.code,identity('new')),/종료/);assert.throws(()=>game.rematch(r.code,'host'),/종료 후/);
  const snapshot=JSON.stringify(r);game.end(r.code,'host');assert.equal(JSON.stringify(r),snapshot);
 }
});
