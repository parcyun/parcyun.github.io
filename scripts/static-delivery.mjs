import {readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import {join,relative,sep} from 'node:path';import {createHash} from 'node:crypto';
export const localBattle=()=>process.env.GEOWEB_LOCAL_BATTLE==='1'&&!process.env.CI&&!process.env.K_SERVICE;
export async function prepareStaticDelivery(directory){
 const root=typeof directory==='string'?directory:fileURLToPath(directory);
 if(!localBattle())for(const route of ['dev','battle'])await rm(join(root,'world-map',route),{recursive:true,force:true});
 const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else files.push(path);}}await walk(root);
 const revisions={};
 for(const file of files){const path='/'+relative(root,file).split(sep).join('/');
   if(/\.html$/.test(path)&&!localBattle()){const html=await readFile(file,'utf8');await writeFile(file,html.replace('</head>','<script src="/static-cache.js?v=20261102-1" defer></script></head>'));}
   if(!/\.(?:js|css|json|png|jpe?g|webp|svg|woff2?|mp4|webm)$/.test(path)||path.includes('/world-map/dev/')||path.includes('/world-map/battle/')||path==='/static-cache-sw.js')continue;
   revisions[path]=createHash('sha256').update(await readFile(file)).digest('hex').slice(0,16);
 }
 const worker=await readFile(new URL('./static-cache-worker.js',import.meta.url),'utf8');
 await writeFile(join(root,'static-cache-sw.js'),`const REVISIONS=${JSON.stringify(revisions)};\n${worker}`);
}
export default function staticDelivery(){return{name:'ps-static-delivery',hooks:{'astro:build:done':async({dir})=>prepareStaticDelivery(dir)}};}
