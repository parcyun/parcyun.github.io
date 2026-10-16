import { useEffect, useRef } from 'react';

// Spell Drill's pointPop / scoreEffect timings, power curve and burst geometry.
export default function GeoScoreEffect({ gain, combo }) {
  const host=useRef(null);
  const power=Math.min(1,Math.log2(Math.max(10,gain.total)/10+1)/5);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const root=host.current, animations=[];
    const animate=(selector,frames,options)=>{
      const el=root.querySelector(selector);if(el)animations.push(el.animate(frames,{...options,fill:'forwards'}));
    };
    animate('.gg-point-pop',[
      {transform:'translateY(15%) scale(1.28)',opacity:0},
      {transform:'translateY(2%) scale(1)',opacity:1,offset:.12},
      {transform:'translateY(-8%) scale(1)',opacity:1,offset:.24},
      {transform:`translateY(-${105+power*95}%) scale(.82)`,opacity:0}
    ],{duration:354+power*91,easing:'cubic-bezier(.6,0,1,.45)'});
    animate('.gg-score-ring',[
      {transform:'translate(-50%,-50%) scale(.25)',opacity:.78},
      {transform:`translate(-50%,-50%) scale(${1.1+power*1.8})`,opacity:0}
    ],{duration:216+power*200,easing:'cubic-bezier(.12,.72,.2,1)'});
    const particles=[...root.querySelectorAll('.gg-score-particle')];
    particles.forEach((el,i)=>{
      const angle=Math.PI*2*i/particles.length+(Math.random()-.5)*.28;
      const distance=90+power*220+Math.random()*70;
      animations.push(el.animate([
        {transform:`rotate(${angle}rad) translateY(0) scale(1)`,opacity:.9},
        {transform:`rotate(${angle}rad) translateY(-${distance}px) scale(.15)`,opacity:0}
      ],{duration:179+power*216,easing:'cubic-bezier(.12,.68,.22,1)',fill:'forwards'}));
    });
    return()=>animations.forEach(a=>a.cancel());
  },[gain,combo,power]);
  const praise=combo>=8?'PERFECT!':combo===5?'AMAZING!':combo===3?'GREAT!':'';
  return <div ref={host} className="gg-score-fx" role="status">
    <i className="gg-score-ring" aria-hidden="true"/>
    {Array.from({length:Math.round(8+power*28)},(_,i)=><i key={i} className="gg-score-particle" aria-hidden="true"/>)}
    <div className={`gg-speed-tag ${(gain.speedTag||'').toLowerCase()}`}>{gain.speedTag}</div>
    <div className="gg-point-pop" style={{fontSize:`clamp(48px,12vw,${52+power*62}px)`}}>+{gain.total}</div>
    <div className="gg-combo-fx">{praise&&<strong>{praise} </strong>}{combo} COMBO <small>×{gain.multiplier}</small></div>
  </div>;
}
