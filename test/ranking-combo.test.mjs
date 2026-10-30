import test from 'node:test';
import assert from 'node:assert/strict';
import {createLeaderboard} from '../public/spell-leaderboard.js';
for(const game of ['spell','geo'])test(`${game}: combo belongs to the submitted best record and legacy submissions remain valid`,async()=>{
 let stored=null;
 const dbApi={doc:()=>({}),Timestamp:{fromMillis:x=>x},serverTimestamp:()=>1,runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>!!stored,data:()=>stored}),set:(_,data)=>stored=data})};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'player'},profile:{nickname:'검증 탐험가'}}),game);
 const base={mode:game==='geo'?'country':'timer',lang:'ko',diff:game==='geo'?'expert':'easy',score:200,elapsedMs:1000,playedAt:1};
 await api.submit({...base,maxCombo:7});assert.equal(stored.maxCombo,7);
 await api.submit({...base,score:100,maxCombo:20});assert.equal(stored.maxCombo,7);
 await api.submit({...base,score:300,maxCombo:3});assert.equal(stored.maxCombo,3);
 stored=null;await api.submit(base);assert.equal('maxCombo' in stored,false);
 stored=null;await api.submit({...base,maxCombo:0});assert.equal(stored.maxCombo,0);
});
