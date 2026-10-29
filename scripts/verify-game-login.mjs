// Signed-out tablet-sized browser. Opens Google authentication but never signs in.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const path of ['spell-drill','world-map']){
  const context=await browser.newContext({viewport:{width:800,height:1280},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.argv.includes('--candidate'))await page.route('**/game-account.js?*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(new URL('../public/game-account.js',import.meta.url),'utf8')}));
  await page.goto(`https://parcyun.github.io/${path}/`);
  if(path==='world-map')await page.locator('.update-story').waitFor({timeout:3000}).catch(()=>{});
  const intro=page.getByRole('button',{name:'시작하기',exact:true});if(await intro.isVisible())await intro.tap();
  await page.getByRole('button',{name:'Google 로그인 및 프로필',exact:true}).tap();
  const opened=page.waitForEvent('popup',{timeout:20000});
  await page.getByRole('button',{name:'Google 계정으로 로그인',exact:true}).tap();
  const popup=await opened;
  await popup.waitForURL(url=>url.hostname==='accounts.google.com',{timeout:25000});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({path,googleLoginOpened:true,errors}));
  await context.close();
 }
}finally{await browser.close()}
