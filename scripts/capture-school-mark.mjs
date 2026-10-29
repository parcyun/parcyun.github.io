/** Download first; capture only the rendered, explicitly labelled official 교표. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import sharp from 'sharp';

export async function saveSchoolMark({page,school,outputDir,forceCapture=false}) {
  if(!/^[A-Z][0-9]{2}:[0-9]+$/.test(school.id))throw Error('Invalid school ID');
  const title=await page.title();
  if(!title.includes(school.name)||!/학교상징|학교 상징|교표/.test(title))throw Error('학교명과 학교상징 페이지를 확인할 수 없습니다.');
  const mark=page.locator('img');
  const labelled=await mark.evaluateAll(images=>images.map((img,index)=>({index,alt:img.alt})).filter(x=>/교표|학교마크|심볼마크/.test(x.alt)));
  if(labelled.length!==1)throw Error('교표 이미지가 하나로 확인되지 않습니다. 개별 확인이 필요합니다.');
  const element=mark.nth(labelled[0].index);
  await element.scrollIntoViewIfNeeded();
  await element.evaluate(async img=>{await img.decode();if(!img.complete||img.naturalWidth<20||img.naturalHeight<20)throw Error('교표 이미지가 표시되지 않습니다.');});
  const source=await element.evaluate(img=>img.currentSrc||img.src);let bytes,acquisition='download';
  if(!forceCapture){try{const url=new URL(source,page.url());const response=await page.request.get(url.href,{headers:{Referer:page.url()},timeout:10000});if(!response.ok())throw Error('Original unavailable');bytes=await response.body();await sharp(bytes).metadata();}catch{bytes=null;}}
  if(!bytes){bytes=await element.screenshot({animations:'disabled',type:'png',scale:'css'});acquisition='capture';}
  const file=school.id.replace(':','-')+'.webp';
  const optimized=await sharp(bytes).rotate().resize({width:160,height:160,fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:5}).toBuffer();
  await fs.mkdir(outputDir,{recursive:true});await fs.writeFile(path.join(outputDir,file),optimized);
  return {status:'ready',file,page:page.url(),source:new URL(source,page.url()).href,kind:'emblem',label:labelled[0].alt,acquisition,verification:'official-school-symbol-page',bytes:optimized.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [jobFile,playwrightModule]=process.argv.slice(2);
  if(!jobFile||!playwrightModule)throw Error('Usage: node scripts/capture-school-mark.mjs <verified-jobs.json> <path-to-playwright-index.mjs>');
  const {chromium}=await import(pathToFileURL(path.resolve(playwrightModule)).href);
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const outputDir=path.join(root,'public/school-marks');
  const results=[];
  try{for(const job of JSON.parse(await fs.readFile(jobFile,'utf8'))){const page=await browser.newPage({deviceScaleFactor:2,viewport:{width:1280,height:1000}});try{await page.goto(job.page,{waitUntil:'domcontentloaded',timeout:30000});results.push({id:job.school.id,...await saveSchoolMark({page,school:job.school,outputDir})});}catch(error){results.push({id:job.school.id,status:'capture-unavailable',reason:error.message});}finally{await page.close();}}}finally{await browser.close();}
  await fs.writeFile(jobFile+'.results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}
