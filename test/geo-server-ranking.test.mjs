import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLeaderboard } from '../public/spell-leaderboard.js';

test('GeoWeb ranking isolates all six game modes from Spell Drill and retains the best record',async()=>{
 const paths=[],writes=[];let stored=null;
 const dbApi={doc:(...path)=>{paths.push(path.slice(1));return {};},Timestamp:{fromMillis:x=>x},serverTimestamp:()=>123,
 runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>!!stored,data:()=>stored}),set:(_,data)=>{stored=data;writes.push(data);}})};
 const context=async()=>({s:{db:{},dbApi},user:{uid:'player'},profile:{nickname:'별빛 탐험가',school:'별빛초'},nickname:'fallback'});
 const geo=createLeaderboard(context,'geo');
 const base={score:200,elapsedMs:4000,playedAt:1000};
 for(const mode of ['country','capital-easy','capital-hard','flag','nature','landmark']){stored=null;await geo.submit({...base,mode});assert.deepEqual(paths.at(-1),['geoBoards',mode,'players','player']);}
 assert.equal(stored.school,'별빛초');assert.equal(stored.playedAt,1000);
 const count=writes.length;
 await geo.submit({...base,mode:'landmark',score:100});assert.equal(writes.length,count);
 await geo.submit({...base,mode:'landmark',elapsedMs:3000});assert.equal(writes.length,count+1);
 await assert.rejects(()=>geo.submit({...base,mode:'practice'}),/Invalid board/);
 const spell=createLeaderboard(context);stored=null;
 await spell.submit({...base,lang:'ko',diff:'easy',mode:'timer'});assert.deepEqual(paths.at(-1),['spellBoards','ko_easy_timer','players','player']);
});

test('GeoWeb difficulty boards isolate new records and keep legacy boards readable by old clients',async()=>{
 const paths=[];
 const dbApi={doc:(...p)=>{paths.push(p.slice(1));return {};},Timestamp:{fromMillis:x=>x},serverTimestamp:()=>123,
 runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>false}),set:()=>{}})};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'player'},profile:{nickname:'별빛 탐험가'}}),'geo');
 const record={score:200,elapsedMs:1000,playedAt:1};
 for(const mode of ['country','capital-easy','capital-hard','flag','nature','landmark']){
  for(const diff of (['nature','landmark'].includes(mode)?['easy','hard']:['easy','med','hard','expert'])){await api.submit({...record,mode,diff});assert.equal(paths.at(-1)[1],`${mode}_${diff}`);}
  await api.submit({...record,mode});assert.equal(paths.at(-1)[1],mode);
  await assert.rejects(()=>api.submit({...record,mode,diff:'unknown'}),/Invalid difficulty/);
 }
});

test('developer account affiliation is stored with a new voluntary record without exposing email',async()=>{
 let stored;const dbApi={doc:()=>({}),Timestamp:{fromMillis:x=>x},serverTimestamp:()=>1,runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>false}),set:(_,data)=>{stored=data;}})};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'HfR0sV3bsBQ98I71IkNlxJ2R70z2'},profile:{nickname:'parcyun DEXTER',school:'학교'}}),'geo');
 await api.submit({mode:'landmark',diff:'hard',score:100,elapsedMs:1000,playedAt:1});assert.equal(stored.school,'DEXTER 개발자');assert.equal(stored.email,undefined);
});

test('a copied developer email or nickname cannot bypass reserved names',async()=>{
 const api=createLeaderboard(async()=>({user:{uid:'impostor',email:'pen.layered@example.com'},profile:{nickname:'DEXTER'}}),'geo');
 await assert.rejects(()=>api.submit({mode:'landmark',score:100,elapsedMs:1000,playedAt:1}),/별명/);
});

test('submission reports an actual transaction improvement, including faster ties',async()=>{
 let stored={score:200,elapsedMs:2000};const dbApi={doc:()=>({}),Timestamp:{fromMillis:x=>x},serverTimestamp:()=>1,runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>stored}),set:(_,value)=>{stored=value;}})};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'player'},profile:{nickname:'탐험가'}}),'geo');
 const base={mode:'landmark',diff:'easy',playedAt:1};
 assert.deepEqual(await api.submit({...base,score:100,elapsedMs:1000}),{improved:false});
 assert.deepEqual(await api.submit({...base,score:200,elapsedMs:2000}),{improved:false});
 assert.deepEqual(await api.submit({...base,score:200,elapsedMs:1500}),{improved:true});
 assert.deepEqual(await api.submit({...base,score:300,elapsedMs:5000}),{improved:true});
});
