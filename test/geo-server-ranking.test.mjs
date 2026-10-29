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
