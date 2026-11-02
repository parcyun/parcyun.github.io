import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.argv[2]||'http://127.0.0.1:58331';const browser=await chromium.launch({channel:'chrome'});
try{for(const width of [1280,390])for(const game of ['spell-drill','world-map']){
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.route('**/*.supabase.co/**',route=>route.abort());
 await page.goto(`${base}/${game}/`);await page.waitForFunction(()=>document.documentElement.dataset.gameIntro==='complete');
 const start=page.getByRole('button',{name:'시작하기',exact:true});await start.waitFor();await start.click();
 await page.locator('.ps-service-actions').waitFor();
 if(game==='world-map'&&width===390){await page.getByRole('button',{name:'검색 메뉴',exact:true}).click();await page.locator('#country-search-input').fill('대한민국');await page.locator('.country-search-results button').first().waitFor();}
 assert.deepEqual(errors,[]);assert.equal(await page.locator('script[src*="static-cache.js"]').count(),1);
 assert.equal((await page.request.get(`${base}/world-map/battle/`)).status(),404);assert.equal((await page.request.get(`${base}/world-map/dev/`)).status(),404);
 console.log(JSON.stringify({game,width,guide:true,utilities:true,errors,publicBattle:404}));await context.close();
}}finally{await browser.close()}
