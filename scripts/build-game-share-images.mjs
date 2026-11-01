import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'/Users/parcyun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const directory=new URL('../public/images/og/',import.meta.url);await mkdir(directory,{recursive:true});
const avatar=(await readFile(new URL('../public/images/game-intro-dexter.webp',import.meta.url))).toString('base64');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
try{
 for(const [id,logo,label,description] of [
  ['spell-drill','스펠 <span>드릴</span>','SPELL DRILL','한글 맞춤법 · 영어 문법 게임'],
  ['geoweb','<span style="font:300 80px/1.1 Montserrat,sans-serif;letter-spacing:-.01em;color:#fff;-webkit-text-stroke:0">GeoWeb</span>','지오웹 · GeoWeb','세계지도 · 기후 · 지형 · 지리 퀴즈']
 ]){
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;900&family=Covered+By+Your+Grace&display=swap"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"><style>*{box-sizing:border-box}body{margin:0;background:#000;color:#ffb11a;width:1200px;height:630px;display:grid;place-items:center;font-family:Pretendard,sans-serif}.lockup{text-align:center;width:630px}img{display:block;width:112px;height:112px;border-radius:50%;border:2px solid #ffb11a;padding:5px;background:#fff;margin:0 auto 18px}.label{font:400 15px Montserrat,Pretendard,sans-serif;letter-spacing:.12em;color:#aaa;margin:0 0 14px}h1{font:900 80px/1.1 Montserrat,Pretendard,sans-serif;letter-spacing:-.05em;margin:0 0 22px}h1 span{color:transparent;-webkit-text-stroke:1.5px #ffb11a}.description{color:#ddd;font-size:24px;margin:0 0 24px}.studio{font:38px/1.2 'Covered By Your Grace',cursive;margin:0}footer{position:absolute;bottom:24px;width:100%;text-align:center;color:#777;font-size:12px}footer b{font-weight:400;color:#aaa}</style></head><body><main class="lockup"><img src="data:image/webp;base64,${avatar}" alt="Dexter"><p class="label">${label}</p><h1>${logo}</h1><p class="description">${description}</p><p class="studio">parcyun studio</p></main><footer>Designed by <b>parcyun studio</b> · @parcyun</footer></body></html>`,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});
  const path=fileURLToPath(new URL(`${id}-20261101${id==='geoweb'?'-v3':''}.png`,directory));await page.screenshot({path});
  const crop=await sharp(path).extract({left:550,top:135,width:100,height:100}).toBuffer();
  const pixels=await sharp(crop).stats();assert.ok(pixels.channels[0].mean>50,'avatar painted in the actual cover');await page.close();
  console.log(`Generated ${id}: 1200×630`);
 }
}finally{await browser.close()}
