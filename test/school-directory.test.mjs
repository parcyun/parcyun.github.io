import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {searchSchools,schoolMark} from '../public/school-directory.js';
test('local school search returns road addresses, regional duplicates, and server-cached marks',async()=>{
 const original=globalThis.fetch;const requests=[];globalThis.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>JSON.parse(await readFile(new URL('../public'+url,import.meta.url),'utf8'))};};
 try{
 const all=await searchSchools('가락');assert.ok(all.rows.length>1);assert.ok(all.rows.every(r=>r.name.includes('가락')&&r.address));
 const seoul=await searchSchools('가락','B10');assert.ok(seoul.rows.length);assert.ok(seoul.rows.every(r=>r.id.startsWith('B10:')));
 assert.match(await schoolMark({id:'B10:7010057'}),/^\/school-marks\/B10-7010057\.webp$/);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>searchSchools('학교','',controller.signal),{name:'AbortError'});
 assert.ok(requests.every(url=>url.startsWith('/')),'search never fetches a remote school image');
 }finally{globalThis.fetch=original;}
});
