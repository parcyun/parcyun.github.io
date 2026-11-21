import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('public/studio-music.js','utf8');
function setup(saved=null,blocked=false){
 const events={},windowEvents={},attrs={},storage=new Map(saved?[['ps-studio-music-v1',JSON.stringify(saved)]]:[]);
 const audio={paused:true,ended:false,currentTime:0,duration:180,src:'',listeners:{},getAttribute:()=>audio.src,removeAttribute:()=>audio.src='',addEventListener:(name,fn)=>audio.listeners[name]=fn,
  play:async()=>{if(blocked)throw Error('blocked');audio.paused=false;audio.listeners.play?.();},pause:()=>{audio.paused=true;audio.listeners.pause?.();}};
 const button={setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],addEventListener:(n,fn)=>events[n]=fn};
 const title={},play={},pause={},host={dataset:{},querySelector:s=>({'[data-music-audio]':audio,'[data-music-toggle]':button,'[data-music-title]':title,'[data-music-play]':play,'[data-music-pause]':pause})[s]};
 vm.runInNewContext(source,{document:{querySelector:()=>host},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},window:{addEventListener:(n,fn)=>windowEvents[n]=fn}});
 return {audio,button,title,attrs,events,windowEvents,storage};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('starts without fetching music and supports play/pause plus alternating repeat',async()=>{
 const s=setup();assert.equal(s.audio.src,'');assert.equal(s.attrs['aria-pressed'],'false');
 s.events.click();await tick();assert.equal(s.audio.paused,false);assert.match(s.audio.src,/christmas/);
 s.events.click();assert.equal(s.audio.paused,true);
 s.events.click();await tick();
 s.audio.listeners.ended();await tick();assert.equal(s.title.textContent,'Slow Side of Sunday');assert.match(s.audio.src,/sunday/);
 s.audio.listeners.ended();await tick();assert.equal(s.title.textContent,'I love this Christmas city');
});
test('restores a paused position without autoplay and recovers from browser autoplay refusal',async()=>{
 const s=setup({index:1,time:42,playing:false});assert.equal(s.audio.src,'');assert.equal(s.title.textContent,'Slow Side of Sunday');
 s.events.click();await tick();s.audio.listeners.loadedmetadata();assert.equal(s.audio.currentTime,42);
 const denied=setup({index:0,time:12,playing:true},true);await tick();assert.equal(denied.attrs['aria-pressed'],'false');assert.equal(JSON.parse(denied.storage.get('ps-studio-music-v1')).playing,false);
});
test('page navigation preserves state and bfcache restores the intended playback',async()=>{
 const s=setup();s.events.click();await tick();s.audio.currentTime=25;s.windowEvents.pagehide();
 assert.equal(s.audio.paused,true);assert.equal(JSON.parse(s.storage.get('ps-studio-music-v1')).time,25);
 s.windowEvents.pageshow({persisted:true});await tick();assert.equal(s.audio.paused,false);
});
test('four requested roots include exactly one shared player and real local audio',()=>{
 for(const path of ['','dexterity/','atlas-gears/','academica/']){
  const html=readFileSync('dist/'+path+'index.html','utf8');
  assert.equal((html.match(/data-studio-music\s/g)||[]).length,1,path);
  assert.match(html,/preload="none"/);assert.doesNotMatch(html,/<audio[^>]*autoplay/);
 }
 for(const path of ['i-love-this-christmas-city-v1.mp3','slow-side-of-sunday-v1.mp3'])assert.ok(existsSync('dist/audio/studio/'+path));
});
