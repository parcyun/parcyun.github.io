import {useEffect,useState,useRef} from 'react';
import {resources} from '../data/resources';
import {loadResourceViewTotals,recordResourceView} from '../lib/resourceViews';
const pinned=[{id:'home-works',title:'parcyun studio',desc:'만들고 실험한 웹서비스',url:'/'},{id:'home-academica',title:'ACADEMICA',desc:'교육 · AI · 디자인 강의 자료',url:'/academica/'},{id:'home-atlas',title:'ATLAS GEARS',desc:'교실에서 바로 쓰는 활동 도구',url:'/atlas-gears/'}];
function Preview({id}:{id:string}){
  const [active,setActive]=useState(false),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
  const video=useRef<HTMLVideoElement>(null),host=useRef<HTMLDivElement>(null);
  const enter=()=>{if(!matchMedia('(prefers-reduced-motion:reduce)').matches){window.dispatchEvent(new CustomEvent('ps-gallery-preview',{detail:id}));setLoaded(true);setFailed(false);setActive(true)}};
  useEffect(()=>{const link=host.current?.closest('a');const leave=()=>setActive(false);const pointer=(event:PointerEvent)=>{if(event.pointerType!=='touch')enter()};const other=(event:Event)=>{if((event as CustomEvent).detail!==id)leave()};link?.addEventListener('pointerenter',pointer);link?.addEventListener('pointerleave',leave);link?.addEventListener('focus',enter);link?.addEventListener('blur',leave);window.addEventListener('ps-gallery-preview',other);const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){if(!matchMedia('(prefers-reduced-motion:reduce)').matches)setLoaded(true)}else leave()},{rootMargin:'240px'});if(host.current)observer.observe(host.current);if(link?.matches(':hover')&&matchMedia('(hover:hover)').matches)enter();return()=>{link?.removeEventListener('pointerenter',pointer);link?.removeEventListener('pointerleave',leave);link?.removeEventListener('focus',enter);link?.removeEventListener('blur',leave);window.removeEventListener('ps-gallery-preview',other);observer.disconnect()}},[]);
  useEffect(()=>{const player=video.current;if(!player)return;const sync=()=>{if(active&&!document.hidden)void player.play().catch(()=>setFailed(true));else{player.pause();player.currentTime=0}};sync();document.addEventListener('visibilitychange',sync);return()=>{document.removeEventListener('visibilitychange',sync);player.pause()}},[active,loaded]);
  return <div ref={host} className={`experience-image ${active&&!failed?'preview-playing':''}`}>
    <img className="visible" src={`/images/resource-previews/gallery-${id}-0.png`} alt="" loading="lazy"/>
    {loaded&&<video ref={video} src={`/videos/gallery/${id}.mp4?v=20261029-five-scenes`} muted loop playsInline preload="auto" aria-hidden="true" onError={()=>setFailed(true)}/>}
  </div>;
}
export default function HomeCollections(){
  const [views,setViews]=useState<Record<string,number>>({});
  const [ready,setReady]=useState(false);
  useEffect(()=>{let active=true;loadResourceViewTotals(resources).then(v=>{if(active){setViews(v);setReady(true)}}).catch(()=>{});return()=>{active=false}},[]);
  const view=(id:string)=><p className="experience-views">{ready?`${(views[id]||0).toLocaleString()} views`:'— views'}</p>;
  return <div className="experience-grid">
    {pinned.map(r=><a className="experience-card pinned" href={r.url} key={r.id} aria-label={r.title}><Preview id={r.id}/><h3>{r.title}</h3><p>{r.desc}</p></a>)}
    {resources.map((r,i)=>({r,i})).sort((a,b)=>(views[b.r.id]||0)-(views[a.r.id]||0)||a.i-b.i).map(({r})=><a key={r.id} className="experience-card" aria-label={r.title} href={r.url} target={r.external?'_blank':undefined} rel={r.external?'noopener noreferrer':undefined} onClick={()=>{void recordResourceView(r.id)}}><Preview id={r.id}/>{view(r.id)}</a>)}
  </div>;
}
