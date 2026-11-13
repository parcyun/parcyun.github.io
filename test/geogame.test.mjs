import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {buildGamePools,LANDMARKS,matchesAnswer,normalizeAnswer,scoreAnswer,scoring,shuffledDeck} from '../src/components/geoGameData.js';
import {readRecords,updateRecord,formatTime} from '../src/components/geoGameRecords.js';
const pools=buildGamePools(JSON.parse(readFileSync(new URL('../public/lab-data/world.json',import.meta.url))),JSON.parse(readFileSync(new URL('../public/lab-data/geoweb-landforms.json',import.meta.url))));
test('question pools contain unique, answerable and located entries',()=>{
 assert.ok(LANDMARKS.length>=300);assert.equal(pools.nature.length,156);
 for(const [mode,pool] of Object.entries(pools)){
  assert.equal(new Set(pool.map(q=>q.id)).size,pool.length);
  for(const q of pool){assert.ok(matchesAnswer(q.name,q));if(mode!=='flag')assert.ok(q.coordinates.every(Number.isFinite),q.name);}
 }
 for(const q of pools.flag)assert.ok(existsSync(new URL(`../public${q.country.flag}`,import.meta.url)));
 for(const q of pools.nature){
  assert.ok(q.image?.startsWith('https://'),`${q.name} photo`);
  assert.ok(q.source?.startsWith('https://commons.wikimedia.org/wiki/File:'),`${q.name} source`);
  assert.ok(q.author&&q.license&&q.licenseUrl,`${q.name} attribution`);
 }
});
test('answers normalize spacing/case but do not accept partial guesses',()=>{
 assert.ok(matchesAnswer(' EIFFEL-TOWER ',{answers:['Eiffel Tower']}));
 assert.ok(!matchesAnswer('Tower',{answers:['Eiffel Tower']}));
 assert.ok(!matchesAnswer('',{answers:['Eiffel Tower']}));
});
test('country and flag games accept unambiguous common names and abbreviations without spaces',()=>{
 for(const mode of ['country','flag']){
  const byId=new Map(pools[mode].map(q=>[q.id,q]));
  for(const [id,answers] of Object.entries({CD:['민주 콩고','DR 콩고','DRC'],CF:['중앙 아공'],ZA:['남 아 공'],SA:['사 우 디'],TR:['튀르키예'],AU:['오스트레일리아']})){
   for(const answer of answers)assert.ok(matchesAnswer(answer,byId.get(id)),`${mode} ${id}: ${answer}`);
  }
  for(const question of pools[mode]){
   assert.ok(matchesAnswer(question.country.iso2,question));
   assert.ok(matchesAnswer(question.country.iso3,question));
  }
  assert.ok(!matchesAnswer('두바이',byId.get('AE')));
  assert.ok(!matchesAnswer('콩고',byId.get('CD')));
  const owners=new Map();
  for(const question of pools[mode])for(const answer of question.answers){
   const normalized=normalizeAnswer(answer);
   assert.ok(!owners.has(normalized)||owners.get(normalized)===question.id,`${mode}: ${answer} is ambiguous`);
   owners.set(normalized,question.id);
  }
 }
});
test('score uses shared Spell Drill formula and speed thresholds',()=>{
 for(const tier of ['easy','med','hard'])for(const comboCount of [1,3,6,9,12,15]){
 const gain=scoreAnswer('Seoul',0,tier,comboCount);
 assert.equal(gain.total,scoring.calculateCorrectGain({baseScore:scoring.baseScoreForDifficulty(tier),speedBonus:100,comboCount}).total);
 assert.equal(scoreAnswer('Seoul',100,tier,comboCount).speedBonus,0);
 }
});
test('deck never duplicates within a round or repeats previous first',()=>{
 const pool=[{id:'a'},{id:'b'},{id:'c'}];const deck=shuffledDeck(pool,'c',()=>0);
 assert.equal(new Set(deck.map(q=>q.id)).size,3);assert.notEqual(deck[0].id,'c');assert.equal(pool[0].id,'a');
});
test('records persist best score and prefer faster equal-score result',()=>{
 let records=updateRecord({},'flag',210,12);records=updateRecord(records,'flag',100,1);
 assert.deepEqual(records.flag,{score:210,seconds:12});
 records=updateRecord(records,'flag',210,10);assert.equal(records.flag.seconds,10);
 assert.deepEqual(readRecords({getItem:()=>JSON.stringify(records)}),records);
 assert.deepEqual(readRecords({getItem:()=>'{bad'}),{});
 assert.deepEqual(readRecords({getItem:()=>{throw Error();}}),{});
 assert.equal(formatTime(65),'1분 05초');
});

test('capital city suffix aliases are explicit and unrelated short guesses remain rejected',()=>{
 for(const q of pools['capital-easy'].filter(q=>q.id!=='GE'&&q.name.endsWith('시')))assert.ok(matchesAnswer(q.name.replace(/(?:특별시|광역시|시)$/,''),q),q.name);
 assert.ok(!matchesAnswer('트빌리',pools['capital-easy'].find(q=>q.id==='GE')));
 const tokyo=pools['capital-easy'].find(q=>q.id==='JP');assert.ok(!matchesAnswer('도',tokyo));
});
test('researched landmark and nature spellings include Korean Chinese readings',()=>{
 for(const [mode,name,answers] of [['nature','황허강',['황하','Yellow River']],['nature','양쯔강',['장강','양자강']],['landmark','천단',['톈탄','천단공원']],['landmark','자금성',['구궁','고궁박물원']],['landmark','러산 대불',['낙산대불']]])for(const answer of answers)assert.ok(matchesAnswer(answer,pools[mode].find(q=>q.name===name||q.id.endsWith(':'+name))),`${name}: ${answer}`);
 assert.ok(!matchesAnswer('탑',pools.landmark.find(q=>q.name==='에펠탑')));
});
test('every illustrated feature has at most three distinct attributed photos and two difficulty bands',()=>{
 for(const mode of ['landmark','nature']){assert.deepEqual([...new Set(pools[mode].map(q=>q.difficulty))].sort(),['easy','hard']);for(const q of pools[mode]){assert.ok(q.photos.length>=1&&q.photos.length<=3,q.name);assert.equal(new Set(q.photos.map(p=>p.image)).size,q.photos.length,q.name);assert.equal(new Set(q.photos.map(p=>decodeURIComponent(p.source).replaceAll('_',' '))).size,q.photos.length,q.name);for(const p of q.photos)assert.ok(p.author&&p.license&&p.licenseUrl&&p.source,q.name);}}
});
test('landmark countries never repeat consecutively, including across complete deck boundaries',()=>{
 let last;for(let n=0;n<20;n++){const deck=shuffledDeck(pools.landmark,last?.id,Math.random,last?.country.iso2);assert.equal(deck.length,pools.landmark.length);for(const q of deck){assert.notEqual(q.country.iso2,last?.country.iso2);last=q;}}
});
test('each displayed river is a single connected coordinate chain without invented long joins',()=>{
 for(const q of pools.nature.filter(q=>q.category==='rivers')){assert.equal(q.features.length,1,q.name);const g=q.features[0].geometry;assert.equal(g.type,'LineString',q.name);assert.ok(g.coordinates.length>2);for(const p of g.coordinates)assert.ok(p.every(Number.isFinite));}
});
