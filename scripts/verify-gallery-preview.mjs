import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto(process.argv[2]||'http://127.0.0.1:47693/');
for(let i=0;i<2;i++){await page.getByRole('button',{name:'다음 섹션',exact:true}).click();await page.waitForTimeout(750)}
const first=page.locator('.experience-card.pinned').first();
assert.equal(await first.getAttribute('href'),'/');
await first.locator('video').waitFor();
await page.waitForFunction(()=>document.querySelector('.experience-card video')?.readyState>=2);
assert.equal(await page.locator('.experience-card.pinned .experience-views').count(),0);
await first.hover();
const start=await first.locator('img').evaluate(e=>({opacity:Number(getComputedStyle(e).opacity),active:e.parentElement.classList.contains('preview-playing')}));
assert.ok(start.active,'hover activates preview without playback-event delay');
await page.waitForTimeout(250);
const playing=await first.locator('video').evaluate(v=>({paused:v.paused,time:v.currentTime,duration:v.duration,loop:v.loop,muted:v.muted,fit:getComputedStyle(v).objectFit}));
assert.equal(playing.paused,false);assert.ok(playing.time>0);assert.equal(playing.loop,true);assert.equal(playing.muted,true);assert.equal(playing.fit,'contain');
assert.ok(Math.abs(playing.duration-10)<.1,'five two-second scenes');
assert.equal(await first.locator('img').evaluate(e=>Number(getComputedStyle(e).opacity)),0);
await first.locator('video').evaluate(v=>{v.currentTime=9.8});await page.waitForTimeout(650);
assert.ok(await first.locator('video').evaluate(v=>v.currentTime<1),'preview loops after the fifth scene');
await page.mouse.move(1,1);await page.waitForTimeout(80);
assert.equal(await first.locator('video').evaluate(v=>v.paused),true);
await page.screenshot({path:'/Users/parcyun/Downloads/Codex/Artifacts/2026-10-29/actual-recording-gallery.png'});
const media=await page.evaluate(async()=>{
 const manifest=await fetch('/videos/gallery/recordings.json').then(r=>r.json());
 return Promise.all(Object.keys(manifest).map(id=>new Promise((resolve,reject)=>{
  const v=document.createElement('video');v.preload='metadata';v.muted=true;
  v.onloadedmetadata=()=>resolve({id,duration:v.duration,width:v.videoWidth});v.onerror=()=>reject(new Error(id));
  v.src=`/videos/gallery/${id}.mp4?v=20261029-five-scenes`;
 })));
});
assert.equal(media.length,18);for(const v of media){assert.ok(Math.abs(v.duration-10)<.1,v.id);assert.equal(v.width,960)}
console.log(JSON.stringify({start,playing,pinnedViews:0,exitPaused:true,loopVerified:true,decodedPreviews:media.length}));
await browser.close();
