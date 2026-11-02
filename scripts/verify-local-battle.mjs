import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.argv[2];assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
const browser=await chromium.launch({channel:'chrome'});
try{const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],cloud=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/run\.app|firestore.googleapis.com/.test(r.url()))cloud.push(r.url().split('?')[0]);});
 await page.goto(base+'/world-map/battle/');await page.getByRole('button',{name:/우리반 서버 수업/}).click();await page.getByRole('button',{name:'서버 만들기',exact:true}).click();
 await page.getByLabel('우리반 서버 이름').fill('로컬 캐시 검증');await page.getByRole('button',{name:'서버 만들고 코드 받기'}).click();
 await page.getByLabel('우리반 서버 참가 코드').waitFor();await page.getByRole('button',{name:'우리반 서버로 입장'}).click();await page.waitForTimeout(1300);
 assert.equal((await page.request.get(base+'/api/conquest/health')).status(),200);assert.deepEqual(errors,[]);assert.deepEqual(cloud,[]);
 console.log('PASS: local classroom created and entered; loopback API responds; no Cloud Run/Firestore requests or page errors.');
}finally{await browser.close()}
