import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const root=process.env.GEOWEB_QA_ROOT || resolve(import.meta.dirname,'..');
const apiBase='http://127.0.0.1:47820/api/geoweb-battle/';
const site='http://127.0.0.1:4321/world-map/';
const children=[];
function run(command,args,env={}){const child=spawn(command,args,{cwd:root,env:{...process.env,...env},stdio:'inherit'});children.push(child);return child;}
async function waitFor(url){for(let i=0;i<100;i++){try{const response=await fetch(url);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}throw Error(`Timed out waiting for ${url}`);}
async function api(path,body,token){const response=await fetch(apiBase+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw Error(`${path}: ${data.error}`);return data;}
const identity=(name,version)=>({kind:'browser',name,version:version.repeat(32)});
let browser;
try{
 run('node',['server/spell-battle/server.mjs']);
 run('node',['node_modules/astro/bin/astro.mjs','dev','--host','127.0.0.1','--port','4321'],{GEOWEB_LOCAL_BATTLE:'1'});
 await waitFor('http://127.0.0.1:47820/health');await waitFor(site);
 browser=await chromium.launch({headless:true,args:['--disable-gpu'],executablePath:process.env.GEOWEB_QA_CHROME});
 const desktop=await browser.newContext({viewport:{width:1440,height:900}});
 await desktop.route('**/game-account.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.psBattleIdentity=async()=>{await new Promise(resolve=>setTimeout(resolve,750));return (${JSON.stringify(identity('테스트진행자','a'))});};`}));
 const host=await desktop.newPage();host.on('pageerror',error=>console.error('HOST PAGE ERROR',error));await host.goto(site);await host.locator('.game-entry').waitFor({timeout:60000});
 if(await host.locator('.update-story').isVisible())await host.locator('.update-story-card > button').first().click();
 if(await host.locator('.guide-shade').isVisible())await host.locator('.guide-shade').click();
 await host.locator('.game-entry').click();
 await host.locator('.gb-launch').waitFor({timeout:30000}).catch(async error=>{await mkdir(resolve(root,'test-artifacts'),{recursive:true});await host.screenshot({path:resolve(root,'test-artifacts/geoweb-desktop-failure.png')});console.error('GeoGame count',await host.locator('.geo-game').count(),'body',String(await host.locator('body').innerText()).slice(-1500));throw error;});await host.locator('.gb-launch').click();
 assert.ok(await host.getByRole('button',{name:'로그인 또는 브라우저 계정 만들기',exact:true}).isDisabled());
 await host.getByText('계정 정보 확인 중',{exact:true}).waitFor();
 assert.equal(await host.locator('.gb-backdrop').evaluate(el=>getComputedStyle(el).animationName),'gb-fade-in');await host.getByRole('button',{name:'게임 참여하기',exact:true}).click();await host.getByRole('textbox',{name:'참가 코드'}).waitFor();await host.getByRole('button',{name:'돌아가기',exact:true}).click();await host.getByRole('button',{name:'게임 만들기',exact:true}).click();await host.getByRole('button',{name:'게임 만들기',exact:true}).waitFor({timeout:15000});const increase=host.getByRole('button',{name:'팀 개수 늘리기'});
 const decrease=host.getByRole('button',{name:'팀 개수 줄이기'});
 if(!await decrease.isDisabled())throw Error('Minimum team count was not enforced');
 for(let i=2;i<10;i++)await increase.click();
 if(!await increase.isDisabled())throw Error('Maximum team count was not enforced');
 await host.getByRole('button',{name:/^개인전/}).click();
 if(await increase.isVisible())throw Error('Individual mode showed team controls');
 await host.getByRole('button',{name:/^팀전/}).click();
 await host.getByRole('button',{name:'게임 만들기',exact:true}).click();
 // The account module is mocked for this local test, but the shared QR widget still runs.
 await host.locator('#ps-qr-popover:not([hidden])').waitFor();
 const qrClose=host.locator('.ps-qr-close');
 assert.ok(await qrClose.evaluate(el=>el.getBoundingClientRect().height<=32));
 await qrClose.click();
 const heading=host.locator('.gb-toolbar-code strong');await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)?.[0];if(!code)throw Error('Room code missing');
 const cards=host.locator('.gb-roster .gb-players');
 await cards.last().waitFor();
 const rows=()=>cards.evaluateAll(elements=>new Set(elements.map(el=>el.offsetTop)).size);
 assert.equal(await cards.count(),10);
 assert.equal(await rows(),2);
 assert.equal(await cards.evaluateAll(elements=>new Set(elements.map(el=>el.style.getPropertyValue('--gb-team-color'))).size),10);
 for(let count=9;count>=5;count--){
  await host.getByRole('button',{name:'팀 개수 이전',exact:true}).click();
  await host.waitForFunction(n=>document.querySelectorAll('.gb-roster .gb-players').length===n,count);
 }
 assert.equal(await rows(),1);
 for(let count=6;count<=10;count++){
  await host.getByRole('button',{name:'팀 개수 다음',exact:true}).click();
  await host.waitForFunction(n=>document.querySelectorAll('.gb-roster .gb-players').length===n,count);
 }
 await host.getByRole('button',{name:'시간 다음',exact:true}).click();
 await host.waitForFunction(()=>document.querySelector('output[aria-label="시간"]').textContent==='75초');
 await host.getByRole('button',{name:'라운드 다음',exact:true}).click();
 await host.waitForFunction(()=>document.querySelector('output[aria-label="라운드"]').textContent==='4회');
 const wheel=host.locator('.gb-game-wheel');
 await wheel.hover();
 await host.mouse.wheel(0,240);
 await host.mouse.wheel(0,240);
 await host.waitForFunction(()=>document.querySelector('.gb-game-wheel button[aria-pressed="true"]').textContent==='수도 이름');
 await wheel.getByRole('button',{name:'나라 이름',exact:true}).click();
 await host.waitForFunction(()=>document.querySelector('.gb-game-wheel button[aria-pressed="true"]').textContent==='나라 이름');
 const difficultyBefore=await host.locator('output[aria-label=난이도]').textContent();
 await host.getByRole('button',{name:'난이도 다음',exact:true}).click();
 await host.waitForFunction(old=>document.querySelector('output[aria-label="난이도"]').textContent!==old,difficultyBefore);
 await host.getByRole('button',{name:'난이도 이전',exact:true}).click();
 await host.waitForFunction(old=>document.querySelector('output[aria-label="난이도"]').textContent===old,difficultyBefore);
 const one=await api('session',identity('테스트선수1','b'));const two=await api('session',identity('테스트선수2','c'));
 const players=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await players.route('**/game-account.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.psBattleIdentity=async()=>{await new Promise(resolve=>setTimeout(resolve,750));return (${JSON.stringify(identity('테스트선수1','b'))});};`}));
 const player=await players.newPage();
 await player.goto(site);
 await player.getByRole('button',{name:'게임 모드',exact:true}).waitFor({timeout:60000});
 if(await player.locator('.update-story').isVisible())await player.locator('.update-story-card > button').first().click();
 if(await player.locator('.guide-shade').isVisible())await player.locator('.guide-shade').click();
 await player.getByRole('button',{name:'게임 모드',exact:true}).click();
 await player.locator('.gb-launch').click();
 assert.equal(await player.locator('.gb-backdrop').evaluate(el=>getComputedStyle(el).animationName),'gb-fade-in');
 await player.getByRole('button',{name:'게임 참여하기',exact:true}).click();
 await player.getByRole('textbox',{name:'참가 코드'}).fill(code);
 await player.getByRole('button',{name:'방 참가하기'}).click();
 await player.getByRole('button',{name:'준비 완료',exact:true}).waitFor();
 await api(`rooms/${code}/join`,{},two.token);
 const initial=await api(`rooms/${code}`,undefined,one.token);
 const card=host.locator(`[data-player="${one.id}"]`);
 await player.getByRole('button',{name:'준비 완료',exact:true}).click();
 await card.locator('.gb-ready-check').waitFor();
 assert.ok(await card.evaluate(el=>el.classList.contains('gb-player-ready')));
 const destination=initial.myTeam===9?8:9;
 await card.dragTo(host.locator(`.gb-roster [data-team="${destination}"] h3`));
 await host.locator(`.gb-roster [data-team="${destination}"] [data-player="${one.id}"] .gb-ready-check`).waitFor();
 await host.locator(`[data-player="${two.id}"]`).click();
 await host.getByRole('button',{name:'이 참여자 내보내기',exact:true}).click();
 await host.locator(`[data-player="${two.id}"]`).waitFor({state:'hidden'});
 await api(`rooms/${code}/join`,{},two.token);
 await api(`rooms/${code}/ready`,{ready:true},two.token);
 await host.getByRole('button',{name:/경기 시작/}).click();
 await player.locator('.gb-question input').waitFor({timeout:30000});
 const view=await api(`rooms/${code}`,undefined,one.token);
 assert.equal(view.teamCount,10);
 const corpus=JSON.parse(await readFile(resolve(root,'server/geoweb-battle/corpus.json')));
 const q=corpus[view.settings.difficulty].find(item=>item.id===view.question.id);
 await host.evaluate(()=>{const animate=Element.prototype.animate;window.scoreMotions=[];Element.prototype.animate=function(...args){if(this.closest('.gb-scoreboard'))window.scoreMotions.push(this.tagName);return animate.apply(this,args);};});
 await player.locator('.gb-question input').fill(q.answers[0]);await player.getByRole('button',{name:'정답 제출'}).click();await player.getByText(/정답!/).waitFor();
 await host.waitForFunction(()=>window.scoreMotions.includes('LI')&&window.scoreMotions.includes('STRONG'));
 assert.match(await host.locator('.gb-scoreboard li').first().innerText(),new RegExp(view.teamNames[destination]));
 await mkdir(resolve(process.env.GEOWEB_QA_OUTPUT||root,'test-artifacts'),{recursive:true});
 for(const [label,page] of [['desktop',host],['mobile',player]]){
  assert.ok(await page.locator('.gb-modal').evaluate(el=>{const bounds=el.getBoundingClientRect();return innerWidth-bounds.width<=26&&innerHeight-bounds.height<=26;}));
  await page.screenshot({path:resolve(process.env.GEOWEB_QA_OUTPUT||root,'test-artifacts',`geoweb-${label}.png`)});
 }
 await host.getByRole('button',{name:'경기 종료'}).click();
 await host.getByRole('button',{name:'종료 확인'}).click();
 for(const page of [host,player]){
  await page.getByRole('heading',{name:'최종 순위'}).waitFor();
  await page.evaluate(()=>{const el=document.querySelector('.gb-backdrop'),animate=el.animate;window.closeMotion=false;el.animate=function(...args){window.closeMotion=true;return animate.apply(this,args);};});
  await page.getByRole('button',{name:'대항전 닫기'}).click();
  await page.locator('.gb-modal').waitFor({state:'hidden'});
  assert.ok(await page.evaluate(()=>window.closeMotion));
 }
 console.log('Desktop and mobile: code join, 10-team match, answer, leaderboard movement, results and exit transitions passed');
}finally{await browser?.close();for(const child of children)child.kill();}
