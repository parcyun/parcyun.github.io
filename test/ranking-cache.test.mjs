import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRankingCache,RANKING_CACHE_MS} from '../public/ranking-cache.js';
import {createLeaderboard} from '../public/spell-leaderboard.js';
function storage(){const map=new Map();return {get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('public cache survives a reload, preserves played time and expires without extending on reads',async()=>{
 const s=storage();let at=1000,reads=0;const options={storage:()=>s,now:()=>at};
 const load=async()=>{reads++;return [{id:'a',score:100,playedAt:{toDate:()=>new Date(1234)}}]};
 await createRankingCache(options).get('board',load);at+=500;
 const rows=await createRankingCache(options).get('board',load);assert.equal(reads,1);assert.equal(rows[0].playedAt.toDate().getTime(),1234);
 at=1000+RANKING_CACHE_MS;await createRankingCache(options).get('board',load);assert.equal(reads,2);
});
test('overlapping fetches deduplicate; mutation invalidates cached and pending snapshots',async()=>{
 const c=createRankingCache({storage:()=>storage()});let finish,reads=0;
 const load=()=>{reads++;return new Promise(resolve=>finish=resolve)};
 const a=c.get('board',load),b=c.get('board',load);await Promise.resolve();assert.equal(reads,1);c.invalidate('board');finish([{id:'old'}]);await Promise.all([a,b]);
 assert.deepEqual(await c.get('board',async()=>[{id:'new'}]),[{id:'new'}]);
});
test('storage denied and failed queries do not break or cache errors',async()=>{
 const c=createRankingCache({storage:()=>{throw Error('denied')}});await assert.rejects(c.get('a',async()=>{throw Error('offline')}));assert.deepEqual(await c.get('a',async()=>[]),[]);
});
test('pagination and reopening a 120-player board perform one server query and keep own rank',async()=>{
 let reads=0,uid='p119';const docs=Array.from({length:120},(_,i)=>({id:`p${i}`,data:()=>({nickname:`player${i}`,score:120-i,elapsedMs:1000})}));
 const api=createLeaderboard(async()=>({user:{uid},s:{db:{},dbApi:{collection:()=>({}),query:x=>x,getDocsFromServer:async()=>{reads++;return{docs}}}}}));
 const filters={lang:'ko',diff:'easy',mode:'practice'};
 const first=await api.load(filters),second=await api.load(filters,first.cursor),third=await api.load(filters,second.cursor);
 assert.equal(first.rows.length,50);assert.equal(second.rows.length,50);assert.equal(third.rows.length,20);assert.equal(reads,1);assert.equal(third.mine.rank,120);
 uid='p0';assert.equal((await api.load(filters)).mine.rank,1);assert.equal(reads,1);
});
