import {useEffect,useState,useRef} from 'react';
import {resources} from '../data/resources';
import {loadResourceViewTotals,recordResourceView} from '../lib/resourceViews';
const pinned=[{id:'home-works',title:'parcyun studio',desc:'만들고 실험한 웹서비스',url:'/works/',visitPath:'/works/'},{id:'home-academica',title:'ACADEMICA',desc:'교육 · AI · 디자인 강의 자료',url:'/academica/',visitPath:'/academica/'},{id:'home-atlas',title:'ATLAS GEARS',desc:'교실에서 바로 쓰는 활동 도구',url:'/atlas-gears/',visitPath:'/atlas-gears/'}];
function Preview({id}:{id:string}){
  const [active,setActive]=useState(false),[loaded,setLoaded]=useState(false),[playing,setPlaying]=useState(false);
  const video=useRef<HTMLVideoElement>(null),host=useRef<HTMLDivElement>(null);
  const enter=()=>{if(!matchMedia('(prefers-reduced-motion:reduce)').matches){setLoaded(true);setActive(true)}};
  useEffect(()=>{const link=host.current?.closest('a');const leave=()=>setActive(false);link?.addEventListener('focus',enter);link?.addEventListener('blur',leave);const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)leave()});if(host.current)observer.observe(host.current);return()=>{link?.removeEventListener('focus',enter);link?.removeEventListener('blur',leave);observer.disconnect()}},[]);
  useEffect(()=>{const player=video.current;if(!player)return;const sync=()=>{if(active&&!document.hidden)void player.play().catch(()=>setPlaying(false));else{player.pause();player.currentTime=0;setPlaying(false)}};sync();document.addEventListener('visibilitychange',sync);return()=>{document.removeEventListener('visibilitychange',sync);player.pause()}},[active,loaded]);
  return <div ref={host} className={`experience-image ${active&&playing?'preview-playing':''}`} onMouseEnter={enter} onMouseLeave={()=>setActive(false)}>
    <img className="visible" src={`/images/resource-previews/gallery-${id}-0.png`} alt="" loading="lazy"/>
    {loaded&&<video ref={video} src={`/videos/gallery/${id}.mp4?v=20261029`} muted loop playsInline preload="none" aria-hidden="true" onPlaying={()=>setPlaying(true)} onError={()=>setPlaying(false)}/>}
  </div>;
}
export default function HomeCollections(){
  const [views,setViews]=useState<Record<string,number>>({});
  const [ready,setReady]=useState(false);
  useEffect(()=>{let active=true;loadResourceViewTotals([...resources,...pinned]).then(v=>{if(active){setViews(v);setReady(true)}}).catch(()=>{});return()=>{active=false}},[]);
  const view=(id:string)=><p className="experience-views">{ready?`${(views[id]||0).toLocaleString()} views`:'— views'}</p>;
  return <div className="experience-grid">
    {pinned.map(r=><a className="experience-card pinned" href={r.url} key={r.id} aria-label={r.title}><Preview id={r.id}/><h3>{r.title}</h3><p>{r.desc}</p>{view(r.id)}</a>)}
    {resources.map((r,i)=>({r,i})).sort((a,b)=>(views[b.r.id]||0)-(views[a.r.id]||0)||a.i-b.i).map(({r})=><a key={r.id} className="experience-card" aria-label={r.title} href={r.url} target={r.external?'_blank':undefined} rel={r.external?'noopener noreferrer':undefined} onClick={()=>{void recordResourceView(r.id)}}><Preview id={r.id}/>{view(r.id)}</a>)}
  </div>;
}
