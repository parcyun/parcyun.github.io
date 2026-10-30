import test from 'node:test';
import assert from 'node:assert/strict';
import aliases from '../src/components/geoCountryAliases.json' with {type:'json'};
import {COUNTRIES} from '../src/components/globeCountries.js';
import {buildGamePools,matchesAnswer} from '../src/components/geoGameData.js';
const world={features:COUNTRIES.map(country=>({type:'Feature',properties:{n:country.boundaryName},geometry:{type:'Point',coordinates:country.coordinates}}))};
const pools=buildGamePools(world,{features:[]});
for(const mode of ['capital-easy','capital-hard'])test(`${mode}: any listed complete capital is sufficient; partial city names remain wrong`,()=>{
 for(const q of pools[mode]){
  for(const capital of [...q.country.capital.ko.split(' · '),...q.country.capital.en.split(' · ')])assert.ok(matchesAnswer(capital,q),q.id+': '+capital);
  assert.ok(matchesAnswer(q.name,q),'full combined answer remains accepted');
 }
 const za=pools[mode].find(q=>q.id==='ZA');
 for(const answer of ['프리토리아','케이프타운','블룸폰테인','Pretoria','Cape Town','Bloemfontein'])assert.ok(matchesAnswer(answer,za),answer);
 for(const answer of ['케이프','Cape','타운','', '프리토리아 틀린답'])assert.ok(!matchesAnswer(answer,za),answer);
 for(const [id,answer] of [['BO','La Paz'],['LK','Colombo'],['PS','East Jerusalem'],['SZ','Lobamba'],['YE','Aden']])assert.ok(matchesAnswer(answer,pools[mode].find(q=>q.id===id)));
 assert.ok(matchesAnswer('Washington, D.C.',pools[mode].find(q=>q.id==='US')));
 assert.ok(!matchesAnswer('D.C.',pools[mode].find(q=>q.id==='US')));
});

for(const mode of ['country','flag'])test(`${mode}: alternate country names are accepted without broad typo matching`,()=>{
 const byId=new Map(pools[mode].map(q=>[q.id,q]));
 for(const [id,names] of Object.entries({TR:['터키','튀르키예','튀르키에','Turkey','Türkiye','Turkiye'],GE:['조지아','조지자','그루지아','그루지야','Georgia'],BY:['백러시아','벨라루스'],MM:['버마','Burma'],SZ:['스와질란드','Swaziland'],TL:['동티모르','East Timor']})){
  for(const name of names)assert.ok(matchesAnswer(name,byId.get(id)),`${id}: ${name}`);
 }
 assert.ok(!matchesAnswer('그루지',byId.get('GE')));assert.ok(!matchesAnswer('튀르키',byId.get('TR')));
});

test('all 195 countries retain every reviewed alias in both country and flag games without cross-country collisions',()=>{
 assert.deepEqual(Object.keys(aliases).sort(),COUNTRIES.map(c=>c.iso2).sort());
 for(const mode of ['country','flag']){
  const owners=new Map();
  for(const q of pools[mode]){
   for(const name of aliases[q.id])assert.ok(matchesAnswer(name,q),`${mode} ${q.id}: ${name}`);
   for(const name of q.answers){const normalized=String(name).normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');assert.ok(!owners.has(normalized)||owners.get(normalized)===q.id,`${mode}: ambiguous ${name}`);owners.set(normalized,q.id);}
  }
  const byId=new Map(pools[mode].map(q=>[q.id,q]));
  for(const name of ['북한','조선','조선민주주의인민공화국']){assert.ok(matchesAnswer(name,byId.get('KP')));assert.ok(!matchesAnswer(name,byId.get('KR')));}
  assert.ok(!matchesAnswer('콩고',byId.get('CD')));assert.ok(matchesAnswer('콩고',byId.get('CG')));
  assert.ok(!matchesAnswer('도미니카',byId.get('DO')));assert.ok(!matchesAnswer('기니',byId.get('GW')));
  for(const [id,name] of [['RU','소련'],['RS','유고슬라비아'],['CZ','체코슬로바키아'],['VA','교황령'],['GB','잉글랜드']])assert.ok(!matchesAnswer(name,byId.get(id)));
 }
});
