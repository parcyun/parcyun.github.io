import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const raw='/Users/parcyun/Downloads/Codex/Artifacts/2026-10-29/service-recordings-five/';
const manifest={};
for(const file of (await readdir(raw)).filter(f=>f.endsWith('.json'))){
 const receipt=JSON.parse(await readFile(raw+file,'utf8'));
 if(!['real-browser-recording','official-feature-demo','feature-demo'].includes(receipt.kind))continue;
 await stat(receipt.source);
 const path=fileURLToPath(new URL(`../public/videos/gallery/${receipt.id}.mp4`,import.meta.url));
 const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',path],{encoding:'utf8'}));
 if(receipt.scenes.length!==5||receipt.scenes.some(s=>s.duration!==2)||Math.abs(duration-10)>.1)throw new Error(`Invalid duration: ${receipt.id}`);
 manifest[receipt.id]={kind:receipt.kind,url:receipt.url,...(receipt.attribution?{attribution:receipt.attribution}:{}),scenes:receipt.scenes.map(({label,duration})=>({label,duration})),duration};
}
if(Object.keys(manifest).length!==18)throw new Error('Record all 18 cards before publishing the manifest.');
await writeFile(new URL('../public/videos/gallery/recordings.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(`${Object.keys(manifest).length}/18 five-scene previews packaged.`);
