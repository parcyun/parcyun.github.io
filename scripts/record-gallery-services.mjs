// Real browser screen recordings. Never synthesize motion from still images.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resources} from '../src/data/resources.ts';
const require=createRequire(import.meta.url);
const modulePath=process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(modulePath);
const rawDir='/Users/parcyun/Downloads/Codex/Artifacts/2026-10-29/service-recordings-five';
await mkdir(rawDir,{recursive:true});
const output=fileURLToPath(new URL('../public/videos/gallery/',import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:process.env.RECORD_HEADED!=='1'});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:rawDir,size:{width:1280,height:800}},locale:'ko-KR',reducedMotion:'no-preference',acceptDownloads:true});
const pinned=[{id:'home-works',url:'/'},{id:'home-academica',url:'/academica/'},{id:'home-atlas',url:'/atlas-gears/'}];
const selected=process.argv.slice(2);
const entries=[...pinned,...resources].filter(r=>!['zoomit','snipaste'].includes(r.id)&&(!selected.length||selected.includes(r.id)));
async function settle(page){await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(700)}
async function run(entry){
 const began=performance.now();const page=await context.newPage();const scenes=[];
 async function scene(label,action){const start=(performance.now()-began)/1000;await action();const elapsed=(performance.now()-began)/1000-start;await page.waitForTimeout(Math.max(0,2100-elapsed*1000));scenes.push({label,start,duration:2})}
 try{
  await page.goto(new URL(entry.url,'https://parcyun.github.io/').href,{waitUntil:'domcontentloaded',timeout:45000});await settle(page);
  const intro=page.getByRole('button',{name:'시작하기',exact:true});if(await intro.isVisible())await intro.click();
  if(entry.id==='spell-drill'){
   await page.getByRole('button',{name:/START DRILL/i}).click();await settle(page);
   for(const label of ['정답 입력과 점수 이펙트','연속 정답과 콤보']){
    const answer=await page.evaluate(()=>state.current.correct);
    await scene(label,async()=>{await page.locator('#q-input').pressSequentially(answer,{delay:18});await page.locator('#q-input').press('Enter')});
   }
   await page.locator('#quit-btn').click();await settle(page);
   await scene('전체 플레이어 랭킹 열기',()=>page.getByRole('button',{name:'★ Ranking',exact:true}).click());
   await scene('랭킹 난이도 선택',()=>page.locator('.ranking-sheet').getByRole('button',{name:'중급',exact:true}).click());
   await page.getByRole('button',{name:'랭킹 닫기',exact:true}).click();
   await page.locator('#result').getByRole('button',{name:'홈',exact:true}).click();
   await scene('한국어에서 영어로 언어 전환',()=>page.locator('#lang-toggle').getByRole('button',{name:'EN',exact:true}).click());
  }else if(entry.id==='world-map'){
   await scene('평면에서 지구본으로 전환',()=>page.getByRole('button',{name:'지구본',exact:true}).click());
   await scene('기후대 켜기와 지도 표시',()=>page.getByRole('checkbox',{name:'세계의 기후',exact:true}).check());
   await scene('지구본 회전',async()=>{await page.mouse.move(700,390);await page.mouse.down();await page.mouse.move(860,450,{steps:22});await page.mouse.up()});
   await scene('확대하며 지형 탐색',()=>page.getByRole('button',{name:'확대',exact:true}).click());
   await scene('게임 모드 진입',()=>page.getByRole('button',{name:'게임 모드',exact:true}).click());
  }else if(entry.id==='home-atlas'){
   await page.locator('#browse').scrollIntoViewIfNeeded();await settle(page);
   await scene('게임 카테고리 필터',()=>page.getByRole('button',{name:'게임',exact:true}).click());
   await page.getByRole('button',{name:'전체',exact:true}).click();
   await scene('활동 자료 검색',()=>page.getByRole('searchbox').fill('지도'));
   await scene('검색 결과 미리보기',()=>page.locator('#browse a').first().hover());
   await page.getByRole('searchbox').fill('');
   await scene('수업 준비 카테고리',()=>page.getByRole('button',{name:'수업준비',exact:true}).click());
   await scene('수업 자료 탐색',()=>page.mouse.wheel(0,450));
  }else if(entry.id==='home-academica'){
   await page.locator('#shelf').scrollIntoViewIfNeeded();await settle(page);
   await scene('강의 카드 내용 미리보기',()=>page.getByRole('link',{name:/LLM 이해하기/}).hover());
   await scene('실습 가이드 미리보기',()=>page.getByRole('link',{name:/Agentic AI with LLM/}).hover());
   await scene('Notion 가이드 미리보기',()=>page.getByRole('link',{name:/Notion 온보딩/}).hover());
   await scene('강의 목록 탐색',()=>page.mouse.wheel(0,480));
   await scene('강의 목록 되돌아보기',()=>page.mouse.wheel(0,-280));
  }else if(entry.id==='home-works'){
   await page.screenshot({path:`${output}../../images/resource-previews/gallery-home-works-0.png`});
   await scene('스튜디오 홈 소개',()=>page.mouse.move(600,300));
   await scene('경력 섹션으로 스크롤 이동',()=>page.getByRole('button',{name:'다음 섹션',exact:true}).click());
   await scene('주요 경력 펼쳐보기',()=>page.locator('.career-toggle').click());
   await scene('자료실로 스크롤 이동',()=>page.getByRole('button',{name:'다음 섹션',exact:true}).click());
   await scene('교육 자료 목록 탐색',()=>page.mouse.wheel(0,480));
  }else if(entry.id==='math-volume'){
   await scene('교사용 정답 숨기기',()=>page.getByRole('button',{name:'교사용 정답 숨기기',exact:true}).click());
   await scene('활동 단계 탐색',()=>page.mouse.wheel(0,620));
   await scene('곱셈으로 부피 확인',()=>page.mouse.wheel(0,620));
   await scene('역추리 활동 탐색',()=>page.mouse.wheel(0,620));
   await scene('검수 미션 탐색',()=>page.mouse.wheel(0,620));
  }else if(entry.id==='edubeige'){
   await scene('과목별 에듀테크 탐색',()=>page.getByRole('link',{name:'수학 수학',exact:true}).click());await settle(page);
   await scene('도구 목록 스크롤',()=>page.mouse.wheel(0,600));
   await scene('도구 사례 더 보기',()=>page.mouse.wheel(0,550));
   await scene('수학 도구 비교',()=>page.mouse.wheel(0,550));
   await scene('관심 도구 다시 보기',()=>page.mouse.wheel(0,-450));
  }else if(entry.id==='academica'){
   await scene('온라인 연수 아카이브 소개',()=>page.mouse.move(640,320));
   await scene('녹화본 목록으로 이동',()=>page.locator('.video-card').scrollIntoViewIfNeeded());
   await scene('연수 영상 카드 미리보기',()=>page.locator('.video-card').hover());
   await scene('연수 안내 내용 살펴보기',async()=>{await page.mouse.move(640,400);await page.mouse.wheel(0,240)});
   await scene('아카이브 소개로 돌아가기',()=>page.mouse.wheel(0,-700));
  }else{
   if(new URL(page.url()).hostname.endsWith('notion.site'))await page.locator('h1:visible,[role="heading"]:visible').first().waitFor({timeout:20000});
   await page.mouse.move(640,450);
   for(const [i,distance] of [380,480,520,550,-400].entries())await scene(`자료 주요 내용 탐색 ${i+1}`,()=>page.mouse.wheel(0,distance));
  }
  const ended=(performance.now()-began)/1000;const video=page.video();await page.close();const source=await video.path();
  const length=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',source],{encoding:'utf8'}));
  const offset=Math.max(0,ended-length);
  const clips=[];
  for(const [i,s] of scenes.entries()){
   const start=Math.max(0,s.start-offset-.1),clip=`${rawDir}/${entry.id}-scene-${i}.mp4`;
   execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-ss',String(start),'-t','2','-vf','scale=960:600:force_original_aspect_ratio=decrease,pad=960:600:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30','-an','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p',clip]);clips.push(clip);s.sourceStart=start;
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
