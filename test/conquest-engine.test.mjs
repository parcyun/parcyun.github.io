import { test } from 'node:test';
import assert from 'node:assert/strict';
import {initialWorld,cellAt,center,neighbors,COLS,ROWS,adjacentOwned,applyAction,settle,RULES,rebuildWaters,seaRoute,attackOrigin,hexDistance,foundingTarget,rebellionTarget,CLASS_RULES,GLOBAL_ROOMS,battleTarget} from '../src/components/conquestEngine.js';
const fresh=()=>{const w=initialWorld();applyAction(w,'a',{type:'join',nation:'amber'},0);return w;};
const target=w=>Object.keys(w.owners).filter(c=>w.owners[c]==='amber').flatMap(neighbors).find(c=>!w.owners[c]);
const plan=w=>{const cell=target(w);applyAction(w,'a',{type:'plan',cell,id:'battle'},0);return cell;};
test('grid round trips globally and wraps the date line with reciprocal six-neighbor adjacency',()=>{
  assert.ok(COLS*ROWS>1000000&&COLS*ROWS<1500000);
  for(const lon of [-179.99,-100,0,127,179.99])for(const lat of [-83,-60,0,37,60,83]){
    const id=cellAt(lon,lat);assert.equal(cellAt(...center(id)),id);assert.equal(neighbors(id).length,6);
    for(const n of neighbors(id))assert.ok(neighbors(n).includes(id));
  }
  for(const r of [10,99,200]){const id=`0:${r}`;assert.ok(neighbors(id).some(n=>n.startsWith(`${COLS-1}:`)));}
});
test('only adjacent non-owned blocks can be attacked; one active battle per block',()=>{
  const w=fresh(),cell=target(w);assert.ok(adjacentOwned(w,cell,'amber'));
  assert.throws(()=>applyAction(w,'a',{type:'plan',cell:cellAt(0,0),id:'far'},0),/맞닿은/);
  assert.throws(()=>applyAction(w,'a',{type:'plan',cell:Object.keys(w.owners)[0],id:'own'},0),/맞닿은/);
  plan(w);assert.throws(()=>applyAction(w,'a',{type:'plan',cell,id:'duplicate'},0),/이미 진행/);
});
test('first to target captures atomically and later score cannot double-contribute',()=>{
  const w=fresh(),cell=plan(w);
  applyAction(w,'a',{type:'contribute',id:'battle',points:999},1);assert.equal(w.owners[cell],undefined);
  applyAction(w,'a',{type:'contribute',id:'battle',points:1},2);assert.equal(w.owners[cell],'amber');assert.equal(w.battles[0].status,'captured');
  assert.throws(()=>applyAction(w,'a',{type:'contribute',id:'battle',points:1},3),/전투 참여/);
});
test('defender participation and score win preserve ownership',()=>{
  const w=fresh(),cell=target(w);w.owners[cell]='forest';applyAction(w,'d',{type:'join',nation:'forest'},0);plan(w);
  // Plan explicitly against the bordering forest block.
  w.battles=[];applyAction(w,'a',{type:'plan',cell,id:'defense'},0);
  assert.throws(()=>applyAction(w,'d',{type:'contribute',id:'defense',points:1000},1),/참여/);
  applyAction(w,'d',{type:'participate',id:'defense'},1);applyAction(w,'d',{type:'contribute',id:'defense',points:1000},2);
  assert.equal(w.battles[0].status,'defended');assert.equal(w.owners[cell],'forest');
});
test('timeout rejects late contributions and keeps neutral or defending territory',()=>{
  const w=fresh(),cell=plan(w);assert.throws(()=>applyAction(w,'a',{type:'contribute',id:'battle',points:1000},RULES.battleMs),/参加|참여/);assert.equal(w.owners[cell],undefined);assert.equal(w.battles[0].status,'defended');
});
test('founding requires a vacant land cell, and score must finish before nation membership exists',()=>{
 const w=initialWorld();assert.throws(()=>applyAction(w,'p',{type:'found',cell:Object.keys(w.owners)[0],name:'나라'},0),/주인 없는/);
 const cell=cellAt(0,20);applyAction(w,'p',{type:'found',id:'found',cell,name:'새 나라'},0);assert.equal(w.players.p,undefined);assert.ok(w.campaigns[0].target>0);
 applyAction(w,'p',{type:'contribute',id:'found',points:w.campaigns[0].target},1);assert.equal(w.owners[cell],w.players.p.nation);assert.throws(()=>applyAction(w,'p',{type:'join',nation:'forest'},2),/이미/);
});
test('proposal uses electorate snapshot, one active proposal, one vote, and 70% at deadline',()=>{
  const w=fresh();for(let i=0;i<9;i++)applyAction(w,`v${i}`,{type:'join',nation:'amber'},0);
  const change={name:'새 이름',flag:'☀',color:'#123456'};applyAction(w,'a',{type:'propose',id:'p',change},0);
  assert.throws(()=>applyAction(w,'a',{type:'propose',id:'p2',change},1),/진행 중/);
  assert.throws(()=>applyAction(w,'a',{type:'vote',id:'p',yes:true},1),/이미 투표/);
  applyAction(w,'late',{type:'join',nation:'amber'},1);assert.throws(()=>applyAction(w,'late',{type:'vote',id:'p',yes:true},2),/투표 대상/);
  for(let i=0;i<6;i++)applyAction(w,`v${i}`,{type:'vote',id:'p',yes:true},2);
  assert.notEqual(w.nations.amber.name,change.name);settle(w,RULES.voteMs);assert.equal(w.nations.amber.name,change.name);assert.equal(w.proposals[0].status,'approved');
});
test('abstentions count against approval and invalid colors are rejected',()=>{
  const w=fresh();applyAction(w,'b',{type:'join',nation:'amber'},0);
  assert.throws(()=>applyAction(w,'a',{type:'propose',id:'bad',change:{name:'나라',flag:'a',color:'red'}},0),/확인/);
  applyAction(w,'a',{type:'propose',id:'p',change:{name:'부결',flag:'a',color:'#ffb11a'}},0);settle(w,RULES.voteMs);assert.equal(w.proposals[0].status,'rejected');assert.notEqual(w.nations.amber.name,'부결');
});

