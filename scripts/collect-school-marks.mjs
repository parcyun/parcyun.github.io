/** Official-school marks only. Resumable; failed schools retain explicit status. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const captureJobs=new Map();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2];if(!input)throw Error('Usage: node scripts/collect-school-marks.mjs <official NEIS school rows JSON>');
const raw=JSON.parse(await fs.readFile(input,'utf8'));
const schools=raw.map(r=>({id:`${r.ATPT_OFCDC_SC_CODE}:${r.SD_SCHUL_CODE.trim()}`,name:r.SCHUL_NM,address:[r.ORG_RDNMA,r.ORG_RDNDA].filter(Boolean).join(' '),homepage:r.HMPG_ADRES&&r.HMPG_ADRES.replace(/^https?:\/\//,'').includes('.')?(/^https?:/.test(r.HMPG_ADRES)?r.HMPG_ADRES:'https://'+r.HMPG_ADRES):''}));
await fs.mkdir(path.join(root,'public/school-marks'),{recursive:true});
await fs.writeFile(path.join(root,'public/schools.json'),JSON.stringify(schools));
const manifestPath=path.join(root,'public/school-marks/manifest.json');
let manifest;try{manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));}catch{manifest={source:'NEIS school directory; images from official school homepages',updatedAt:'',schools:{}};}
const entities=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),entities(m[2])]));
const cookies=new Map();
async function get(url){let r;const signal=AbortSignal.timeout(10000);for(let hops=0;hops<8;hops++){const host=new URL(url).host;const jar=cookies.get(host)||new Map();r=await fetch(url,{redirect:'manual',signal,headers:{'User-Agent':'SchoolDirectoryMarks/1.0 (parcyun.github.io; public school identity cache)',...(jar.size?{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{})}});for(const raw of r.headers.getSetCookie()){const item=raw.split(';')[0],pos=item.indexOf('=');jar.set(item.slice(0,pos),item.slice(pos+1));}cookies.set(host,jar);if(r.status>=300&&r.status<400&&r.headers.get('location')){await r.body?.cancel();url=new URL(r.headers.get('location'),url).href;continue;}break;}if(!r.ok)throw Error(`HTTP ${r.status}`);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>6e6)throw Error('oversize');return {bytes,url:r.url,type:r.headers.get('content-type')||''};}
async function html(url){let r=await get(url);const start=r.bytes.subarray(0,3000).toString();let charset=(r.type.match(/charset=([^; ]+)/i)||start.match(/charset=["']?([^\s"'/>;]+)/i))?.[1]||'utf-8';try{return {text:new TextDecoder(charset).decode(r.bytes),url:r.url};}catch{return {text:r.bytes.toString(),url:r.url};}}
function candidates(text,url,school,symbol=false){return [...text.matchAll(/<img\b[^>]*>/gi)].flatMap(m=>{const a=attrs(m[0]),src=a.src||a['data-src'];if(!src||src.startsWith('data:'))return [];const label=[a.alt,a.id,a.class,src].join(' ');let score=0;const explicit=/교표|학교마크|학교로고|심볼마크/.test(a.alt||'')||/emblem|(?:^|[\/_-])logo(?:[\/_.-]|$)/i.test(src);if(!explicit)return [];if(/교표|학교마크|심볼마크/.test(a.alt||'')||/emblem/i.test(src))score+=12;if((a.alt||'').includes(school.name))score+=9;if(/logo/i.test(label))score+=4;if(symbol&&/교표|마크/i.test(a.alt||''))score+=10;if(/교육청|교육부|웹접근성|누리집|banner|copyright|footer|정부|태극|sns|facebook|youtube/i.test(label))score-=20;if(score<4)return [];try{return [{url:new URL(src,url).href,score,label:a.alt||'',page:url}];}catch{return [];}}).sort((a,b)=>b.score-a.score);}
async function collect(s){if(!/^https?:\/\/.+\./.test(s.homepage))return {status:'no-homepage'};let home;try{home=await html(s.homepage);}catch(e){if(s.homepage.startsWith('https://www.'))home=await html(s.homepage.replace(/^https:/,'http:'));else throw e;}for(let i=0;i<4;i++){const meta=home.text.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*url=([^"'<>\s]+)/i);const js=(home.text.length<2000||(!home.text.includes(s.name)&&home.text.length<20000))?home.text.match(/location(?:\.href)?\s*=\s*["']([^"'<>;]+)/i):null;const target=meta?.[1]||js?.[1];if(!target)break;const u=new URL(entities(target),home.url);if(!['http:','https:'].includes(u.protocol))break;home=await html(u.href);}if(!home.text.replace(/<[^>]*>/g,'').replace(/\s/g,'').includes(s.name.replace(/\s/g,''))&&!home.text.includes(s.name))return {status:'unconfirmed-school',page:home.url};let list=candidates(home.text,home.url,s);const symbolLink=[...home.text.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].find(m=>/학교상징|학교 상징|교표/.test(m[2].replace(/<[^>]*>/g,'')));if(symbolLink){const href=attrs(symbolLink[1]).href;try{const u=new URL(href,home.url);if(u.origin===new URL(home.url).origin){let detail=await html(u.href);list=[...candidates(detail.text,detail.url,s,true),...list].sort((a,b)=>b.score-a.score);}}catch{}}
for(const candidate of list.slice(0,3)){try{const u=new URL(candidate.url);const host=new URL(home.url).hostname;if(u.hostname!==host&&!u.hostname.endsWith('.'+host)&&!host.endsWith('.'+u.hostname))continue;const r=await get(u.href);const meta=await sharp(r.bytes).metadata();if((meta.width||0)<20||(meta.height||0)<20||meta.pages>1)continue;const filename=s.id.replace(':','-')+'.webp';const bytes=await sharp(r.bytes).rotate().resize({width:160,height:160,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:5}).toBuffer();await fs.writeFile(path.join(root,'public/school-marks',filename),bytes);captureJobs.delete(s.id);return {status:'ready',file:filename,source:u.href,page:candidate.page,acquisition:'download',label:candidate.label,kind:/교표|학교마크|심볼마크/.test(candidate.label)?'emblem':'official-logo',bytes:bytes.length};}catch{if(/교표|학교마크|심볼마크/.test(candidate.label)&&!captureJobs.has(s.id))captureJobs.set(s.id,{school:{id:s.id,name:s.name},page:candidate.page});}}
return {status:'not-found',page:home.url};}
let cursor=0,done=0;const pending=schools.filter(s=>!manifest.schools[s.id]||(process.env.RETRY_MISSING==='1'&&manifest.schools[s.id].status!=='ready'));
let flush=Promise.resolve();function checkpoint(){flush=flush.then(async()=>{manifest.updatedAt=new Date().toISOString();await fs.writeFile(manifestPath+'.tmp',JSON.stringify(manifest));await fs.rename(manifestPath+'.tmp',manifestPath);});return flush;}
await Promise.all(Array.from({length:64},async()=>{while(cursor<pending.length){const s=pending[cursor++];try{manifest.schools[s.id]=await collect(s);}catch(e){manifest.schools[s.id]={status:'unavailable',reason:String(e.message).slice(0,160)};}done++;if(done%100===0){await checkpoint();console.log(JSON.stringify({done,total:pending.length,ready:Object.values(manifest.schools).filter(v=>v.status==='ready').length}));}}}));await checkpoint();console.log('finished',JSON.stringify(Object.values(manifest.schools).reduce((r,x)=>(r[x.status]=(r[x.status]||0)+1,r),{})));

if(captureJobs.size){
 const queue=path.join(path.dirname(path.resolve(input)),'school-captures.pending.json');
 await fs.writeFile(queue,JSON.stringify([...captureJobs.values()],null,2));
 console.log('Capture queue',captureJobs.size,queue);
 if(process.env.SCHOOL_MARK_PLAYWRIGHT_MODULE){
  await promisify(execFile)(process.execPath,[path.join(root,'scripts/capture-school-mark.mjs'),queue,process.env.SCHOOL_MARK_PLAYWRIGHT_MODULE],{maxBuffer:10*1024*1024});
  for(const {id,...result} of JSON.parse(await fs.readFile(queue+'.results.json','utf8')))if(result.status==='ready')manifest.schools[id]=result;
  await checkpoint();
 }
}
