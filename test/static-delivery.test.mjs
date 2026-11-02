import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {prepareStaticDelivery} from '../scripts/static-delivery.mjs';
test('production removes both Battle URLs, keeps normal map, versions assets by content and never caches HTML',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ps-delivery-'));
 try{for(const route of ['world-map','world-map/dev','world-map/battle']){await mkdir(join(root,route),{recursive:true});await writeFile(join(root,route,'index.html'),'<head></head>');}
 await writeFile(join(root,'one.js'),'v1');await prepareStaticDelivery(root);
 await assert.rejects(access(join(root,'world-map/dev/index.html')));await assert.rejects(access(join(root,'world-map/battle/index.html')));
 assert.match(await readFile(join(root,'world-map/index.html'),'utf8'),/static-cache.js/);
 const first=await readFile(join(root,'static-cache-sw.js'),'utf8');const manifest=JSON.parse(first.match(/^const REVISIONS=(.+);/)[1]);assert.ok(manifest['/one.js']);assert.ok(!manifest['/world-map/index.html']);
 await writeFile(join(root,'one.js'),'v2');await prepareStaticDelivery(root);const next=await readFile(join(root,'static-cache-sw.js'),'utf8');assert.notEqual(first,next);
 }finally{await rm(root,{recursive:true,force:true});}
});
