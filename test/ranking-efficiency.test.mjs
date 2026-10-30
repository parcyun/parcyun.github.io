import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLeaderboard,compareRankingEfficiency as compare} from '../public/spell-leaderboard.js';
test('ranking uses score per time, with deterministic score and duration ties',()=>{
 const rows=[{score:1000,elapsedMs:100000},{score:200,elapsedMs:1000},{score:400,elapsedMs:2000},{score:400,elapsedMs:2000}];
 assert.deepEqual([...rows].sort(compare),[rows[2],rows[3],rows[1],rows[0]]);
 assert.equal(compare(rows[2],rows[3]),0);
 assert.ok(compare({score:100,time:'0:10'},{score:100,elapsedMs:20000})<0);
 assert.ok(compare({score:100,elapsedMs:0},{score:100,elapsedMs:1000})>0);
});
for(const game of ['spell','geo'])test(`${game}: global efficiency order spans pages, my rank and refresh use server records`,async()=>{
 let reads=0;
 const records=Array.from({length:121},(_,i)=>({id:`p${i}`,score:1000+i,elapsedMs:100000-i*500}));
 records[0]={id:'owner',score:500,elapsedMs:1000};
 const dbApi={collection:()=>({}),query:c=>c,getDocsFromServer:async()=>{reads++;return {docs:records.map(r=>({id:r.id,data:()=>r}))}}};
 const api=createLeaderboard(async()=>({s:{db:{},dbApi},user:{uid:'owner'}}),game);
 const filters=game==='geo'?{mode:'flag',diff:'easy'}:{lang:'ko',diff:'easy',mode:'timer'};
 const first=await api.load(filters),second=await api.load(filters,first.cursor),third=await api.load(filters,second.cursor);
 assert.equal(first.rows[0].id,'owner');assert.equal(first.mine.rank,1);
 assert.equal(first.rows.length,50);assert.equal(second.rows.length,50);assert.equal(third.rows.length,21);assert.equal(third.more,false);
 const all=[...first.rows,...second.rows,...third.rows];assert.equal(new Set(all.map(r=>r.id)).size,121);
 assert.ok(all.every((r,i)=>i===0||compare(all[i-1],r)<=0));
 records[0].elapsedMs=1000000;
 const refreshed=await api.load(filters);assert.equal(refreshed.mine.rank,121);assert.equal(reads,4);
});