test('territorial sea is exactly one ring and overlapping claims remain contestable',()=>{
 const w=initialWorld();w.owners={'100:100':'amber','102:100':'forest'};const isLand=id=>id in w.owners;rebuildWaters(w,isLand);
 assert.deepEqual(w.waters['101:100'].sort(),['amber','forest']);assert.equal(w.waters['104:100'],undefined);assert.equal(w.waters['100:100'],undefined);
 applyAction(w,'a',{type:'join',nation:'amber'},0,isLand);applyAction(w,'d',{type:'join',nation:'forest'},0,isLand);
 applyAction(w,'a',{type:'plan',id:'sea',cell:'101:100'},1,isLand);assert.equal(w.battles[0].defender,'forest');assert.equal(w.battles[0].sea,true);
 applyAction(w,'a',{type:'contribute',id:'sea',points:1000},2,isLand);assert.equal(w.seaOwners['101:100'],'amber');assert.equal(w.owners['101:100'],undefined);
 assert.equal(w.waters['104:100'],undefined);
});
test('open sea cannot be attacked; voyages take 12 hours per step and only arrival unlocks landing',()=>{
 const w=initialWorld();w.owners={'100:100':'amber'};const isLand=id=>['100:100','110:100'].includes(id);rebuildWaters(w,isLand);applyAction(w,'a',{type:'join',nation:'amber'},0,isLand);
 assert.throws(()=>applyAction(w,'a',{type:'plan',cell:'104:100',id:'open'},1,isLand),/먼바다/);
 const route=seaRoute(w,'amber','110:100',isLand);assert.ok(route.length>1);assert.ok(route.every(id=>!isLand(id)));for(let i=1;i<route.length;i++)assert.ok(neighbors(route[i-1]).includes(route[i]));
 applyAction(w,'a',{type:'voyage',cell:'110:100',id:'v'},1,isLand);const v=w.voyages[0];assert.equal(v.arrivesAt-v.startedAt,(v.route.length-1)*RULES.voyageStepMs);assert.equal(attackOrigin(w,'110:100','amber'),undefined);
 assert.throws(()=>applyAction(w,'a',{type:'plan',cell:'110:100',id:'early'},2,isLand),/맞닿은/);
 settle(w,v.arrivesAt);assert.ok(attackOrigin(w,'110:100','amber'));applyAction(w,'a',{type:'plan',cell:'110:100',id:'land'},v.arrivesAt,isLand);assert.equal(w.battles.at(-1).cell,'110:100');
});
test('sea routing never crosses land and uses date-line wrapping',()=>{
 const w=initialWorld();w.owners={'0:100':'amber'};const isLand=id=>id==='0:100';rebuildWaters(w,isLand);const route=seaRoute(w,'amber',`${COLS-5}:100`,isLand);assert.ok(route.length<8);assert.equal(hexDistance('0:100',`${COLS-1}:100`),1);
});

test('voyages can reach a defended coast without teleporting across its land',()=>{
 const w=initialWorld();w.owners={'100:100':'amber','110:100':'forest'};const isLand=id=>id in w.owners;rebuildWaters(w,isLand);const route=seaRoute(w,'amber','110:100',isLand);assert.ok(route.length>1);assert.ok(neighbors('110:100').includes(route.at(-1)));assert.ok(route.every(id=>!isLand(id)));
});

