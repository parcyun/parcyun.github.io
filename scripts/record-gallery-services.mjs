// Real browser screen recordings. Never synthesize motion from still images.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resources} from '../src/data/resources.ts';
const require=createRequire(import.meta.url);
const modulePath=process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(modulePath);
const rawDir='/Users/parcyun/Downloads/Codex/Artifacts/2026-10-29/service-recordings';
await mkdir(rawDir,{recursive:true});
const output=fileURLToPath(new URL('../public/videos/gallery/',import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:process.env.RECORD_HEADED!=='1'});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:rawDir,size:{width:1280,height:800}},locale:'ko-KR',reducedMotion:'no-preference',acceptDownloads:true});
const pinned=[{id:'home-works',url:'/works/'},{id:'home-academica',url:'/academica/'},{id:'home-atlas',url:'/atlas-gears/'}];
const selected=process.argv.slice(2);
const entries=[...pinned,...resources].filter(r=>!selected.length||selected.includes(r.id));
async function settle(page){await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(700)}
async function run(entry){
 const began=performance.now();const page=await context.newPage();const scenes=[];
 async function scene(label,action){const start=(performance.now()-began)/1000;await action();await page.waitForTimeout(1850);scenes.push({label,start,duration:1.8})}
 try{
  await page.goto(new URL(entry.url,'https://parcyun.github.io/').href,{waitUntil:'domcontentloaded',timeout:45000});await settle(page);
  const intro=page.getByRole('button',{name:'시작하기',exact:true});if(await intro.isVisible())await intro.click();
  if(entry.id==='spell-drill'){
   await page.getByRole('button',{name:/START DRILL/i}).click();await settle(page);
   const question=(await page.locator('#q-wrong').count())?await page.locator('#q-wrong').innerText():'';
   await scene('힌트 확인 및 입력 포커스',async()=>{await page.getByRole('button',{name:/힌트/}).click()});
   await scene('패스와 다음 문항 전환',async()=>{await page.getByRole('button',{name:/패스/}).click()});
  }else if(entry.id==='world-map'){
   await scene('평면에서 지구본으로 전환',()=>page.getByRole('button',{name:'지구본',exact:true}).click());
   await scene('기후대 켜기와 지도 표시',()=>page.getByRole('checkbox',{name:'세계의 기후',exact:true}).check());
  }else if(entry.id==='home-atlas'){
   await page.locator('#browse').scrollIntoViewIfNeeded();await settle(page);
   await scene('게임 카테고리 필터',()=>page.getByRole('button',{name:'게임',exact:true}).click());
   await page.getByRole('button',{name:'전체',exact:true}).click();
   await scene('활동 자료 검색',()=>page.getByRole('searchbox').fill('지도'));
  }else if(entry.id==='home-academica'){
   await page.locator('#shelf').scrollIntoViewIfNeeded();await settle(page);
   await scene('강의 카드 내용 미리보기',()=>page.getByRole('link',{name:/LLM 이해하기/}).hover());
   await scene('실습 가이드 미리보기',()=>page.getByRole('link',{name:/Agentic AI with LLM/}).hover());
  }else if(entry.id==='home-works'){
   await page.locator('#works').scrollIntoViewIfNeeded();await settle(page);
   await scene('프로젝트 Live 필터',()=>page.locator('#works').getByRole('button',{name:'Live',exact:true}).click());
   await scene('포트폴리오 내용 미리보기',()=>page.locator('#works').getByRole('link').first().hover());
  }else if(entry.id==='math-volume'){
   await scene('교사용 정답 숨기기',()=>page.getByRole('button',{name:'교사용 정답 숨기기',exact:true}).click());
   await scene('활동 단계 탐색',()=>page.mouse.wheel(0,620));
  }else if(entry.id==='edubeige'){
   await scene('과목별 에듀테크 탐색',()=>page.getByRole('link',{name:'수학 수학',exact:true}).click());await settle(page);
   await scene('도구 목록 스크롤',()=>page.mouse.wheel(0,600));
  }else{
   if(new URL(page.url()).hostname.endsWith('notion.site'))await page.locator('h1:visible,[role="heading"]:visible').first().waitFor({timeout:20000});
   await scene('주요 내용 실제 스크롤',()=>page.mouse.wheel(0,580));
   await scene('다음 내용 탐색',()=>page.mouse.wheel(0,580));
  }
  const ended=(performance.now()-began)/1000;const video=page.video();await page.close();const source=await video.path();
  const length=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',source],{encoding:'utf8'}));
  const offset=Math.max(0,ended-length);
  const clips=[];
  for(const [i,s] of scenes.entries()){
   const start=Math.max(0,s.start-offset-.1),clip=`${rawDir}/${entry.id}-scene-${i}.mp4`;
   execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',source,'-t','1.8','-vf','scale=960:600:force_original_aspect_ratio=decrease,pad=960:600:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30','-an','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p',clip]);clips.push(clip);s.sourceStart=start;
  }
  const list=`${rawDir}/${entry.id}-concat.txt`;await writeFile(list,clips.map(p=>`file '${p}'`).join('\n'));
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',`${output}${entry.id}.mp4`]);
  await writeFile(`${rawDir}/${entry.id}.json`,JSON.stringify({id:entry.id,url:entry.url,source,kind:'real-browser-recording',scenes},null,2));
  console.log('RECORDED',entry.id);
 }catch(error){await page.screenshot({path:`${rawDir}/${entry.id}-failure.png`}).catch(()=>{});console.error('FAILED',entry.id,await page.title(),error.message);await page.close().catch(()=>{});process.exitCode=1}
}
for(const entry of entries)await run(entry);
await context.close();
await browser.close();
await import('./package-gallery-recordings.mjs');
