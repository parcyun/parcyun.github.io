// Read-only source retrieval. Output reviewed, attributable Commons metadata as JSON.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const seeds=JSON.parse(readFileSync(new URL(process.argv[2]||'./geogame-landmark-seeds.json',import.meta.url)));
const plain=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
async function api(host,args){
 const response=execFileSync('curl',['--fail','-sL',`https://${host}/w/api.php?${new URLSearchParams({action:'query',format:'json',...args})}`],{encoding:'utf8',maxBuffer:8e6});
 return Object.values(JSON.parse(response).query?.pages||{});
}
const result=[];
for(let offset=0;offset<seeds.length;offset+=20){
 const batch=seeds.slice(offset,offset+20);
 const pages=await api('en.wikipedia.org',{titles:batch.map(s=>s[2]).join('|'),redirects:'1',prop:'pageimages',piprop:'original'});
 const filenames=pages.filter(p=>p.original).map(p=>`File:${decodeURIComponent(new URL(p.original.source).pathname.split('/').at(-1))}`);
 await new Promise(r=>setTimeout(r,6000));
 const files=await api('commons.wikimedia.org',{titles:filenames.join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'960'});
 for(const [iso2,name,title] of batch){
 try{
 const page=pages.find(p=>p.title.toLowerCase()===title.toLowerCase());
 if(!page?.original)throw Error('No primary photograph');
 const filename=decodeURIComponent(new URL(page.original.source).pathname.split('/').at(-1));
 const file=files.find(f=>f.title.replaceAll('_',' ')===`File:${filename}`.replaceAll('_',' '));
 const info=file?.imageinfo?.[0],meta=info?.extmetadata;
 if(!meta?.LicenseShortName?.value||!info.thumburl)throw Error('No Commons license/thumbnail');
 const license=plain(meta.LicenseShortName.value);
 if(!/CC|Public domain/.test(license))throw Error(`Review license ${license}`);
 result.push({iso2,name,aliases:[title],image:info.thumburl,source:info.descriptionurl,author:plain(meta.Artist?.value),license,licenseUrl:meta.LicenseUrl?.value||'https://creativecommons.org/publicdomain/mark/1.0/'});
 }catch(error){result.push({iso2,name,error:error.message});}
 }
 await new Promise(r=>setTimeout(r,6000));
}
process.stdout.write(JSON.stringify(result,null,2));
