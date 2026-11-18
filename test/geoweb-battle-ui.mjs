import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve(import.meta.dirname,'..');
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
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});
 const desktop=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await desktop.route('**/game-account.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.psBattleIdentity=async()=>(${JSON.stringify(identity('테스트진행자','a'))});`}));
 const host=await desktop.newPage();host.on('pageerror',error=>console.error('HOST PAGE ERROR',error));await host.goto(site);await host.locator('.game-entry').waitFor({timeout:60000});
 if(await host.locator('.update-story').isVisible())await host.locator('.update-story-card > button').first().click();
 if(await host.locator('.guide-shade').isVisible())await host.locator('.guide-shade').click();
 await host.locator('.game-entry').click();
 await host.locator('.gb-launch').waitFor({timeout:30000}).catch(async error=>{await mkdir(resolve(root,'test-artifacts'),{recursive:true});await host.screenshot({path:resolve(root,'test-artifacts/geoweb-desktop-failure.png')});console.error('GeoGame count',await host.locator('.geo-game').count(),'body',String(await host.locator('body').innerText()).slice(-1500));throw error;});await host.locator('.gb-launch').click();await host.getByRole('button',{name:'방 만들기'}).waitFor({timeout:15000});await host.getByRole('button',{name:'방 만들기'}).click();
 const heading=host.locator('.gb-heading small');await heading.waitFor();const code=(await heading.innerText()).match(/\d{6}/)?.[0];if(!code)throw Error('Room code missing');
 const one=await api('session',identity('테스트선수1','b'));const two=await api('session',identity('테스트선수2','c'));
 await api(`rooms/${code}/join`,{},one.token);await api(`rooms/${code}/join`,{},two.token);
 await api(`rooms/${code}/ready`,{ready:true},one.token);await api(`rooms/${code}/ready`,{ready:true},two.token);
 await host.getByRole('button',{name:/경기 시작/}).waitFor({timeout:15000});await host.getByRole('button',{name:/경기 시작/}).click();
 await host.getByText(/라운드 1/).waitFor({timeout:15000});
 await mkdir(resolve(root,'test-artifacts'),{recursive:true});await host.screenshot({path:resolve(root,'test-artifacts/geoweb-desktop.png')});
 const playerContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await playerContext.route('**/game-account.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.psBattleIdentity=async()=>(${JSON.stringify(identity('테스트선수1','b'))});`}));
 const player=await playerContext.newPage();await player.goto(`${site}?geoBattle=${code}`);await player.locator('.gb-question input').waitFor({timeout:60000});
 const view=await api(`rooms/${code}`,undefined,one.token);const corpus=JSON.parse(await readFile(resolve(root,'server/geoweb-battle/corpus.json')));const q=corpus[view.settings.difficulty].find(item=>item.id===view.question.id);
 await player.locator('.gb-question input').fill(q.answers[0]);await player.getByRole('button',{name:'정답 제출'}).click();await player.getByText(/정답!/).waitFor({timeout:15000});
 await player.screenshot({path:resolve(root,'test-artifacts/geoweb-mobile.png')});
 console.log(`GeoWeb battle UI passed in isolated memory room ${code}`);
}finally{await browser?.close();for(const child of children)child.kill();}
