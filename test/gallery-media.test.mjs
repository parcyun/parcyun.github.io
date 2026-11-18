import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
test('every registered gallery poster and video exists',()=>{
 const media=JSON.parse(readFileSync(new URL('src/data/gallery-media.json',root),'utf8'));
 for(const [id,item] of Object.entries(media)){
  assert.ok(existsSync(new URL(`public${item.poster.split('?')[0]}`,root)),`${id} poster`);
  if(item.video)assert.ok(existsSync(new URL(`public${item.video.split('?')[0]}`,root)),`${id} video`);
 }
 assert.ok(media.satury.poster.includes('satury'));
 assert.match(media.satury.video,/satury\.mp4/,'Satury has its verified real recording');
 const recordings=JSON.parse(readFileSync(new URL('public/videos/gallery/recordings.json',root),'utf8'));
 assert.equal(recordings.satury.kind,'real-browser-recording');
 assert.equal(recordings.satury.scenes.length,5);
});
test('gallery uses explicit media instead of inventing filenames',()=>{
 const component=readFileSync(new URL('src/components/HomeCollections.tsx',root),'utf8');
 assert.ok(component.includes('gallery-media.json'));
 assert.doesNotMatch(component,/gallery-\$\{id\}|gallery\/\$\{id\}/);
 assert.ok(component.includes('loaded&&media.video'));
 assert.ok(component.includes('active&&!failed&&media.video'));
});
