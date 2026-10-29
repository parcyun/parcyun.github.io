import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
test('one gesture advances one scene; collections scroll stays inside until top boundary',()=>{
 let now=1000;const listeners={},moves=[];
 const sections=[0,1,2].map(i=>({tagName:'SECTION',offsetTop:i*800,clientHeight:800,scrollHeight:i===2?2400:800,scrollTop:0}));
 const root={children:sections,scrollTo:o=>moves.push(o.top),addEventListener:(k,fn)=>listeners[k]=fn};
 const document={querySelector:s=>s==='#home-scenes'?root:null,querySelectorAll:()=>[],addEventListener:()=>{}};
 runInNewContext(readFileSync(new URL('../public/home-scenes.js',import.meta.url),'utf8'),{document,matchMedia:()=>({matches:false}),performance:{now:()=>now},clearTimeout:()=>{},setTimeout:()=>1,ResizeObserver:class{observe(){}}});
 const wheel=deltaY=>{let prevented=false;listeners.wheel({deltaY,preventDefault(){prevented=true}});return prevented};
 wheel(100);now+=20;wheel(90);now+=20;wheel(60);assert.deepEqual(moves,[800]);
 now+=1000;wheel(100);assert.deepEqual(moves,[800,1600]);
 now+=1000;assert.equal(wheel(100),false);assert.deepEqual(moves,[800,1600]);
 sections[2].scrollTop=200;now+=1000;assert.equal(wheel(-100),false);
 sections[2].scrollTop=0;now+=1000;wheel(-100);assert.deepEqual(moves,[800,1600,800]);
});
