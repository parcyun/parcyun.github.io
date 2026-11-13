import {test} from 'node:test';
import assert from 'node:assert/strict';
import {warmPhoto} from '../src/components/geoPhotoPreload.js';
test('photo warming deduplicates requests and bounds simultaneous image decoding',async()=>{
 const images=[];globalThis.Image=class{constructor(){images.push(this);}set src(value){this.url=value;}};
 const a=warmPhoto('one'),b=warmPhoto('two'),c=warmPhoto('three');assert.equal(warmPhoto('one'),a);assert.equal(images.length,2);
 images[0].onload();assert.equal(await a,true);assert.equal(images.length,3);assert.equal(images[0].onload,null);
 images[1].onerror();assert.equal(await b,false);images[2].onload();assert.equal(await c,true);
 const retry=warmPhoto('two');assert.equal(images.length,4);images[3].onload();assert.equal(await retry,true);delete globalThis.Image;
});
