import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './geoMobileNavigation.css';

const tabs=[['map','지도'],['search','검색'],['settings','설정'],['game','게임'],['more','더보기']];
const paths={map:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z"/></>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,settings:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,game:<><path d="M6 7h12a3 3 0 0 1 3 2l1 9a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2l1-9a3 3 0 0 1 3-2Z"/><path d="M6 12h5M8.5 9.5v5M16 11h.01M19 14h.01"/></>,more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,exit:<><path d="M9 3H4v18h5M10 12h11m-4-4 4 4-4 4"/></>,finish:<><path d="M6 21V3m0 1h13l-3 4 3 4H6"/></>,practice:<><path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4Zm16 0h-4a3 3 0 0 0-3 3m7-3v14h-3"/></>,ranking:<><path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v7m-5 0h10"/></>};
function Icon({name}){return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;}

export default function GeoMobileNavigation({english=false,view,onView,onZoom,onHome,northUp,onNorthUp,regions,onRegion,onGame,onExit,gameActive,gameDisabled}){
  const [panel,setPanel]=useState(null),[playing,setPlaying]=useState(false),[practice,setPractice]=useState(false);
  const root=useRef(null),opener=useRef(null),pending=useRef(null),closing=useRef(false);
  const surface=()=>panel==='settings'?root.current?.querySelector('.tools-fixed'):panel==='search'?root.current?.querySelector('.country-search-panel'):document.querySelector('.geo-mobile-surface');
  function changePanel(next,after){
    pending.current={next,after};if(closing.current)return;
    const node=surface();
    const complete=()=>{closing.current=false;const desired=pending.current;setPanel(desired.next);if(desired.after)requestAnimationFrame(desired.after);else if(!desired.next)requestAnimationFrame(()=>opener.current?.focus({preventScroll:true}));};
    if(panel&&node){closing.current=true;window.psModalMotion.exit(node,complete);}else complete();
  }
  function activate(selector){changePanel(null,()=>{const button=document.querySelector(selector);if(button&&!button.disabled)button.click();});}
  useLayoutEffect(()=>{root.current=document.querySelector('.gl-app');root.current.dataset.mobilePanel=panel||'';return()=>{if(root.current)delete root.current.dataset.mobilePanel;};},[panel]);
  useEffect(()=>{
    const node=root.current;
    const sync=()=>{setPlaying(!!node.querySelector('.gg-playing'));setPractice(node.querySelector('.gg-practice-toggle')?.getAttribute('aria-pressed')==='true');};
    const observer=new MutationObserver(sync);observer.observe(node,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-pressed']});sync();return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(gameActive)setPanel(null);},[gameActive]);
  useEffect(()=>{
    if(!panel)return;
    const node=surface(),unbind=node?window.psModalMotion.bindSheet(node,()=>changePanel(null),false):()=>{};
    if(panel!=='search')node?.querySelector('.ps-sheet-handle')?.focus({preventScroll:true});
    if(panel==='search')requestAnimationFrame(()=>root.current.querySelector('#country-search-input')?.focus({preventScroll:true}));
    const outside=event=>{if(!event.target.closest('.geo-mobile-dock,.geo-mobile-surface,.tools-fixed,.country-search-panel,.daynight-ctl,.ts-popup,dialog,.ps-qr-popover'))changePanel(null);};
    const escape=event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open],.ts-popup')){event.preventDefault();changePanel(null);}};
    document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape);
    return()=>{unbind();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape);};
  },[panel]);
  useEffect(()=>{
    const media=matchMedia('(max-width:760px), (min-width:600px) and (max-height:500px) and (max-width:1000px)');
    const resize=()=>{if(!media.matches){root.current.querySelectorAll('[data-ps-modal-closing]').forEach(node=>window.psModalMotion.cancel(node));closing.current=false;pending.current={next:null};setPanel(null);}const viewport=window.visualViewport;root.current.style.setProperty('--geo-keyboard-inset',`${viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0}px`);};
    media.addEventListener('change',resize);window.visualViewport?.addEventListener('resize',resize);resize();
    return()=>{media.removeEventListener('change',resize);window.visualViewport?.removeEventListener('resize',resize);};
  },[]);
  const labels=english?{map:'Map',search:'Search',settings:'Settings',game:'Play',more:'More'}:Object.fromEntries(tabs);
  const active=tabs.findIndex(([key])=>key===panel);
  return <>
    {(panel==='map'||panel==='more')&&<section key={panel} className="geo-mobile-surface" aria-label={panel==='map'?(english?'Map menu':'지도 메뉴'):(english?'More menu':'더보기 메뉴')}>
      <header><div><small>GEOWEB</small><h2>{panel==='map'?(english?'Explore the map':'지도 둘러보기'):(english?'Explore together':'함께하는 지구 탐험')}</h2></div><button type="button" className="geo-mobile-close" onClick={()=>changePanel(null)} aria-label="메뉴 닫기">×</button></header>
      {panel==='map'?<>
        <div className="geo-mobile-views" aria-label="지도 보기">{[['flat',english?'Flat':'평면'],['lens',english?'Focus Lens':'어안뷰'],['globe',english?'Globe':'지구본']].map(([key,label])=><button type="button" key={key} aria-pressed={view===key} onClick={()=>onView(key)}>{label}</button>)}</div>
        <div className="geo-mobile-zoom"><button type="button" onClick={()=>onZoom(.8)} aria-label="확대">+</button><button type="button" onClick={()=>onZoom(1.25)} aria-label="축소">−</button><button type="button" onClick={onHome}>{english?'Reset':'처음 위치'}</button>{view==='globe'&&<button type="button" aria-pressed={northUp} onClick={onNorthUp}>{english?'North up':'정북'}</button>}</div>
        <h3>{english?'Continents & oceans':'대륙과 대양'}</h3><div className="geo-mobile-regions">{regions.map(region=><button type="button" key={region.type+region.key} aria-pressed={region.selected} onClick={()=>{onRegion(region.type,region.key);changePanel(null);}}><i style={{background:region.color}}/>{region.label}</button>)}</div>
      </>:<div className="geo-mobile-more">
        {[['.ps-account-trigger','내 프로필'],['.home-fab','parcyun studio'],['.ps-service-qr','QR 코드'],['.ps-share-fab','쌤 동료에게 공유하기'],['.ps-brand-coffee','커피 사주기'],['.ps-brand-feedback','기능 개선 요청'],['.ps-brand-review','리뷰 남기기']].map(([selector,label])=><button type="button" key={selector} onClick={()=>activate(selector)}>{label}<span aria-hidden="true">↗</span></button>)}
        <a href="/spell-drill/">스펠 드릴<span aria-hidden="true">↗</span></a><a href="https://earth.google.com/web/" target="_blank" rel="noopener">Google Earth<span aria-hidden="true">↗</span></a>
      </div>}
    </section>}
    <nav className={'geo-mobile-dock'+(gameActive?' geo-mobile-game-dock':'')} aria-label={gameActive?'게임 메뉴':'지오웹 메뉴'} style={{'--geo-tab':Math.max(0,active),'--geo-selected':active>=0?1:0}}>
      {gameActive?<>
        <button type="button" onClick={()=>activate(playing?'.gg-finish':'.gg-ranking-open')}><Icon name={playing?'finish':'ranking'}/><span>{playing?'게임 마치기':'랭킹'}</span></button>
        <button type="button" aria-pressed={practice} onClick={()=>activate(playing?'.gg-play-title .gg-practice-toggle':'.gg-menu>.gg-practice-toggle')}><Icon name="practice"/><span>{practice?'연습 켜짐':'연습 모드'}</span></button>
        <button type="button" onClick={onExit}><Icon name="exit"/><span>지도로</span></button>
      </>:tabs.map(([key,label])=><button key={key} type="button" aria-label={english?labels[key]+' menu':key==='game'?'게임 모드':label+' 메뉴'} aria-expanded={key==='game'?undefined:panel===key} disabled={key==='game'&&gameDisabled} onClick={event=>{opener.current=event.currentTarget;key==='game'?changePanel(null,onGame):changePanel(panel===key?null:key);}}><Icon name={key}/><span>{labels[key]}</span></button>)}
    </nav>
  </>;
}
