import {useLayoutEffect,useRef} from 'react';
import GeoAnswerArea from './GeoAnswerArea.jsx';
import GeoPhotoCarousel from './GeoPhotoCarousel.jsx';
import GeoScoreEffect from './GeoScoreEffect.jsx';
import {scoring} from './geoGameData.js';
import {formatTime} from './geoGameRecords.js';

// Solo and battle render the same play surface; their controllers only supply game state.
export default function GeoGamePlay({question,questionKey,mode,expert,practice=false,summary=false,busy,countdown,result,stats,tier,formula,setFormula,elapsed=0,leaving=false,mediaReady,mediaError,mediaLoaded,mediaFailed,skip,submit,input,answer,setAnswer,composing,nextButton,finish,config,tools,onTarget}){
 useLayoutEffect(()=>{if(question)onTarget?.(question,mode);},[questionKey,mode]);
 return <>
    {mode==='flag'&&<div className="geo-game-blur"/>}
    {expert&&!practice&&!summary&&!busy&&countdown>0&&<div className="gg-expert-countdown" role="timer" aria-label={`${countdown}초 남음`}><span key={`${question?.id}-${countdown}`} style={{'--gg-clock-color':['','#ff263b','#ff514d','#ff7844','#ff9638','#ffb11a'][countdown]}}>{countdown}</span></div>}
    {!practice&&!summary&&result?.gain&&<GeoScoreEffect key={result.id} gain={result.gain} combo={result.combo}/>}
    {!practice&&!summary&&result?.skipped&&<div key={result.id} className="gg-skip-answer" role="status">{result.text}</div>}
    {finish&&<button className="gg-finish" disabled={summary} onClick={finish}>게임 마치기</button>}
    {!practice&&<div className="gg-right-cards"><div className="gg-hud">
      <button className="gg-score" disabled={summary} onClick={()=>setFormula(v=>!v)} aria-expanded={formula} aria-controls="gg-formula"><span>SCORE ⓘ <small>{({easy:'초급',med:'중급',hard:'고급'})[tier]} · 기본 {scoring.baseScoreForDifficulty(tier)}점</small></span><strong>{stats.score.toLocaleString()}</strong><small>플레이 {formatTime(elapsed)}</small></button>
      <div className="gg-combo"><span>COMBO</span><strong>{stats.combo}<small> ×{scoring.comboMultiplier(stats.combo)}</small></strong></div>
      {formula&&<div id="gg-formula" className="gg-formula"><b>(기본점수 + 속도점수 + 콤보 횟수 × 10점) × 콤보 배율</b><p>LIGHTNING +100 · FAST +50 · QUICK +20<br/>콤보 3회 ×1.5 / 6회 ×2 / 9회 ×3 / 12회 ×4 / 15회 ×5<br/>오답·넘기기는 콤보를 초기화해요.</p></div>}
    </div>
    {mode==='capital-easy'&&question&&<aside className="gg-country" aria-label="국가 정보"><img src={question.country.flag} alt=""/><h2>{question.country.name.ko}</h2><p>{question.country.officialName.ko}</p><p>{question.country.continent} · 인구 {question.country.population.toLocaleString()}명</p>{!practice&&<small>수도는 직접 떠올려 보세요.</small>}</aside>}
    </div>}
    <GeoGameMedia key={questionKey} {...{question,mode,leaving,mediaReady,mediaError,summary,mediaLoaded,mediaFailed,skip}}/>

    {practice&&question&&<div className="gg-practice-answer" role="status">{question.name}</div>}
    <GeoAnswerArea tools={tools} practice={practice} result={result} mode={mode} config={config} submit={submit} input={input} answer={answer} setAnswer={setAnswer} composing={composing} skip={skip} busy={busy} mediaError={mediaError} summary={summary} nextButton={nextButton}/>
  </>;
}

function GeoGameMedia({question,mode,leaving,mediaReady,mediaError,summary,mediaLoaded,mediaFailed,skip}){
 const figure=useRef(null),leavingNow=useRef(leaving);leavingNow.current=leaving;
 useLayoutEffect(()=>()=>{
  const node=figure.current;
  if(!node||leavingNow.current||node.classList.contains('gg-loading')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  // Server-driven questions change immediately, including the expert five-second boundary.
  // Let the departing media complete the original exit motion without delaying the next question.
  const exit=node.cloneNode(true);exit.inert=true;exit.setAttribute('aria-hidden','true');exit.dataset.departing='true';exit.style.pointerEvents='none';
  exit.classList.add('gg-leaving');
  for(const slide of exit.querySelectorAll('.gg-photo-slide')){slide.classList.remove('gg-photo-in');slide.classList.add('gg-photo-out');}
  node.parentNode?.append(exit);setTimeout(()=>exit.remove(),650);
 },[]);
 return <>    {question&&['flag','landmark','nature'].includes(mode)&&(mode!=='nature'||question.image)&&<figure ref={figure} className={`gg-media ${mode==='flag'?'gg-flag':mode==='landmark'?'gg-landmark':'gg-nature'} ${leaving?'gg-leaving':''} ${!mediaReady&&!mediaError?'gg-loading':''}`}>
      {mode==='flag'?<><img src={question.country.flag} alt="맞혀야 할 국기" onLoad={mediaLoaded} onError={mediaFailed}/>{mediaError&&<div className="gg-media-error">사진을 불러오지 못했어요.<button onClick={skip}>다음 문제로</button></div>}</>:<GeoPhotoCarousel photos={question.photos?.length?question.photos:[question]} paused={summary||leaving} onLoad={mediaLoaded} onError={mediaFailed} kind={mode}/>}
    </figure>}</>;
}
