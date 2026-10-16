import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {buildGamePools,LANDMARKS,matchesAnswer,scoreAnswer,scoring,shuffledDeck} from '../src/components/geoGameData.js';
import {readRecords,updateRecord,formatTime} from '../src/components/geoGameRecords.js';
const pools=buildGamePools(JSON.parse(readFileSync(new URL('../public/lab-data/world.json',import.meta.url))),JSON.parse(readFileSync(new URL('../public/lab-data/geoweb-landforms.json',import.meta.url))));
test('question pools contain unique, answerable and located entries',()=>{
 assert.equal(LANDMARKS.length,100);assert.ok(pools.nature.length>=50);
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
