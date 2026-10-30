import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES } from '../src/components/globeCountries.js';
import { countryFamiliarity,difficultyDeck,gameRecordKey,hasCountryDifficulty } from '../src/components/geoGameDifficulty.js';
import { readRecords,updateRecord } from '../src/components/geoGameRecords.js';
const pool=COUNTRIES.map(country=>({id:country.iso2,country}));
const seeded=()=>{let seed=12345;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
test('each difficulty repeatedly favors its own familiarity band without duplicates per batch',()=>{
 for(const difficulty of ['easy','med','hard']){
  const random=seeded(),counts={easy:0,med:0,hard:0};let previous;
  for(let round=0;round<500;round++){
   const deck=difficultyDeck(pool,difficulty,previous,random);
   assert.equal(deck.length,12);assert.equal(new Set(deck.map(q=>q.id)).size,12);assert.notEqual(deck[0].id,previous);
   for(const q of deck)counts[countryFamiliarity(q.id)]++;
   previous=deck.at(-1).id;
  }
  assert.ok(counts[difficulty]/6000>.65,`${difficulty}: ${JSON.stringify(counts)}`);
  if(difficulty==='med'){assert.ok(counts.easy/6000<.04);assert.ok(counts.hard/6000>.25);}
  if(difficulty==='hard'){assert.ok(counts.hard/6000>.94);assert.ok(counts.easy/6000<.003);}
  for(const count of Object.values(counts))assert.ok(count>0);
 }
 assert.deepEqual(pool.map(q=>q.id),COUNTRIES.map(c=>c.iso2));
});
test('small pools work even when the favored band is absent',()=>{
 const small=pool.filter(q=>['KR','JP','US'].includes(q.id));
 for(const difficulty of ['easy','med','hard']){
  const deck=difficultyDeck(small,difficulty,'KR',seeded());
  assert.equal(deck.length,3);assert.notEqual(deck[0].id,'KR');assert.equal(new Set(deck.map(q=>q.id)).size,3);
 }
 assert.deepEqual(difficultyDeck([],'easy'),[]);
 assert.throws(()=>difficultyDeck(pool,'invalid'),/Invalid difficulty/);
});
test('new local best records remain separate by level and retain legacy records',()=>{
 let records={country:{score:100,seconds:10}};
 records=updateRecord(records,gameRecordKey('country','easy'),200,9);
 records=updateRecord(records,gameRecordKey('country','hard'),300,12);
 assert.equal(records.country.score,100);assert.equal(records.country_easy.score,200);assert.equal(records.country_hard.score,300);
 assert.equal(gameRecordKey('nature','easy'),'nature');
 assert.deepEqual(readRecords({getItem:()=>JSON.stringify(records)}),records);
 assert.equal(hasCountryDifficulty('flag'),true);assert.equal(hasCountryDifficulty('landmark'),false);
});

test('expert uses exactly the hard country distribution with independent records',()=>{
 assert.deepEqual(difficultyDeck(pool,'expert',undefined,seeded()),difficultyDeck(pool,'hard',undefined,seeded()));
 assert.equal(gameRecordKey('country','expert'),'country_expert');
});
