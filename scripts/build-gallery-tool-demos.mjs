// Short feature excerpts, not recordings of scrolling a product's landing page.
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const raw='/Users/parcyun/Downloads/Codex/Artifacts/2026-10-29/service-recordings-five';
const output=fileURLToPath(new URL('../public/videos/gallery/',import.meta.url));
const demos=[{
 id:'zoomit',kind:'official-feature-demo',url:'https://learn.microsoft.com/en-us/sysinternals/downloads/zoomit',
 attribution:'Microsoft Sysinternals / Mark Russinovich — official ZoomIt demonstration embedded on Microsoft Learn.',
 scenes:[['화면 확대','zoomit-official.mp4',.2],['도형과 주석','zoomit-official.mp4',3.2],['화면 위 텍스트 입력','zoomit-official.mp4',7],['화면 녹화와 재생','zoomit-official.mp4',10.2],['발표용 카운트다운','zoomit-official.mp4',13.5]]
},{
 id:'snipaste',kind:'feature-demo',url:'https://www.appinn.com/snipaste/',
 attribution:'Snipaste author feature demonstrations, reproduced by Appinn (2016-07-29); source GIFs linked in CREDITS.md. No landing-page scrolling or simulated UI.',
 scenes:[['영역 감지와 캡처','snipaste-snip.gif',.8],['캡처 위 도형 주석','snipaste-snip.gif',10.5],['이미지를 화면에 고정','snipaste-paste.gif',.5],['고정 이미지 크기 조절','snipaste-paste.gif',7],['고정 이미지 투명도 조절','snipaste-paste.gif',14]]
}];
for(const demo of demos){
 const scenes=[];const clips=[];
 for(const [i,[label,file,start]] of demo.scenes.entries()){
  const source=`${raw}/demos/${file}`,clip=`${raw}/${demo.id}-scene-${i}.mp4`;
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-ss',String(start),'-t','2','-vf','scale=960:600:force_original_aspect_ratio=decrease,pad=960:600:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30','-an','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p',clip]);
  clips.push(clip);scenes.push({label,duration:2,source,sourceStart:start});
 }
 const list=`${raw}/${demo.id}-concat.txt`;await writeFile(list,clips.map(p=>`file '${p}'`).join('\n'));
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',`${output}${demo.id}.mp4`]);
 await writeFile(`${raw}/${demo.id}.json`,JSON.stringify({...demo,source:scenes[0].source,scenes},null,2));
 console.log('FEATURE DEMO',demo.id);
}
