import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createLeaderboard} from '../public/spell-leaderboard.js';
test('submitted records preserve the best score and faster tie, with actual play timestamp',async()=>{
 let stored={score:200,elapsedMs:5000};let writes=0;
 const dbApi={doc:()=>({}),Timestamp:{fromMillis:x=>x},serverTimestamp:()=>123,runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>stored}),set:(_,data)=>{stored=data;writes++}})};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'owner'},profile:{nickname:'별빛수달'},nickname:'fallback'}));
 const record={lang:'ko',diff:'easy',mode:'timer',score:100,elapsedMs:1000,playedAt:999};
 await api.submit(record);assert.equal(writes,0);
 await api.submit({...record,score:200,elapsedMs:6000});assert.equal(writes,0);
 await api.submit({...record,score:200,elapsedMs:4000});assert.equal(writes,1);assert.equal(stored.playedAt,999);assert.equal(stored.nickname,'별빛수달');
});
test('guests cannot submit records',async()=>{
 const api=createLeaderboard(async()=>({s:{},user:null}));await assert.rejects(()=>api.submit({}),/로그인/);
});
test('public ranking writes are owner-bound and do not expose private profile fields',()=>{
 const rules=readFileSync(new URL('../firebase/firestore.rules',import.meta.url),'utf8').split('match /profiles')[0];
 assert.match(rules,/request.auth.uid == uid/);assert.match(rules,/hasOnly\(\['nickname','score','elapsedMs','playedAt','updatedAt'\]\)/);
 assert.match(rules,/playedAt <= request.time/);
});
test('every gallery preview is a two-second video',()=>{
 const dir=new URL('../public/videos/gallery/',import.meta.url);const files=readdirSync(dir).filter(f=>f.endsWith('.mp4'));assert.equal(files.length,18);
 for(const file of files){const data=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',new URL(file,dir).pathname.replaceAll('%20',' ')],{encoding:'utf8'}));assert.ok(Number(data.format.duration)<=2.01,file)}
});
