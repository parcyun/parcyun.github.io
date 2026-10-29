import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserProfileStore,BROWSER_PROFILE_KEY} from '../public/browser-profile.js';
import {createLeaderboard} from '../public/spell-leaderboard.js';
test('browser profile changes create independent versions and direct cache edits restore trusted data',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};let id=0;
 const store=createBrowserProfileStore({storage,randomId:()=>String(++id).padStart(32,'0')});
 const first=store.save({nickname:'별빛탐험가',school:'별빛초등학교'});
 assert.ok(Object.isFrozen(first));assert.equal(store.save({nickname:first.nickname,school:first.school}).version,first.version);
 storage.setItem(BROWSER_PROFILE_KEY,JSON.stringify({...first,nickname:'임의변경'}));store.check();assert.equal(JSON.parse(storage.getItem(BROWSER_PROFILE_KEY)).nickname,first.nickname);
 const second=store.save({nickname:'구름모험가',school:'구름초등학교'});assert.notEqual(second.version,first.version);assert.equal(first.nickname,'별빛탐험가');
 assert.equal(createBrowserProfileStore({storage}).current().version,second.version);
 assert.throws(()=>store.save({nickname:'helloDEXTER',school:''}),/별명/);
});
test('anonymous submissions use version-specific rows with submission-time identity',async()=>{
 const rows=new Map();let version='a'.repeat(32),profile={nickname:'별빛탐험가',school:'별빛초'};
 const dbApi={doc:(_,collection,board,players,id)=>id,Timestamp:{fromMillis:x=>x},serverTimestamp:()=>1,runTransaction:async(_,fn)=>fn({get:async id=>({exists:()=>rows.has(id),data:()=>rows.get(id)}),set:(id,row)=>rows.set(id,row)})};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'anonymous',isAnonymous:true},entryId:'anonymous_'+version,profile}),'geo');
 const record={mode:'country',diff:'easy',score:200,elapsedMs:2000,playedAt:100};await api.submit(record);
 version='b'.repeat(32);profile={nickname:'구름모험가',school:'구름초'};await api.submit(record);
 assert.equal(rows.size,2);assert.equal(rows.get('anonymous_'+ 'a'.repeat(32)).nickname,'별빛탐험가');assert.equal(rows.get('anonymous_'+version).school,'구름초');
});
