import { useEffect, useRef, useState } from 'react';
import { GAME_MODES, matchesAnswer, scoreAnswer, scoring, shuffledDeck } from './geoGameData.js';
import './geoGame.css';
import { EXPERT_ANSWER_MS, DIFFICULTIES, difficultyDeck, difficultyLabel, hasCountryDifficulty, gameRecordKey } from './geoGameDifficulty.js';
import GeoRanking from './GeoRanking.jsx';
import GeoScoreEffect from './GeoScoreEffect.jsx';
import { RECORD_KEY, readRecords, updateRecord, formatTime } from './geoGameRecords.js';

export default function GeoGame({ pools, onTarget, onExit, onFinish }) {
  const [mode,setMode]=useState('country');
  const [difficulty,setDifficulty]=useState('easy'),[pendingMode,setPendingMode]=useState(null);
  const difficultyDialog=useRef(null);
  const [practice,setPractice]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [question,setQuestion]=useState(null);
  const [answer,setAnswer]=useState('');
  const [busy,setBusy]=useState(true);
  const [result,setResult]=useState(null);
  const [formula,setFormula]=useState(false);
  const [mediaError,setMediaError]=useState(false);
  const [mediaReady,setMediaReady]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const [records,setRecords]=useState(()=>{try{return readRecords(window.localStorage);}catch{return {};}});
  const [storageError,setStorageError]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [countdown,setCountdown]=useState(null),deadline=useRef(0);
  const roundStarted=useRef(0);
  const [stats,setStats]=useState({score:0,combo:0,bestCombo:0,correct:0,attempts:0});
  const [summary,setSummary]=useState(false);
  const [rankingOpen,setRankingOpen]=useState(false),[finishedRecord,setFinishedRecord]=useState(null);
  const roundRecord=useRef(null),rankingOpener=useRef(null);
  const openRanking=event=>{rankingOpener.current=event.currentTarget;setRankingOpen(true);};
  const closeRanking=()=>{setRankingOpen(false);requestAnimationFrame(()=>rankingOpener.current?.focus());};
  const input=useRef(null), nextButton=useRef(null), deck=useRef([]), current=useRef(null), started=useRef(0), locked=useRef(true), timers=useRef([]), serial=useRef(0), composing=useRef(false);
  const config=GAME_MODES.find(m=>m.id===mode);
  const expert=hasCountryDifficulty(mode)&&difficulty==='expert';
  const tier=expert?'hard':hasCountryDifficulty(mode)?difficulty:config.tier;
  useEffect(()=>{if(pendingMode){const node=difficultyDialog.current;node.showModal();const unbind=window.psModalMotion.bindBackdrop(node,()=>closeDifficulty());return()=>{unbind();node.close();};}},[pendingMode]);
  function chooseMode(nextMode){if(hasCountryDifficulty(nextMode)){setPendingMode(nextMode);return;}setBusy(true);locked.current=true;setMode(nextMode);setPlaying(true);}
  function closeDifficulty(after){
    const node=difficultyDialog.current;if(!node||node.dataset.leaving)return;
    const complete=()=>{if(difficultyDialog.current===node){setPendingMode(null);after?.();}};
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){complete();return;}
    node.dataset.leaving='true';node.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(12px) scale(.98)'}],{duration:160,easing:'ease-in',fill:'forwards'}).finished.then(complete).catch(()=>{});
  }
  function startDifficulty(diff){const nextMode=pendingMode;closeDifficulty(()=>{setBusy(true);locked.current=true;setDifficulty(diff);setMode(nextMode);setPlaying(true);});}
  function recordSummary(item){
    if(!hasCountryDifficulty(item.id))return records[item.id]?`최고 ${records[item.id].score.toLocaleString()}점 · ${formatTime(records[item.id].seconds)}`:'최고 기록 없음';
    const levels=DIFFICULTIES.filter(d=>records[gameRecordKey(item.id,d.id)]).map(d=>`${d.label} ${records[gameRecordKey(item.id,d.id)].score.toLocaleString()}점`);
    return levels.join(' · ')||(records[item.id]?`이전 최고 ${records[item.id].score.toLocaleString()}점`:'난이도를 선택해 시작해요');
  }
  useEffect(()=>{if(!result)return;const timer=setTimeout(()=>setResult(null),2200);return()=>clearTimeout(timer);},[result]);
  useEffect(()=>{if(practice&&playing&&!busy&&!summary)nextButton.current?.focus();},[practice,playing,busy,summary,question]);
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const later=(fn,delay)=>{const id=setTimeout(fn,delay);timers.current.push(id);};
  function cancelPending(){timers.current.forEach(clearTimeout);timers.current=[];serial.current++;deadline.current=0;}
  function ready(){if(!locked.current)return;locked.current=false;setBusy(false);started.current=performance.now();deadline.current=expert&&!practice?started.current+EXPERT_ANSWER_MS:0;setCountdown(deadline.current?5:null);(practice?nextButton:input).current?.focus();}
  function nextQuestion(activeMode=mode){
    serial.current++;deadline.current=0;setCountdown(null);composing.current=false;
    const pool=pools[activeMode];
    if(!deck.current.length)deck.current=hasCountryDifficulty(activeMode)?difficultyDeck(pool,difficulty,current.current?.id):shuffledDeck(pool,current.current?.id);
    const next=deck.current.shift();current.current=next;
    locked.current=true;setBusy(true);setLeaving(false);setAnswer('');setMediaError(false);setMediaReady(false);setQuestion(next);
    onTarget(next,activeMode);
    const token=serial.current;
    if(!['flag','landmark','nature'].includes(activeMode)||(activeMode==='nature'&&!next.image))later(()=>{if(serial.current===token)ready();},reduced()?60:850);
  }
  useEffect(()=>{
    if(!playing)return;
    cancelPending();deck.current=[];setResult(null);setStats({score:0,combo:0,bestCombo:0,correct:0,attempts:0});
    roundRecord.current=null;roundStarted.current=performance.now();setElapsed(0);
    nextQuestion(mode);
    return cancelPending;
  },[mode,difficulty,playing,practice]);
  useEffect(()=>{
    if(summary||!playing)return;
    const timer=setInterval(()=>setElapsed(Math.floor((performance.now()-roundStarted.current)/1000)),1000);
    return()=>clearInterval(timer);
  },[mode,summary,playing]);
  function recordScore(score,maxCombo){
    const seconds=(performance.now()-roundStarted.current)/1000;
    roundRecord.current={maxCombo,mode,diff:hasCountryDifficulty(mode)?difficulty:undefined,score,elapsedMs:Math.max(1000,Math.round(seconds*1000)),playedAt:Date.now()};
    setRecords(previous=>{
      const next=updateRecord(previous,gameRecordKey(mode,difficulty),score,seconds);
      try{window.localStorage.setItem(RECORD_KEY,JSON.stringify(next));}catch{setStorageError(true);}
      return next;
    });
  }
  useEffect(()=>{
    if(!playing||summary||!question?.image||mediaError||!['flag','landmark','nature'].includes(mode))return;
    // Nature stays answerable from the map when its representative photo fails.
    const timer=setTimeout(()=>{if(!mediaReady)mediaFailed();},12000);
    return()=>clearTimeout(timer);
  },[question,mode,mediaReady,mediaError,playing,summary]);
  function mediaFailed(){setMediaError(true);if(mode==='nature'){const token=serial.current;later(()=>{if(token===serial.current)ready();},reduced()?60:850);}else setBusy(false);}
  function mediaLoaded(){if(summary||!playing||leaving||mediaError)return;const token=serial.current;setMediaReady(true);later(()=>{if(token===serial.current)ready();},reduced()?0:450);}
  function advance(message){
    cancelPending();setCountdown(null);locked.current=true;setBusy(true);setLeaving(true);setResult(message);setAnswer('');
    later(()=>{if(message.skipped)setResult(null);nextQuestion();},practice?reduced()?80:420:message.skipped?1400:reduced()?80:420);
  }
  function expireQuestion(){
    if(!expert||practice||summary||locked.current||!deadline.current||performance.now()<deadline.current)return;
    setStats(s=>({...s,combo:0,attempts:s.attempts+1}));
    cancelPending();setResult(null);nextQuestion();
  }
  useEffect(()=>{
    if(!playing||summary||busy||practice||!expert||!deadline.current)return;
    const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline.current-performance.now())/1000));if(!remaining){expireQuestion();return;}setCountdown(remaining);};
    const timer=setInterval(tick,40);
    return()=>clearInterval(timer);
  },[playing,summary,busy,practice,expert,question]);
  function submit(event){
    event.preventDefault();
    if(practice||locked.current||composing.current||!answer.trim()||summary)return;
    if(expert&&deadline.current&&performance.now()>=deadline.current){expireQuestion();return;}
    if(matchesAnswer(answer,question)){
      const combo=stats.combo+1;
      const gain=scoreAnswer(answer,(performance.now()-started.current)/1000,tier,combo);
      recordScore(stats.score+gain.total,Math.max(stats.bestCombo,combo));
      setStats(s=>({score:s.score+gain.total,combo,bestCombo:Math.max(combo,s.bestCombo),correct:s.correct+1,attempts:s.attempts+1}));
      advance({good:true,text:`${question.name} · 정답!`,gain,combo,id:performance.now()});
    }else{
      setStats(s=>({...s,combo:0,attempts:s.attempts+1}));
      setResult({good:false,text:'다시 생각해 보세요. 콤보가 초기화됐어요.'});
      input.current?.focus();input.current?.select();
    }
  }
  function skip(){
    if(leaving||(locked.current&&!mediaError)||summary)return;
    if(!practice)setStats(s=>({...s,combo:0}));advance({good:false,skipped:true,text:question.name,id:performance.now()});
  }
  function finish(){cancelPending();locked.current=true;onFinish?.(mode);if(practice){returnToMenu();return;}setFinishedRecord(roundRecord.current);setSummary(true);}
  function returnToMenu(){const complete=()=>{setSummary(false);setPlaying(false);setQuestion(null);setResult(null);setFormula(false);later(()=>document.querySelector('.gg-menu nav button')?.focus(),0);};if(summary)window.psModalMotion.exit(document.querySelector('.gg-summary'),complete);else complete();}
  return <section className={`geo-game ${playing?'gg-playing':''} ${playing&&mode==='flag'?'geo-game-flags':''} ${expert?'gg-expert':''}`} aria-label="지오웹 게임 모드">
    {playing&&mode==='flag'&&<div className="geo-game-blur"/>}
    <aside className="gg-menu" inert={playing||undefined} aria-hidden={playing}>
      <div className="gg-eyebrow">GEOWEB / PLAY</div><h1>지구 한 바퀴</h1>
      <button type="button" className="gg-practice-toggle" aria-pressed={practice} onClick={()=>setPractice(v=>!v)}>{practice?'연습 모드 켜짐':'연습 모드'}</button>
      <p>어디까지 알고 있나요?</p>
      <nav aria-label="게임 종류">{GAME_MODES.map((item,i)=><button key={item.id} disabled={summary} onClick={()=>chooseMode(item.id)}><span>0{i+1}</span><div>{item.title}<small className="gg-record">{recordSummary(item)}</small></div></button>)}</nav>
      <small>게임을 바꾸면 점수가 새로 시작돼요.<br/>한국어·영어 이름 모두 사용할 수 있어요.</small>
      <small>시간은 최고 점수를 달성하기까지 걸린 시간이에요. 기록은 이 브라우저에 저장돼요. 게임을 마친 뒤 랭킹에서 제출하면 전체 순위에 등록돼요.</small>
      {storageError&&<small role="status">저장 공간을 사용할 수 없어 이번 접속 중에만 기록이 유지돼요.</small>}
    </aside>
    {pendingMode&&<dialog ref={difficultyDialog} className="gg-difficulty-dialog" aria-labelledby="gg-difficulty-title" onCancel={event=>{event.preventDefault();closeDifficulty();}}>
      <header><span className="gg-eyebrow">GEOWEB / LEVEL</span><button type="button" onClick={()=>closeDifficulty()} aria-label="난이도 선택 닫기">×</button></header>
      <h2 id="gg-difficulty-title">{GAME_MODES.find(item=>item.id===pendingMode)?.title}</h2><p>어떤 국가들이 더 자주 나올까요?</p>
      <div className="gg-difficulty-options">{DIFFICULTIES.map((item,i)=><button key={item.id} type="button" autoFocus={i===0} onClick={()=>startDifficulty(item.id)}><b>{item.label}</b><span>{item.description}</span></button>)}</div>
    </dialog>}
    {!playing&&<button type="button" className="gg-ranking-open" onClick={openRanking}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3h8m-6-3h4v3"/></svg>랭킹</button>}
    {rankingOpen&&<GeoRanking initialMode={mode} initialDifficulty={difficulty} record={finishedRecord} onClose={closeRanking}/>}
    {!summary&&<button className="gg-mode-exit" onClick={onExit}>게임모드 종료 ↗</button>}
    {playing&&<><header className="gg-play-title"><span>{expert?'GEOWEB · 전문가':`GEOWEB PLAY · ${hasCountryDifficulty(mode)?'국가 출제 ':''}${difficultyLabel(tier)}`}</span><h1>{config.title}</h1><button type="button" className="gg-practice-toggle" aria-pressed={practice} onClick={()=>{setPractice(v=>!v);setSummary(false);}}>연습 모드 {practice?'켜짐':'꺼짐'}</button></header>
    {expert&&!practice&&!summary&&!busy&&countdown>0&&<div className="gg-expert-countdown" role="timer" aria-label={`${countdown}초 남음`}><span key={`${question.id}-${countdown}`} style={{'--gg-clock-color':['','#ff263b','#ff514d','#ff7844','#ff9638','#ffb11a'][countdown]}}>{countdown}</span></div>}
    {!practice&&!summary&&result?.gain&&<GeoScoreEffect key={result.id} gain={result.gain} combo={result.combo}/>}
    {!practice&&!summary&&result?.skipped&&<div key={result.id} className="gg-skip-answer" role="status">{result.text}</div>}
    <button className="gg-finish" disabled={summary} onClick={finish}>게임 마치기</button>
    {!practice&&<div className="gg-right-cards"><div className="gg-hud">
      <button className="gg-score" disabled={summary} onClick={()=>setFormula(v=>!v)} aria-expanded={formula} aria-controls="gg-formula"><span>SCORE ⓘ <small>{({easy:'초급',med:'중급',hard:'고급'})[tier]} · 기본 {scoring.baseScoreForDifficulty(tier)}점</small></span><strong>{stats.score.toLocaleString()}</strong><small>플레이 {formatTime(elapsed)}</small></button>
      <div className="gg-combo"><span>COMBO</span><strong>{stats.combo}<small> ×{scoring.comboMultiplier(stats.combo)}</small></strong></div>
      {formula&&<div id="gg-formula" className="gg-formula"><b>(기본점수 + 속도점수 + 콤보 횟수 × 10점) × 콤보 배율</b><p>LIGHTNING +100 · FAST +50 · QUICK +20<br/>콤보 3회 ×1.5 / 6회 ×2 / 9회 ×3 / 12회 ×4 / 15회 ×5<br/>오답·넘기기는 콤보를 초기화해요.</p></div>}
    </div>
    {mode==='capital-easy'&&question&&<aside className="gg-country" aria-label="국가 정보"><img src={question.country.flag} alt=""/><h2>{question.country.name.ko}</h2><p>{question.country.officialName.ko}</p><p>{question.country.continent} · 인구 {question.country.population.toLocaleString()}명</p>{!practice&&<small>수도는 직접 떠올려 보세요.</small>}</aside>}
    </div>}
    {question&&['flag','landmark','nature'].includes(mode)&&(mode!=='nature'||question.image)&&<figure key={`${mode}-${question.id}`} className={`gg-media ${mode==='flag'?'gg-flag':mode==='landmark'?'gg-landmark':'gg-nature'} ${leaving?'gg-leaving':''} ${!mediaReady&&!mediaError?'gg-loading':''}`}>
      <img src={mode==='flag'?question.country.flag:question.image} alt={mode==='flag'?'맞혀야 할 국기':mode==='nature'?'이름을 맞혀야 할 자연환경의 대표 사진':'이름을 맞혀야 할 랜드마크 사진'} onLoad={mediaLoaded} onError={mediaFailed}/>
      {mediaError&&<div className="gg-media-error">사진을 불러오지 못했어요.{mode==='nature'?' 지도만 보고 풀어 보세요.':<button onClick={skip}>다음 문제로</button>}</div>}
      {mode!=='flag'&&<figcaption>{mode==='nature'?'대표 사진':'사진'}: {question.author} · <a href={question.licenseUrl} target="_blank" rel="noreferrer">{question.license}</a> · <a href={question.source} target="_blank" rel="noreferrer">원본</a></figcaption>}
    </figure>}
    {practice&&question&&<div className="gg-practice-answer" role="status">{question.name}</div>}
    <div className="gg-answer">
      {!practice&&<div className="gg-feedback" role="status" aria-live="polite">{result&&!result.skipped&&!result.gain&&<span>{result.text}</span>}</div>}
      {!practice&&mode!=='country'&&<label htmlFor="gg-input">{config.prompt}</label>}
      {!practice&&<form onSubmit={submit}>
        <input ref={input} id="gg-input" aria-label={config.label} value={answer} onChange={e=>setAnswer(e.target.value)} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={e=>{if(e.key==='Enter'&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat&&!composing.current&&!e.nativeEvent.isComposing&&e.nativeEvent.keyCode!==229)skip();return;}if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229))e.preventDefault();}} placeholder={busy?'지도를 살펴보세요…':`${config.label} 입력`} autoComplete="off" spellCheck={false} readOnly={busy||(mediaError&&mode!=='nature')||summary}/>
        <button type="submit" disabled={busy||(mediaError&&mode!=='nature')||summary||!answer.trim()}><span>확인</span><small>ENTER</small></button>
        <button type="button" className="gg-skip" disabled={(busy&&!mediaError)||summary} onClick={skip}><span>넘기기</span><small>SHIFT+ENTER</small></button>
      </form>}
      {practice&&<button ref={nextButton} type="button" className="gg-practice-next" disabled={(busy&&!mediaError)||summary} onClick={skip} onKeyDown={e=>{if(e.key==='Enter'&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)skip();}}}><span>넘기기</span><small>SHIFT+ENTER</small></button>}
    </div>
    {summary&&<div className="gg-summary" onClick={event=>{if(event.target===event.currentTarget)returnToMenu();}} role="dialog" aria-modal="true" aria-labelledby="gg-summary-title" onKeyDown={e=>{if(e.key==='Escape')returnToMenu();if(e.key==='Tab'){const buttons=[...e.currentTarget.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}}}><div><div className="gg-eyebrow">ROUND COMPLETE</div><h2 id="gg-summary-title">오늘의 지구 탐험</h2><strong>{stats.score.toLocaleString()}<small>점</small></strong><p>정답 {stats.correct}개 · 최고 콤보 {stats.bestCombo} · {formatTime(elapsed)}</p><div className="gg-summary-actions"><button autoFocus onClick={returnToMenu}>게임 선택으로</button><button className="gg-mode-exit" onClick={()=>window.psModalMotion.exit(document.querySelector('.gg-summary'),onExit)}>게임모드 종료 ↗</button></div><div className="gg-summary-submit"><button type="button" onClick={openRanking}>랭킹 · 기록 제출</button></div></div></div>}
    </>}
  </section>;
}
