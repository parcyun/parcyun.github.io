import test from 'node:test';import assert from 'node:assert/strict';import {Battle} from '../server/spell-battle/engine.mjs';
const corpus={ko:{easy:[{wrong:'됬다.',correct:'됐다.'}],med:[{wrong:'틀림',correct:'정답'}],hard:[{wrong:'틀림',correct:'정답'}]}};
const person=n=>({id:String(n),subject:'browser:'+n,name:'참여자'+n,kind:'browser'});
test('2–10 teams, balanced random assignment, host controls and append-on-drop',()=>{const game=new Battle(corpus),host=person(1),r=game.create(host,10);for(let i=2;i<=21;i++)game.join(r.code,person(i));assert.deepEqual(Array.from({length:10},(_,t)=>r.players.filter(p=>p.team===t).length),Array(10).fill(2));assert.throws(()=>game.create(host,11));assert.throws(()=>game.create(host,1));assert.throws(()=>game.move(r.code,'2','3',0),/만/);game.move(r.code,'1','2',0);assert.equal(r.players.filter(p=>p.team===0).at(-1).id,'2');game.kick(r.code,'1','2');assert.throws(()=>game.join(r.code,person(2)),/내보내/);assert.throws(()=>game.kick(r.code,'1','1'),/진행자/);});
test('server owns time, round progression, settings and replay protection',()=>{let now=0;const game=new Battle(corpus,{now:()=>now}),r=game.create(person(1),2);game.join(r.code,person(2));game.join(r.code,person(3));game.configure(r.code,'1',{difficulty:'easy',seconds:15,rounds:2});game.ready(r.code,'2',true);game.ready(r.code,'3',true);game.start(r.code,'1');assert.equal(game.view(r,'2').question.wrong,'됬다.');assert.equal('correct' in game.view(r,'2').question,false);assert.equal(game.answer(r.code,'2','됐다.',0).correct,true);assert.throws(()=>game.answer(r.code,'2','됐다.',0),/처리/);assert.throws(()=>game.configure(r.code,'1',{difficulty:'easy',seconds:15,rounds:2}),/시작 전/);now=15000;assert.throws(()=>game.answer(r.code,'2','됐다.',1),/지금/);assert.equal(r.phase,'between');now=20000;game.tick(r);assert.equal(r.round,2);assert.equal(r.players[1].roundScore,0);assert.ok(r.players[1].score>0);now=35000;game.tick(r);assert.equal(r.phase,'finished');});
test('membership required and rejoin retains the original team and host rights',()=>{const game=new Battle(corpus),r=game.create(person(1),2);assert.throws(()=>game.view(r,'stranger'),/참여/);game.join(r.code,{...person(1),id:'reconnected'});assert.equal(r.players.length,1);assert.equal(r.host,'reconnected');});

test('readiness, private teams, captain naming and settings changes',()=>{const g=new Battle(corpus),r=g.create(person(1),2);g.join(r.code,person(2));g.join(r.code,person(3));g.join(r.code,person(4));const member=r.players.find(p=>!p.isHost),team=r.players.filter(p=>p.team===member.team);g.rename(r.code,team[0].id,'새로운팀');assert.equal(r.teamNames[member.team],'새로운팀');if(team[1])assert.throws(()=>g.rename(r.code,team[1].id,'불가팀'));for(const p of team)g.ready(r.code,p.id,true);assert.throws(()=>g.rename(r.code,team[0].id,'잠긴이름'));assert.throws(()=>g.move(r.code,'1',team[0].id,1));assert.ok(g.view(r,member.id).players.every(p=>p.team===member.team));g.resize(r.code,'1',10);assert.ok(r.players.every(p=>!p.ready));assert.equal(r.teamCount,10);});

test('individual competition has no teams, common settings and independent scores',()=>{
 let now=0;const g=new Battle(corpus,{now:()=>now}),r=g.create(person(1),undefined,'individual');
 g.join(r.code,person(2));g.join(r.code,person(3));
 assert.equal(r.teamCount,0);assert.deepEqual(r.teamNames,[]);assert.ok(r.players.every(p=>p.team===null));
 assert.throws(()=>g.resize(r.code,'1',2),/개인전/);assert.throws(()=>g.move(r.code,'1','2',0),/개인전/);assert.throws(()=>g.rename(r.code,'2','팀이름'),/개인전/);
 g.configure(r.code,'1',{difficulty:'hard',seconds:15,rounds:1});
 assert.throws(()=>g.configure(r.code,'2',{difficulty:'easy',seconds:30,rounds:1}));
 for(const id of ['2','3'])g.ready(r.code,id,true);g.start(r.code,'1');
 const a=g.view(r,'2'),b=g.view(r,'3');assert.deepEqual(a.settings,b.settings);assert.equal(a.deadline,b.deadline);assert.equal(a.players.length,1);assert.equal(a.players[0].id,'2');
 assert.equal(g.answer(r.code,'2','정답',0).correct,true);assert.equal(g.answer(r.code,'2','정답',1).correct,true);assert.equal(g.answer(r.code,'3','정답',0).correct,true);
 const scores=g.view(r,'1').standings;assert.ok(scores.find(p=>p.id==='2').score>scores.find(p=>p.id==='3').score);assert.deepEqual(g.view(r,'2').teamTotals,[]);
 now=15000;assert.equal(g.view(r,'2').phase,'finished');assert.throws(()=>g.answer(r.code,'3','정답',1),/지금/);
});
