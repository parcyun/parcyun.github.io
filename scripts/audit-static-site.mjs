// Read-only route/metadata/link audit. HTTP reads do not execute visitor counters.
import {readdir,readFile,stat} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
const root=resolve('dist'),origin='https://parcyun.github.io';
const live=process.argv.includes('--live');
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(path));else if(path.endsWith('.html'))files.push(path);}return files;}
const decode=text=>text.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3]??m[4]??'')]));}
const files=await walk(root),pages=[];
const xml=await readFile(join(root,'sitemap.xml'),'utf8');
const sitemap=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m=>decode(m[1].match(/<loc>(.*?)<\/loc>/)?.[1]||''));
const robots=await readFile(join(root,'robots.txt'),'utf8');
const disallowed=[...robots.matchAll(/^Disallow:\s*(\S+)/gmi)].map(m=>m[1]);
for(const file of files){
 const html=await readFile(file,'utf8'),pathname='/'+relative(root,file).replaceAll('\\','/').replace(/index\.html$/,'');
 const tags=[...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(m=>attrs(m[0]));
 const canonical=tags.find(t=>t.rel==='canonical')?.href||null;
 const directives=tags.filter(t=>(t.name||'').toLowerCase()==='robots').map(t=>t.content||'').join(',').toLowerCase();
 const body=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const links=[...body.matchAll(/<a\b[^>]*>/gi)].map(m=>attrs(m[0]).href).filter(Boolean);
 const metaRefresh=tags.find(t=>(t['http-equiv']||'').toLowerCase()==='refresh')?.content||null;
 pages.push({path:pathname,file:relative(root,file),title:decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').trim(),description:tags.find(t=>t.name==='description')?.content||null,canonical,robots:directives,blocked:disallowed.some(p=>pathname.startsWith(p)),redirect:metaRefresh,listed:sitemap.includes(origin+pathname),ids:new Set([...body.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1])),links});
}
const byPath=new Map(pages.map(p=>[p.path,p]));
const brokenLinks=[],missingFragments=[],missingAssets=[];
for(const page of pages){
 for(const href of page.links){let url;try{url=new URL(href,origin+page.path);}catch{continue;}if(url.origin!==origin||!['https:','http:'].includes(url.protocol))continue;
  const path=decodeURIComponent(url.pathname),target=byPath.get(path)||byPath.get(path.replace(/\/$/,'')+'/');
  let exists=!!target;try{if(!exists)exists=(await stat(join(root,path))).isFile();}catch{}
  if(!exists)brokenLinks.push({from:page.path,to:url.pathname+url.search+url.hash});
  else if(target&&url.hash&&!target.ids.has(decodeURIComponent(url.hash.slice(1))))missingFragments.push({from:page.path,to:url.pathname+url.hash});
 }
 const html=await readFile(join(root,page.file),'utf8');
 for(const m of html.matchAll(/<(?:img|script|source|link)\b[^>]*>/gi)){
  const a=attrs(m[0]);const ref=a.src||(['stylesheet','icon','preload'].includes(a.rel)?a.href:null);if(!ref||ref.startsWith('data:'))continue;
  let url;try{url=new URL(ref,origin+page.path);}catch{continue;}if(url.origin!==origin)continue;
  try{await stat(join(root,decodeURIComponent(url.pathname)));}catch{missingAssets.push({from:page.path,to:url.pathname});}
 }
}
const canonicalGroups=new Map();for(const p of pages){if(p.canonical){const group=canonicalGroups.get(p.canonical)||[];group.push(p.path);canonicalGroups.set(p.canonical,group);}}
const sitemapChecks=sitemap.map(url=>{let path;try{path=new URL(url).pathname;}catch{return {url,error:'invalid URL'};}const p=byPath.get(path);return {url,exists:!!p,canonical:p?.canonical,canonicalMatches:p?.canonical===url,noindex:p?.robots.includes('noindex')||false,blocked:p?.blocked||false};});
const http=[];
if(live){
 const urls=[origin+'/sitemap.xml',origin+'/robots.txt',...pages.map(p=>origin+p.path)];
 let next=0;await Promise.all(Array.from({length:6},async()=>{while(next<urls.length){const url=urls[next++];try{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});await response.arrayBuffer();http.push({url,status:response.status,finalUrl:response.url,contentType:response.headers.get('content-type'),xRobots:response.headers.get('x-robots-tag')});}catch(error){http.push({url,error:error.message});}}}));
}
const summarize=p=>({path:p.path,title:p.title,canonical:p.canonical,description:!!p.description,robots:p.robots,blocked:p.blocked,redirect:p.redirect,listed:p.listed});
console.log(JSON.stringify({checkedAt:new Date().toISOString(),scope:'Built HTML, sitemap, robots, static links/assets; optional public HTTP GET. No JS app flow or authenticated state.',counts:{html:pages.length,sitemap:sitemap.length},pages:pages.map(summarize),sitemapChecks,notListed:pages.filter(p=>!p.listed).map(summarize),missingCanonical:pages.filter(p=>!p.canonical).map(p=>p.path),missingDescription:pages.filter(p=>!p.description).map(p=>p.path),duplicateTitles:[...Map.groupBy(pages,p=>p.title)].filter(([title,rows])=>title&&rows.length>1).map(([title,rows])=>({title,paths:rows.map(p=>p.path)})),duplicateCanonicals:[...canonicalGroups].filter(([,paths])=>paths.length>1).map(([url,paths])=>({url,paths})),brokenLinks,missingFragments,missingAssets,http:http.sort((a,b)=>a.url.localeCompare(b.url))},null,2));
