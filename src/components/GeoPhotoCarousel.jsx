import {useEffect,useState} from 'react';
import {warmPhoto} from './geoPhotoPreload.js';
export default function GeoPhotoCarousel({photos,paused,onLoad,onError,kind}){
 const [index,setIndex]=useState(0),[failed,setFailed]=useState([]),[loaded,setLoaded]=useState(false),[previous,setPrevious]=useState(null);
 const available=photos.slice(0,3).filter(p=>!failed.includes(p.image)),photo=available[index%Math.max(1,available.length)];
 useEffect(()=>{if(paused||!loaded||available.length<2)return;let cancelled=false;const next=available[(index+1)%available.length];const timer=setTimeout(()=>{warmPhoto(next.image).then(ok=>{if(cancelled)return;if(ok){setPrevious(photo);setIndex(i=>(i+1)%available.length);}else setFailed(v=>[...v,next.image]);});},2000);return()=>{cancelled=true;clearTimeout(timer);};},[paused,loaded,index,available.length,photo?.image]);
 useEffect(()=>{if(!previous)return;const timer=setTimeout(()=>setPrevious(null),650);return()=>clearTimeout(timer);},[previous]);
 if(!photo)return <div className="gg-media-error">사진을 불러오지 못했어요.{kind==='nature'?' 지도만 보고 풀어 보세요.':''}</div>;
 return <><div className="gg-photo-stage">{previous&&<div key={`old-${previous.image}`} className="gg-photo-slide gg-photo-out" aria-hidden="true"><img src={previous.image} alt=""/></div>}<div key={photo.image} className={`gg-photo-slide ${previous?'gg-photo-in':''}`}><img key={photo.image} className="gg-carousel-photo" src={photo.image} alt={`이름을 맞혀야 할 ${kind==='nature'?'자연환경':'랜드마크'} 사진 ${index%available.length+1}`} onLoad={()=>{setLoaded(true);onLoad();}} onError={()=>{setFailed(v=>[...v,photo.image]);if(available.length<=1)onError();}}/></div></div>
 <figcaption><span className="gg-photo-count">{index%available.length+1} / {available.length}</span> {photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · <a href={photo.source} target="_blank" rel="noreferrer">원본</a></figcaption></>;
}