test('classroom timing is fast while two named global rooms retain school-day timing',()=>{
 assert.deepEqual(GLOBAL_ROOMS.map(r=>r.name),['뉴 월드','컨티넨탈']);const c=initialWorld({key:'class-test',name:'우리반',kind:'class'});assert.equal(c.rules.battleMs,300000);assert.equal(c.rules.voteMs,60000);assert.equal(c.rules.voyageStepMs,10000);assert.equal(initialWorld().rules.battleMs,3*86400000);
});
test('leaving retains territory and vote snapshots but removes membership and current battle participation',()=>{
 const w=fresh();plan(w);const owner=Object.keys(w.owners)[0];applyAction(w,'a',{type:'leave'},1);assert.equal(w.players.a,undefined);assert.equal(w.owners[owner],'amber');assert.ok(!w.nations.amber.members.includes('a'));assert.ok(!w.battles[0].participants.includes('a'));
});
test('farther founding costs less; larger nations require more rebellion points',()=>{
 const w=initialWorld();w.owners={'100:100':'amber'};assert.ok(foundingTarget(w,'101:100')>foundingTarget(w,'200:100'));const before=rebellionTarget(w,'amber');w.owners['101:100']='amber';assert.ok(rebellionTarget(w,'amber')>before);
});
test('rebellion scores create an independent nation and old nation can defend it',()=>{
 const w=fresh(),cell=Object.keys(w.owners).find(id=>w.owners[id]==='amber');applyAction(w,'rebel',{type:'rebel',id:'rebel',cell,name:'독립국'},1);
 assert.equal(w.players.rebel,undefined);applyAction(w,'a',{type:'participate',id:'rebel'},2);applyAction(w,'a',{type:'contribute',id:'rebel',points:w.campaigns[0].target},3);assert.equal(w.campaigns[0].status,'defended');assert.equal(w.owners[cell],'amber');
 applyAction(w,'rebel',{type:'rebel',id:'second',cell,name:'독립국'},4);applyAction(w,'rebel',{type:'contribute',id:'second',points:w.campaigns.at(-1).target},5);assert.notEqual(w.owners[cell],'amber');assert.equal(w.players.rebel.nation,w.owners[cell]);
});

test('capital requires seven land blocks, own territory and the single proposal slot',()=>{
 const w=fresh(),cell=Object.keys(w.owners).find(id=>w.owners[id]==='amber');applyAction(w,'a',{type:'proposeCapital',id:'cap',cell},0);assert.equal(w.proposals[0].threshold,.8);assert.equal(w.proposals[0].kind,'capital');assert.throws(()=>applyAction(w,'a',{type:'propose',id:'info',change:{name:'이름',flag:'a',color:'#123456'}},1),/진행 중/);
 const small=fresh();for(const id of Object.keys(small.owners).filter(id=>small.owners[id]==='amber').slice(1))delete small.owners[id];assert.throws(()=>applyAction(small,'a',{type:'proposeCapital',id:'small',cell},0),/7블록/);
});
test('capital needs 80 percent instead of 70, and is marked only after vote closes',()=>{
 const w=fresh();for(let i=0;i<9;i++)applyAction(w,`v${i}`,{type:'join',nation:'amber'},0);const cell=Object.keys(w.owners).find(id=>w.owners[id]==='amber');applyAction(w,'a',{type:'proposeCapital',id:'seven',cell},0);for(let i=0;i<6;i++)applyAction(w,`v${i}`,{type:'vote',id:'seven',yes:true},1);settle(w,RULES.voteMs);assert.equal(w.proposals[0].status,'rejected');assert.equal(w.nations.amber.capital,undefined);
 const t=RULES.voteMs+1;applyAction(w,'a',{type:'proposeCapital',id:'eight',cell},t);for(let i=0;i<7;i++)applyAction(w,`v${i}`,{type:'vote',id:'eight',yes:true},t+1);assert.equal(w.nations.amber.capital,undefined);settle(w,t+RULES.voteMs);assert.equal(w.nations.amber.capital,cell);assert.equal(w.proposals[1].status,'approved');
 w.owners[cell]='forest';rebuildWaters(w,()=>true);assert.equal(w.nations.amber.capital,null);
});
test('capital vote is cancelled when its territory is lost before proclamation',()=>{
 const w=fresh(),cell=Object.keys(w.owners).find(id=>w.owners[id]==='amber');applyAction(w,'a',{type:'proposeCapital',id:'lost',cell},0);w.owners[cell]='forest';settle(w,RULES.voteMs);assert.equal(w.proposals[0].status,'cancelled');assert.equal(w.nations.amber.capital,undefined);
});

test('classroom battle goals give a ten-person country room to cooperate without changing global goals',()=>{
 const w=initialWorld({key:'class-ten',name:'10인 검사',kind:'class'});for(let i=0;i<10;i++)applyAction(w,`p${i}`,{type:'join',nation:'amber'},0);assert.equal(battleTarget(w,'amber'),5000);w.room.kind='global';assert.equal(battleTarget(w,'amber'),1000);
});

test('new nations get a distinct default territory color, and leaving preserves completed operation participants',()=>{
 const w=fresh(),cell=plan(w);applyAction(w,'a',{type:'contribute',id:'battle',points:1000},1);const historical=[...w.battles[0].participants];applyAction(w,'a',{type:'leave'},2);assert.deepEqual(w.battles[0].participants,historical);
 const vacant=cellAt(0,20),colors=Object.values(w.nations).map(n=>n.color);applyAction(w,'founder',{type:'found',id:'color',name:'새 국가',cell:vacant},3);applyAction(w,'founder',{type:'contribute',id:'color',points:w.campaigns.at(-1).target},4);assert.ok(!colors.includes(w.nations[w.players.founder.nation].color));
});
