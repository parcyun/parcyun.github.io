import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('public/studio-music.js','utf8');
test('icons show the next action: play when stopped, pause while playing',()=>{
 const component=readFileSync('src/components/StudioMusicPlayer.astro','utf8');
 assert.match(component,/data-playing="true"\] \[data-music-pause\]/);
 assert.match(component,/:not\(\[data-playing="true"\]\) \[data-music-play\]/);
});
function setup(saved=null,blocked=false){
 const events={},windowEvents={},documentEvents={},attrs={},storage=new Map(saved?[['ps-studio-music-v1',JSON.stringify(saved)]]:[]);
 let now=0,frames=[];
 const audio={volume:1,paused:true,ended:false,currentTime:0,duration:180,src:'',listeners:{},getAttribute:()=>audio.src,removeAttribute:()=>audio.src='',addEventListener:(name,fn)=>audio.listeners[name]=fn,
  play:async()=>{if(blocked){const error=Error('blocked');error.name='NotAllowedError';throw error;}audio.paused=false;audio.listeners.play?.();},pause:()=>{audio.paused=true;audio.listeners.pause?.();}};
 const button={contains:target=>target===button,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],addEventListener:(n,fn)=>events[n]=fn};
 const title={},play={},pause={},host={dataset:{},querySelector:s=>({'[data-music-audio]':audio,'[data-music-toggle]':button,'[data-music-title]':title,'[data-music-play]':play,'[data-music-pause]':pause})[s]};
 vm.runInNewContext(source,{URL,location:{href:'https://example.com/'},performance:{now:()=>now},requestAnimationFrame:fn=>frames.push(fn),document:{querySelector:()=>host,addEventListener:(name,fn,capture)=>{if(capture!==true)documentEvents[name]=fn;}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},window:{addEventListener:(n,fn)=>windowEvents[n]=fn}});
 return {audio,button,title,attrs,events,documentEvents,unblock:()=>blocked=false,windowEvents,storage,advance:async(ms=300)=>{now+=ms;const pending=frames;frames=[];pending.forEach(fn=>fn(now));await new Promise(r=>setImmediate(r));}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
for(const type of ['click','keydown','pointerdown','pointerup','touchstart','touchend','input','wheel','scroll'])test('blocked autoplay resumes with a fade on first trusted '+type,async()=>{
 const s=setup(null,true);await tick();s.unblock();
 s.documentEvents[type]({type,isTrusted:false,key:'a'});await tick();assert.equal(s.audio.paused,true);
 s.documentEvents[type]({type,isTrusted:true,key:'a',target:{}});await tick();assert.equal(s.audio.paused,false);assert.equal(s.audio.volume,0);
 await s.advance(750);assert.equal(s.audio.volume,.5);await s.advance(750);assert.equal(s.audio.volume,1);
 s.events.click();await s.advance();s.documentEvents[type]({type,isTrusted:true,key:'a',target:{}});await tick();assert.equal(s.audio.paused,true);
});
test('first input never restarts saved manual pause or double-toggles the music button',async()=>{
 const saved=setup({index:0,time:12,playing:false});saved.documentEvents.click({type:'click',isTrusted:true,target:{}});await tick();assert.equal(saved.audio.src,'');
 const blocked=setup(null,true);await tick();blocked.unblock();blocked.documentEvents.click({type:'click',isTrusted:true,target:blocked.button});await tick();assert.equal(blocked.audio.paused,true);
});
test('autoplay fades in, pause fades out, and both tracks alternate',async()=>{
 const s=setup();await tick();assert.equal(s.audio.volume,0);await s.advance(750);assert.equal(s.audio.volume,.5);await s.advance(750);assert.equal(s.audio.volume,1);
 assert.equal(s.audio.paused,false);assert.match(s.audio.src,/christmas/);
 s.events.click();assert.equal(s.audio.paused,false);await s.advance();assert.equal(s.audio.paused,true);assert.equal(s.audio.volume,0);
 s.events.click();await tick();
 s.audio.listeners.ended();await tick();assert.equal(s.title.textContent,'Slow Side of Sunday');assert.match(s.audio.src,/sunday/);
 s.audio.listeners.ended();await tick();assert.equal(s.title.textContent,'I love this Christmas city');
});
test('restores a paused position without autoplay and recovers from browser autoplay refusal',async()=>{
 const s=setup({index:1,time:42,playing:false});assert.equal(s.audio.src,'');assert.equal(s.title.textContent,'Slow Side of Sunday');
 s.events.click();await tick();s.audio.listeners.loadedmetadata();assert.equal(s.audio.currentTime,42);
 const denied=setup({index:0,time:12,playing:true},true);await tick();assert.equal(denied.attrs['aria-pressed'],'false');assert.equal(JSON.parse(denied.storage.get('ps-studio-music-v1')).playing,true);
});
test('page navigation preserves state and bfcache restores the intended playback',async()=>{
 const s=setup();await tick();s.audio.currentTime=25;s.windowEvents.pagehide();
 assert.equal(s.audio.paused,true);assert.equal(JSON.parse(s.storage.get('ps-studio-music-v1')).time,25);
 s.windowEvents.pageshow({persisted:true});await tick();assert.equal(s.audio.paused,false);
});
test('eligible roots and non-guidebook articles include exactly one shared player and real local audio',()=>{
 for(const path of ['','dexterity/','dexterity/hyangmisa/','academica/']){
  const html=readFileSync('dist/'+path+'index.html','utf8');
  assert.equal((html.match(/data-studio-music\s/g)||[]).length,1,path);
  assert.match(html,/data-astro-transition-persist="studio-music"/);assert.match(html,/preload="none"/);assert.doesNotMatch(html,/<audio[^>]*autoplay/);
 }
 for(const path of ['i-love-this-christmas-city-v1.mp3','slow-side-of-sunday-v1.mp3'])assert.ok(existsSync('dist/audio/studio/'+path));
});

test('guidebooks stay outside the music router',()=>{for(const name of ['geoweb','spell-drill','satury'])assert.doesNotMatch(readFileSync('dist/dexterity/guidebook/'+name+'/index.html','utf8'),/data-studio-music|astro-view-transitions-enabled/);});
test('page lifecycle remounts once per body and excludes guides and other origins',()=>{
 const listeners={},document={body:{},addEventListener:(name,fn)=>listeners[name]=fn},window={};
 vm.runInNewContext(readFileSync('public/studio-navigation.js','utf8'),{document,window,URL,location:{href:'https://example.com/',origin:'https://example.com'}});
 const api=window.psPageLifecycle;let mounts=0,cleanups=0;
 api.register('example',()=>{mounts++;return ()=>cleanups++;});listeners['astro:page-load']();assert.equal(mounts,1);
 document.body={};listeners['astro:page-load']();assert.equal(mounts,2);assert.equal(cleanups,1);
 for(const path of ['/','/dexterity/','/dexterity/hyangmisa/','/academica/'])assert.equal(api.eligible(path),true);
 for(const path of ['/atlas-gears/','/dexterity/guidebook/geoweb/','/world-map/','/spell-drill/','https://other.example/'])assert.equal(api.eligible(path),false);
});

test('Atlas Gears contains no music or music router',()=>{assert.doesNotMatch(readFileSync('dist/atlas-gears/index.html','utf8'),/data-studio-music|studio-navigation.js/);});
