import {readdir,mkdir,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../public/images/resource-previews/',import.meta.url);
const output=new URL('../public/videos/gallery/',import.meta.url);await mkdir(output,{recursive:true});
const files=(await readdir(root)).filter(f=>/^gallery-.+-0\.png$/.test(f));
async function encode(file){
 const id=file.slice(8,-6),a=new URL(file,root),candidate=new URL(`gallery-${id}-1.png`,root);
 let b=candidate;try{await access(b)}catch{b=a}
 const fit='scale=768:480:force_original_aspect_ratio=decrease,pad=768:480:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=24,format=yuv420p';
 const filter=`[0:v]${fit},split[a0][a1];[1:v]${fit}[b];[a0][b]xfade=transition=fade:duration=0.3:offset=0.65[first];[first][a1]xfade=transition=fade:duration=0.35:offset=1.65[out]`;
 await new Promise((resolve,reject)=>{const p=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-i',fileURLToPath(a),'-loop','1','-i',fileURLToPath(b),'-filter_complex',filter,'-map','[out]','-t','2','-an','-c:v','libx264','-preset','fast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',fileURLToPath(new URL(`${id}.mp4`,output))]);let error='';p.stderr.on('data',d=>error+=d);p.on('exit',code=>code===0?resolve():reject(new Error(error)));p.on('error',reject)});
 console.log('Built',id);
}
for(let i=0;i<files.length;i+=2)await Promise.all(files.slice(i,i+2).map(encode));
