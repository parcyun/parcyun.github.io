import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const path of ['spell-drill','world-map'])for(const width of [390,800]){
  const context=await browser.newContext({viewport:{width,height:1000},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  if(process.argv.includes('--candidate'))await page.route('**/game-account.js?*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(new URL('../public/game-account.js',import.meta.url),'utf8')}));
  await page.goto(`https://parcyun.github.io/${path}/`);
  if(path==='world-map')await page.locator('.update-story').waitFor({timeout:3000}).catch(()=>{});
  const intro=page.getByRole('button',{name:'시작하기',exact:true});if(await intro.isVisible())await intro.tap();
  await page.getByRole('button',{name:'Google 로그인 및 프로필',exact:true}).tap();
  const modal=page.getByRole('dialog',{name:'내 프로필',exact:true});const help=modal.locator('.ps-school-help');
  await help.waitFor();assert.equal(await help.evaluate(e=>e.open),false);
  await help.locator('summary').tap();assert.equal(await help.evaluate(e=>e.open),true);
  assert.equal(await help.locator('ol li').count(),3);
  assert.ok(await help.getByRole('link',{name:'Google 공식 안내 보기 ↗'}).isVisible());
  assert.ok(await modal.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no horizontal overflow');
  if(width===390)await page.screenshot({path:`/Users/parcyun/Downloads/Codex/Artifacts/2026-10-29/${path}-school-login-help.png`});
  await help.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await help.evaluate(e=>e.open),false);
  console.log(JSON.stringify({path,width,defaultCollapsed:true,touchExpand:true,keyboardCollapse:true,noOverflow:true}));
  await context.close();
 }
}finally{await browser.close()}
