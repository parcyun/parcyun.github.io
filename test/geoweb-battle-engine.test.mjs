import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle} from '../server/geoweb-battle/engine.mjs';
import {readFileSync} from 'node:fs';

const corpus={country:[{id:'KR',mode:'country',prompt:'나라 이름',name:'대한민국',answers:['대한민국','한국'],coordinates:[127,37],image:''}]};
const identity=id=>({id,subject:`browser:${id}`,name:id,kind:'browser'});

test('room creation, join, readiness, answer, results and rematch',()=>{
 let now=1000;const battle=new Battle(corpus,{now:()=>now});const room=battle.create(identity('host'),2,'individual');
 battle.join(room.code,identity('one'));battle.join(room.code,identity('two'));
 assert.throws(()=>battle.start(room.code,'host'));
 battle.ready(room.code,'one',true);battle.ready(room.code,'two',true);battle.configure(room.code,'host',{difficulty:'country',seconds:15,rounds:1});
 battle.ready(room.code,'one',true);battle.ready(room.code,'two',true);battle.start(room.code,'host');
 now+=3001;const view=battle.view(room,'one');assert.equal(view.phase,'playing');assert.equal(JSON.stringify(view).includes('answers'),false);assert.equal(JSON.stringify(view).includes('대한민국'),false);
 assert.equal(battle.answer(room.code,'one','틀린답',0).correct,false);
 assert.equal(battle.answer(room.code,'one',' 한국 ',0).correct,true);
 now+=16000;assert.equal(battle.view(room,'host').phase,'finished');assert.ok(battle.view(room,'one').standings.find(p=>p.id==='one').score>0);
 battle.rematch(room.code,'host');assert.equal(battle.view(room,'host').phase,'lobby');
});

test('host cancellation and participant leave remain distinct',()=>{
 const battle=new Battle(corpus);const room=battle.create(identity('host'),2,'team');battle.join(room.code,identity('one'));
 assert.equal(battle.leave(room.code,'one').left,true);
 assert.equal(battle.end(room.code,'host').phase,'cancelled');
});

test('offline presence clears readiness and reconnect returns to the same room',()=>{
 const battle=new Battle(corpus);const room=battle.create(identity('host'),2,'team');
 battle.join(room.code,identity('one'));battle.ready(room.code,'one',true);
 battle.presence(room.code,'one',false);
 assert.equal(battle.view(room,'host').players.find(p=>p.id==='one').ready,false);
 battle.join(room.code,identity('one'));
 const restored=battle.view(room,'one');
 assert.equal(restored.code,room.code);
 assert.equal(restored.players.find(p=>p.id==='one').connected,true);
});

test('all live GeoWeb categories have playable questions without answer leakage',()=>{
 const categories=JSON.parse(readFileSync(new URL('../server/geoweb-battle/corpus.json',import.meta.url)));
 assert.deepEqual(Object.keys(categories).sort(),['country','capital-easy','capital-hard','flag','nature','landmark'].sort());
 for(const [mode,items] of Object.entries(categories)){
  assert.ok(items.length>100,`${mode} has questions`);
  assert.ok(items.every(item=>item.answers?.length&&item.prompt&&item.id),`${mode} has valid answers`);
  const battle=new Battle(categories);const room=battle.create(identity(`host-${mode}`));
  battle.join(room.code,identity(`one-${mode}`));battle.join(room.code,identity(`two-${mode}`));
  battle.configure(room.code,room.host,{difficulty:mode,seconds:15,rounds:1});
  battle.ready(room.code,`one-${mode}`,true);battle.ready(room.code,`two-${mode}`,true);
  battle.start(room.code,room.host);
  room.startsAt=Date.now()-1;
  const view=battle.view(room,`one-${mode}`);
  assert.equal(view.question.mode,mode);
  assert.equal(Object.hasOwn(view.question,'answers'),false);
  assert.equal(Object.hasOwn(view.question,'name'),false);
 }
});

test('game-specific difficulty changes reset readiness and reject unsupported levels', ()=>{
 const source=JSON.parse(readFileSync(new URL('../server/geoweb-battle/corpus.json',import.meta.url)));
 let now=1000;
 const battle=new Battle(source,{now:()=>now}),room=battle.create(identity('host'),2,'individual');
 for(const id of ['one','two']){battle.join(room.code,identity(id));battle.ready(room.code,id,true);}
 assert.throws(()=>battle.configure(room.code,'host',{difficulty:'nature',level:'expert',seconds:60,rounds:1}));
 battle.configure(room.code,'host',{difficulty:'nature',level:'hard',seconds:60,rounds:1});
 assert.equal(battle.member(room,'one').ready,false);
 for(const id of ['one','two'])battle.ready(room.code,id,true);
 battle.start(room.code,'host');now+=3001;
 battle.view(room,'one');
 const q=battle.question(room,battle.member(room,'one'));
 assert.equal(q.difficulty,'hard');
 assert.equal(battle.answer(room.code,'one',q.answers[0],0).details.baseScore,globalThis.SpellScoring.baseScoreForDifficulty('hard'));
});

test('expert expires a question after five seconds without granting points', ()=>{
 let now=1000;
 const battle=new Battle(corpus,{now:()=>now}),room=battle.create(identity('host'),2,'individual');
 battle.configure(room.code,'host',{difficulty:'country',level:'expert',seconds:60,rounds:1});
 for(const id of ['one','two']){battle.join(room.code,identity(id));battle.ready(room.code,id,true);}
 battle.start(room.code,'host');now+=3000;
 const initial=battle.view(room,'one');
 assert.equal(initial.question.index,0);
 assert.equal(initial.nextQuestion.index,1);
 assert.equal(initial.nextQuestion.startedAt,initial.question.startedAt+5000);
 assert.equal('answers' in initial.nextQuestion,false);
 now+=5000;
 const state=battle.view(room,'one');
 assert.equal(state.question.index,1);
 assert.equal(state.question.startedAt,initial.nextQuestion.startedAt);
 assert.equal(state.standings.find(player=>player.id==='one').score,0);
});
