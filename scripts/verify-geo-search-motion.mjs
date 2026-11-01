import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.argv[2]||'http://127.0.0.1:56841';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(`${base}/world-map/`);await page.waitForFunction(()=>document.documentElement.dataset.gameIntro==='complete');
 const start=page.getByRole('button',{name:'시작하기',exact:true});if(await start.isVisible())await start.tap();
 await page.getByRole('button',{name:'검색 메뉴',exact:true}).tap();
 const panel=page.locator('.country-search-panel');await panel.waitFor();
 const durations=await panel.evaluate(el=>({entry:getComputedStyle(el).animationDuration,children:[...el.querySelectorAll('.country-search,.country-search-results')].map(e=>({name:e.className,duration:getComputedStyle(e).transitionDuration}))}));
 console.log(JSON.stringify(durations));assert.equal(durations.entry,'0.14s');
 for(const child of durations.children)assert.ok(child.duration.split(',').every(t=>parseFloat(t)<=.14),`${child.name} must not prolong the shared entry motion`);
 await page.locator('#country-search-input').fill('대한민국');
 await page.locator('.country-search-results button').first().waitFor();
 await page.getByRole('button',{name:'더보기 메뉴',exact:true}).tap();
 await page.locator('.geo-mobile-more').waitFor();
 await page.getByRole('button',{name:'검색 메뉴',exact:true}).tap();
 await panel.waitFor();await page.waitForTimeout(160);
 const running=await panel.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running'&&!a.effect.target.matches('.country-search-spinner')).map(a=>({duration:a.effect.getTiming().duration,target:a.effect.target.className})));
 assert.deepEqual(running,[],'search panel must settle within the same entry budget');
 assert.equal(await page.locator('#country-search-input').inputValue(),'대한민국');
 console.log('Search and preserved results settle within the shared motion budget.');
}finally{await browser.close()}
