import {useEffect,useState} from 'react';
import {resources} from '../data/resources';
import {loadResourceViewTotals,recordResourceView} from '../lib/resourceViews';
export default function HomeCollections(){
  const [views,setViews]=useState<Record<string,number>>({});
  const [ready,setReady]=useState(false);
  useEffect(()=>{let active=true;loadResourceViewTotals(resources).then(v=>{if(active){setViews(v);setReady(true)}}).catch(()=>{});return()=>{active=false}},[]);
  const pinned=[{id:'works',title:'parcyun studio',desc:'만들고 실험한 웹서비스',url:'/works/',image:'/images/resource-previews/home-works.png'},{id:'library',title:'ACADEMICA',desc:'교육 · AI · 디자인 강의 자료',url:'/academica/',image:'/images/resource-previews/home-academica.png'},{id:'atlas',title:'ATLAS GEARS',desc:'교실에서 바로 쓰는 활동 도구',url:'/atlas-gears/',image:'/images/resource-previews/home-atlas.png'}];
  return <div className="experience-grid">
    {pinned.map(r=><a className="experience-card pinned" href={r.url} key={r.id}><div className="experience-image"><img src={r.image} alt="" loading="lazy"/><span>EXPLORE ↗</span></div><h3>{r.title}</h3><p>{r.desc}</p></a>)}
    {resources.map((r,i)=>({r,i})).sort((a,b)=>(views[b.r.id]||0)-(views[a.r.id]||0)||a.i-b.i).map(({r})=><a key={r.id} className="experience-card" href={r.url} target={r.external?'_blank':undefined} rel={r.external?'noopener noreferrer':undefined} onClick={()=>{void recordResourceView(r.id)}}><div className="experience-image"><img src={r.id==='spell-drill'?'/spell-drill/og-cover.png':`/images/resource-previews/${r.id}.png`} alt="" loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/images/og-card.png'}}/><span>{r.type} ↗</span></div><h3>{r.title}</h3><p>{ready?`${(views[r.id]||0).toLocaleString()} views`:'조회수 확인 중'} · {r.subject}</p></a>)}
  </div>;
}
