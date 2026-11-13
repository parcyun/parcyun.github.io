// Public Wikipedia/Wikidata names and Commons license metadata; cached, reproducible requests.
import fs from 'node:fs/promises';import crypto from 'node:crypto';
const root=process.env.GEOWEB_SOURCE_CACHE||'node_modules/.cache/geoweb-catalog';await fs.mkdir(root,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function api(host,args){const url=`https://${host}/w/api.php?${new URLSearchParams({format:'json',...args})}`,file=`${root}/${crypto.createHash('sha256').update(url).digest('hex')}.json`;try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{}
 for(let attempt=0;attempt<4;attempt++){try{const r=await fetch(url,{headers:{'User-Agent':'GeoWebEducationalCatalog/1.0 (https://parcyun.github.io/world-map/)'},signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(String(r.status));const j=await r.json();if(j.error)throw Error(JSON.stringify(j.error));await fs.writeFile(file,JSON.stringify(j));await sleep(250);return j;}catch(e){if(attempt===3)throw e;await sleep(1500*(attempt+1));}}
}
export const plain=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#\d+;/g,'').trim();
