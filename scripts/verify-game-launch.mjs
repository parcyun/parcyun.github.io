import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.argv[2]||'http://127.0.0.1:56831';
const out='/Users/parcyun/Downloads/Codex/Artifacts/2026-11-01/game-launch';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const game of ['spell-drill','world-map']){
  const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/${game}/`,{waitUntil:'domcontentloaded'});
  const intro=page.locator('#ps-game-intro');await intro.waitFor({state:'attached'});
  const state=await intro.evaluate(el=>({duration:getComputedStyle(el).animationDuration,hidden:el.hidden,avatar:el.querySelector('img').complete}));assert.equal(state.duration,'2s');
  if(game==='world-map')assert.deepEqual(await intro.locator('.ps-intro-name').evaluate(el=>({text:el.textContent,weight:getComputedStyle(el).fontWeight,color:getComputedStyle(el).color,stroke:getComputedStyle(el).webkitTextStrokeWidth})),{text:'GeoWeb',weight:'300',color:'rgb(255, 255, 255)',stroke:'0px'});
  // Capture the same simultaneous lockup halfway through its real CSS timeline.
  if(!state.hidden){await intro.evaluate(el=>{for(const node of [el,el.firstElementChild])for(const a of node.getAnimations()){a.pause();a.currentTime=900}});await page.screenshot({path:`${out}/${game}-intro.png`});await intro.evaluate(el=>{for(const node of [el,el.firstElementChild])for(const a of node.getAnimations())a.play()});}
  await page.waitForFunction(()=>document.documentElement.dataset.gameIntro==='complete',{timeout:6000});
  assert.equal(await intro.evaluate(el=>el.hidden),true);
  await page.locator(game==='spell-drill'?'#spell-onboarding[data-guide-ready]':'.update-story[data-guide-ready]').waitFor({timeout:15000});
  await page.getByRole('button',{name:'시작하기',exact:true}).click();
  await page.screenshot({path:`${out}/${game}-home.png`});assert.deepEqual(errors,[]);
  const response=await page.request.get(`${base}/${game}/about/`);assert.equal(response.status(),200);assert.match(await response.text(),/처음에는 이렇게 이용하세요/);
  console.log(JSON.stringify({game,intro:state,guideReady:true,errors}));await page.close();
 }
 for(const viewport of [{width:390,height:844},{width:760,height:1000},{width:844,height:390}]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});const page=await context.newPage();
  await page.goto(`${base}/world-map/`);await page.waitForFunction(()=>document.documentElement.dataset.gameIntro==='complete');
  await page.locator('.update-story[data-guide-ready]').waitFor();await page.getByRole('button',{name:'시작하기',exact:true}).tap();
  const home=await page.locator('.home-fab').boundingBox(),actions=await page.locator('.ps-service-actions').boundingBox();
  assert.ok(home&&home.x<24&&home.y<30);assert.ok(actions&&actions.y<30&&actions.x>home.x+home.width);
  const earth=page.locator('.geo-mobile-earth'),earthBox=await earth.boundingBox();assert.ok(earthBox&&earthBox.y>=actions.y+actions.height&&Math.abs(earthBox.x+earthBox.width-(viewport.width-12))<1,'Earth is below utilities and right aligned');assert.equal(await earth.getAttribute('href'),'https://earth.google.com/web/');
  for(const selector of ['.ps-account-trigger','.ps-service-qr','.ps-service-link','.ps-service-actions .ps-share-fab'])assert.ok(await page.locator(selector).isVisible(),selector);
  const materials=[];
  for(const [label,selector] of [['지도 메뉴','.geo-mobile-surface'],['검색 메뉴','.country-search-panel'],['설정 메뉴','.tools-fixed'],['더보기 메뉴','.geo-mobile-surface']]){
   await page.getByRole('button',{name:label,exact:true}).tap();await page.waitForTimeout(240);
   const panel=page.locator(selector);await panel.waitFor();
   materials.push(await panel.evaluate(el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).backgroundColor})));
   assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'panel width');
   if(label==='설정 메뉴'){
    assert.equal(await panel.locator('.panel-body').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
    const rightColumn=await panel.locator('.panel-body>.tg').nth(1).boundingBox(),terrain=await panel.locator('.layer-toggle-row>.tg').nth(1).boundingBox();
    assert.ok(Math.abs(rightColumn.x-terrain.x)<1,'terrain matches the right settings column');
    await page.screenshot({path:`${out}/geoweb-settings-${viewport.width}.png`});
   }
  }
  assert.ok(materials.every(material=>JSON.stringify(material)===JSON.stringify(materials[0])),'same glass on all four panels');
  const dock=await page.locator('.geo-mobile-dock').evaluate(el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).backgroundColor}));assert.deepEqual(dock,materials[0]);
  const channels=dock.color.match(/[\d.]+/g).slice(0,3);assert.equal(new Set(channels).size,1,'neutral surface channels');assert.match(await page.locator('.geo-mobile-dock').evaluate(el=>getComputedStyle(el).backdropFilter),/saturate\(0\)/);
  assert.equal(await page.locator('.geo-mobile-more button,.geo-mobile-more a').count(),4);assert.equal(await page.locator('.geo-mobile-more').getByText(/내 프로필|parcyun studio|QR 코드|쌤 동료|스펠 드릴|Google Earth/).count(),0);
  for(const name of ['리뷰 남기기','지오웹 소개 · 사용 방법']){const box=await page.locator('.geo-mobile-more').getByRole(name==='리뷰 남기기'?'button':'link',{name:new RegExp(name)}).boundingBox();assert.ok(box.height<=42,'compact more action: '+name);}
  assert.equal(Number(dock.color.match(/[\d.]+/g)[3]),.82,'slightly more transparent neutral surface');
  await page.evaluate(()=>{window.panelSamples=[];window.trackPanels=true;const tick=()=>{if(!window.trackPanels)return;window.panelSamples.push([...document.querySelectorAll('.geo-mobile-surface,.gl-app>.tools-fixed,.country-search-panel')].filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>0).length);requestAnimationFrame(tick)};tick()});
  for(const name of ['지도 메뉴','검색 메뉴','설정 메뉴','지도 메뉴','더보기 메뉴']){const r=await page.getByRole('button',{name,exact:true}).boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(35)}
  await page.waitForTimeout(300);const samples=await page.evaluate(()=>{window.trackPanels=false;return window.panelSamples});assert.ok(Math.max(...samples)<=1,'no overlapping old panel frames');
  assert.equal(await page.locator('.geo-mobile-surface').getAttribute('aria-label'),'더보기 메뉴');
  await page.screenshot({path:`${out}/geoweb-more-${viewport.width}.png`});
  console.log(JSON.stringify({viewport,topActions:true,twoColumnSettings:true,glassUnified:true,maxSimultaneousPanels:Math.max(...samples)}));await context.close();
 }
 for(const game of ['spell-drill','world-map']){
  const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();await page.goto(`${base}/${game}/`);await page.waitForFunction(()=>document.documentElement.dataset.gameIntro==='complete');assert.equal(await page.locator('#ps-game-intro').evaluate(el=>el.hidden),true);await context.close();
 }
}finally{await browser.close()}
