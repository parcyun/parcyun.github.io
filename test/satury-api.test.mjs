import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createSearchServer} from '../server/satury/server.mjs';
test('Satury API preserves all regions, allows only studio CORS, and reuses public results',async()=>{
 let calls=0,clock=0;
 const server=createSearchServer({now:()=>clock,search:async(req,res)=>{calls++;await new Promise(r=>setTimeout(r,20));res.json({groups:{강원:['갈쿠리'],경기:['갈퀴'],제주:['각지']},url:'https://opendict.korean.go.kr/'});}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const options=await fetch(base+'/api/search',{method:'OPTIONS',headers:{Origin:'https://parcyun.github.io','Access-Control-Request-Method':'GET'}});
  assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),'https://parcyun.github.io');
  const denied=await fetch(base+'/api/search?q=갈퀴',{headers:{Origin:'https://evil.example'}});
  assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);assert.equal(calls,0);
  const invalid=await fetch(base+'/api/search?q=abc',{headers:{Origin:'https://parcyun.github.io'}});
  assert.equal(invalid.status,400);assert.equal(invalid.headers.get('access-control-allow-origin'),'https://parcyun.github.io');
  const results=await Promise.all(Array.from({length:4},()=>fetch(base+'/api/search?q=갈퀴',{headers:{Origin:'https://parcyun.github.io'}})));
  for(const r of results){assert.equal(r.status,200);assert.deepEqual(Object.keys((await r.json()).groups),['강원','경기','제주']);}
  assert.equal(calls,1);
  await fetch(base+'/api/search?q=갈퀴');assert.equal(calls,1);
  clock=86400001;await fetch(base+'/api/search?q=갈퀴');assert.equal(calls,2);
  assert.equal((await fetch(base+'/health')).status,200);
 }finally{server.close();await once(server,'close');}
});
