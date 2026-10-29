import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createLeaderboard,rankingAffiliation,isReservedNickname} from '../public/spell-leaderboard.js';
test('submitted records preserve the best score and faster tie, with actual play timestamp',async()=>{
 let stored={score:200,elapsedMs:5000};let writes=0;
 const dbApi={doc:()=>({}),Timestamp:{fromMillis:x=>x},serverTimestamp:()=>123,runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>stored}),set:(_,data)=>{stored=data;writes++}})};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'owner'},profile:{nickname:'별빛수달',school:'별빛초등학교'},nickname:'fallback'}));
 const record={lang:'ko',diff:'easy',mode:'timer',score:100,elapsedMs:1000,playedAt:999};
 await api.submit(record);assert.equal(writes,0);
 await api.submit({...record,score:200,elapsedMs:6000});assert.equal(writes,0);
 await api.submit({...record,score:200,elapsedMs:4000});assert.equal(writes,1);assert.equal(stored.playedAt,999);assert.equal(stored.nickname,'별빛수달');assert.equal(stored.school,'별빛초등학교');
});
test('guests cannot submit records',async()=>{
 const api=createLeaderboard(async()=>({s:{},user:null}));await assert.rejects(()=>api.submit({}),/로그인/);
});
test('public ranking writes are owner-bound and do not expose private profile fields',()=>{
 const rules=readFileSync(new URL('../firebase/firestore.rules',import.meta.url),'utf8').split('match /profiles')[0];
 assert.match(rules,/request.auth.uid == uid/);assert.match(rules,/hasOnly\(\['school','nickname','score','elapsedMs','playedAt','updatedAt'\]\)/);
 assert.match(rules,/playedAt <= request.time/);
});
test('gallery previews are real recordings with feature scenes under two seconds',()=>{
 const dir=new URL('../public/videos/gallery/',import.meta.url);const files=readdirSync(dir).filter(f=>f.endsWith('.mp4'));assert.equal(files.length,18);
  const manifest=JSON.parse(readFileSync(new URL('recordings.json',dir),'utf8'));assert.equal(Object.keys(manifest).length,18);
  for(const file of files){const entry=manifest[file.replace('.mp4','')];assert.equal(entry.kind,'real-browser-recording');assert.ok(entry.scenes.every(scene=>scene.duration<=2));const data=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',new URL(file,dir).pathname.replaceAll('%20',' ')],{encoding:'utf8'}));assert.ok(Number(data.format.duration)<=entry.scenes.length*2+.1,file)}
});

test('ranking affiliation shows school, playful stable fallback, and Dexter developer label',()=>{
 assert.equal(rankingAffiliation({nickname:'Dexter',school:'학교'}),'개발자');
 assert.equal(rankingAffiliation({nickname:'가나다',school:' 별빛초등학교 '}),'별빛초등학교');
 const player={id:'user-123',nickname:'가나다',school:'  '};
 assert.equal(rankingAffiliation(player),rankingAffiliation(player));
 assert.match(rankingAffiliation(player),/탐험가|모험가|수집가|기사|마법사|사냥꾼/);
});

test('reserved developer nicknames are blocked case-insensitively, including substrings',async()=>{
 for(const nickname of ['DEXTER','dexter','DeXtEr','superDEXTER123','parcyun','PARCYUN','helloParCyUn님']) {
  assert.equal(isReservedNickname(nickname),true);
  const api=createLeaderboard(async()=>({s:{},user:{uid:'owner'},profile:{nickname},nickname:'fallback'}));
  await assert.rejects(()=>api.submit({}),/별명/);
 }
 assert.equal(isReservedNickname('별빛 탐험가'),false);
});
