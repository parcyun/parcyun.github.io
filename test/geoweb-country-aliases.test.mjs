import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGamePools,matchesAnswer} from '../src/components/geoGameData.js';
import {Battle} from '../server/geoweb-battle/engine.mjs';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const pools=buildGamePools(json('../public/lab-data/world.json'),json('../public/lab-data/geoweb-landforms.json'));
const corpus=json('../server/geoweb-battle/corpus.json');
test('all country and flag answers reach the generated server and offline corpus unchanged',()=>{
 assert.equal(pools.flag.length,195);
 for(const mode of ['country','flag'])for(const q of pools[mode]){
  const wire=corpus[mode].find(p=>p.id===q.id);assert.ok(wire,q.id);
  assert.deepEqual(wire.answers,q.answers,`${mode} ${q.id}`);
  for(const answer of q.answers){assert.ok(matchesAnswer(answer,q));assert.ok(matchesAnswer(` ${answer.replaceAll(' ','')} `,q));}
 }
});
test('short country names are accepted by the actual battle engine',()=>{
 const samples={CF:['중앙아프리카','중앙아공'],BA:['보스니아'],VC:['세인트빈센트'],SA:['사우디'],AE:['UAE'],KN:['세인트키츠'],TT:['트리니다드'],ST:['상투메'],AG:['앤티가'],CD:['민주콩고'],CG:['콩고공화국'],MH:['마샬제도'],CV:['케이프베르데']};
 for(const [id,answers] of Object.entries(samples))for(const answer of answers){
  const q=corpus.flag.find(q=>q.id===id),g=new Battle({country:[q]},{now:()=>10000});const r=g.create({id:'host',subject:'host',name:'host'},2);g.join(r.code,{id:'p',subject:'p',name:'p'});r.phase='playing';r.round=1;r.deadline=60000;r.settings.level='easy';r.deck=[0];const p=g.member(r,'p');p.deck=[0];p.questionStartedAt=9000;
  assert.ok(g.answer(r.code,'p',answer,0).correct,`${id}: ${answer}`);
 }
});
test('distinct countries retain distinct short names',()=>{
 const flag=id=>pools.flag.find(q=>q.id===id);
 for(const [id,wrong] of [['DO','도미니카'],['CD','콩고'],['GQ','기니'],['SS','수단'],['NZ','뉴기니']])assert.equal(matchesAnswer(wrong,flag(id)),false,`${id} must not accept ${wrong}`);
});
