import GeoGamePlay from "./GeoGamePlay.jsx";
import {savePendingRecord} from './geoPendingRecords.js';
import {watchGameFocus} from '../../public/game-focus-guard.js';
import { useEffect, useRef, useState } from 'react';
import { GAME_MODES, matchesAnswer, scoreAnswer, shuffledDeck, contentDeck } from './geoGameData.js';
import './geoGame.css';
import { EXPERT_ANSWER_MS, DIFFICULTIES, difficultyDeck, difficultyLabel, hasCountryDifficulty, gameRecordKey,hasGameDifficulty,hasContentDifficulty,difficultyOptions } from './geoGameDifficulty.js';
import GeoRanking from './GeoRanking.jsx';
import GeoBattle from './GeoBattle.jsx';
import { RECORD_KEY, readRecords, updateRecord, formatTime } from './geoGameRecords.js';

export default function GeoGame({ musicControls, pools, onTarget, onExit, onFinish }) {
  const [mode,setMode]=useState('country');
  const [difficulty,setDifficulty]=useState('easy'),[pendingMode,setPendingMode]=useState(null);
  const difficultyDialog=useRef(null);
  const [practice,setPractice]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [battleOpen,setBattleOpen]=useState(false);
  const [question,setQuestion]=useState(null),[questionSequence,setQuestionSequence]=useState(0);
  const [answer,setAnswer]=useState('');
  const [busy,setBusy]=useState(true);
  const [result,setResult]=useState(null);
  const [formula,setFormula]=useState(false);
  const [mediaError,setMediaError]=useState(false);
  const [mediaReady,setMediaReady]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const [records,setRecords]=useState(()=>{try{return readRecords(window.localStorage);}catch{return {};}});
  useEffect(()=>{
    const restore=()=>setRecords(window.psPersonalRecords?.read()??readRecords(window.localStorage));
    restore();window.addEventListener('ps-personal-records',restore);
    return ()=>window.removeEventListener('ps-personal-records',restore);
  },[]);
  const [storageError,setStorageError]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [countdown,setCountdown]=useState(null),deadline=useRef(0);
  const roundStarted=useRef(0);
  const [stats,setStats]=useState({score:0,combo:0,bestCombo:0,correct:0,attempts:0});
  const [summary,setSummary]=useState(false),[finishReason,setFinishReason]=useState('');
  const [rankingOpen,setRankingOpen]=useState(false);
  const rankingOpener=useRef(null);
  const openRanking=event=>{rankingOpener.current=event.currentTarget;setRankingOpen(true);};
  const closeRanking=()=>{setRankingOpen(false);requestAnimationFrame(()=>rankingOpener.current?.focus());};
  const input=useRef(null), nextButton=useRef(null), deck=useRef([]), current=useRef(null), started=useRef(0), locked=useRef(true), timers=useRef([]), serial=useRef(0), composing=useRef(false);
  const pausedAt=useRef(null), pausedTotal=useRef(0), pausedJobs=useRef([]);
  const gameNow=()=> (pausedAt.current ?? performance.now())-pausedTotal.current;
  const config=GAME_MODES.find(m=>m.id===mode);
  const expert=hasCountryDifficulty(mode)&&difficulty==='expert';
  const tier=expert?'hard':hasGameDifficulty(mode)?difficulty:config.tier;
  useEffect(()=>{if(pendingMode){const node=difficultyDialog.current;node.showModal();const unbind=window.psModalMotion.bindBackdrop(node,()=>closeDifficulty());return()=>{unbind();node.close();};}},[pendingMode]);
  function chooseMode(nextMode){if(hasGameDifficulty(nextMode)){setPendingMode(nextMode);return;}setBusy(true);locked.current=true;setMode(nextMode);setPlaying(true);}
  function closeDifficulty(after){
    const node=difficultyDialog.current;if(!node||node.dataset.leaving)return;
    const complete=()=>{if(difficultyDialog.current===node){setPendingMode(null);after?.();}};
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){complete();return;}
    node.dataset.leaving='true';node.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(12px) scale(.98)'}],{duration:160,easing:'ease-in',fill:'forwards'}).finished.then(complete).catch(()=>{});
  }
  function startDifficulty(diff){const nextMode=pendingMode;closeDifficulty(()=>{setBusy(true);locked.current=true;setDifficulty(diff);setMode(nextMode);setPlaying(true);});}
  function recordSummary(item){
    if(!hasGameDifficulty(item.id))return records[item.id]?`최고 ${records[item.id].score.toLocaleString()}점 · ${formatTime(records[item.id].seconds)}`:'최고 기록 없음';
    const levels=difficultyOptions(item.id).filter(d=>records[gameRecordKey(item.id,d.id)]).map(d=>`${d.label} ${records[gameRecordKey(item.id,d.id)].score.toLocaleString()}점`);
    return levels.join(' · ')||(records[item.id]?`이전 최고 ${records[item.id].score.toLocaleString()}점`:'난이도를 선택해 시작해요');
  }
  useEffect(()=>{if(!result)return;const timer=setTimeout(()=>setResult(null),2200);return()=>clearTimeout(timer);},[result]);
  useEffect(()=>{if(practice&&playing&&!busy&&!summary)nextButton.current?.focus();},[practice,playing,busy,summary,question]);
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const later=(fn,delay)=>{const id=setTimeout(()=>{if(pausedAt.current!==null)pausedJobs.current.push(fn);else fn();},delay);timers.current.push(id);};
  function cancelPending(){timers.current.forEach(clearTimeout);timers.current=[];pausedJobs.current=[];serial.current++;deadline.current=0;}
  function ready(){if(!locked.current)return;locked.current=false;setBusy(false);started.current=gameNow();deadline.current=expert&&!practice?started.current+EXPERT_ANSWER_MS:0;setCountdown(deadline.current?5:null);(practice?nextButton:input).current?.focus();}
  function nextQuestion(activeMode=mode){
    serial.current++;deadline.current=0;setCountdown(null);composing.current=false;
    const pool=pools[activeMode];
    if(!deck.current.length)deck.current=hasCountryDifficulty(activeMode)?difficultyDeck(pool,difficulty,current.current?.id):hasContentDifficulty(activeMode)?contentDeck(pool,difficulty,current.current):shuffledDeck(pool,current.current?.id);
    const next=deck.current.shift();current.current=next;
    locked.current=true;setBusy(true);setLeaving(false);setAnswer('');setMediaError(false);setMediaReady(false);setQuestion(next);setQuestionSequence(value=>value+1);
    const token=serial.current;
    if(!['flag','landmark','nature'].includes(activeMode)||(activeMode==='nature'&&!next.image))later(()=>{if(serial.current===token)ready();},reduced()?60:850);
  }
  useEffect(()=>{
    if(!playing)return;
    pausedAt.current=null;pausedTotal.current=0;cancelPending();deck.current=[];setResult(null);setStats({score:0,combo:0,bestCombo:0,correct:0,attempts:0});
    setFinishReason('');roundStarted.current=gameNow();setElapsed(0);
    nextQuestion(mode);
    return cancelPending;
  },[mode,difficulty,playing,practice]);
  useEffect(()=>{
    if(summary||!playing)return;
    const timer=setInterval(()=>setElapsed(Math.floor((gameNow()-roundStarted.current)/1000)),1000);
    return()=>clearInterval(timer);
  },[mode,summary,playing]);
  function recordScore(score,maxCombo){
    const seconds=(gameNow()-roundStarted.current)/1000;
    const record={maxCombo,mode,diff:hasGameDifficulty(mode)?difficulty:undefined,score,elapsedMs:Math.max(1000,Math.round(seconds*1000)),playedAt:Date.now()};
    try{savePendingRecord(window.localStorage,record);}catch{setStorageError(true);}
    if(window.psPersonalRecords?.active){
      window.psPersonalRecords.save(gameRecordKey(mode,difficulty),{score,seconds:Math.round(seconds)}).catch(()=>setStorageError(true));
      return;
    }
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
    if(!expert||practice||summary||locked.current||!deadline.current||gameNow()<deadline.current)return;
    setStats(s=>({...s,combo:0,attempts:s.attempts+1}));
    cancelPending();setResult(null);nextQuestion();
  }
  useEffect(()=>{
    if(!playing||summary||busy||practice||!expert||!deadline.current)return;
    const tick=()=>{const remaining=Math.max(0,Math.ceil((deadline.current-gameNow())/1000));if(!remaining){expireQuestion();return;}setCountdown(remaining);};
    const timer=setInterval(tick,40);
    return()=>clearInterval(timer);
  },[playing,summary,busy,practice,expert,question]);
  function submit(event){
    event.preventDefault();
    if(pausedAt.current!==null||practice||locked.current||composing.current||!answer.trim()||summary)return;
    if(expert&&deadline.current&&gameNow()>=deadline.current){expireQuestion();return;}
    const correct=matchesAnswer(answer,question);
    if(correct){
      const combo=stats.combo+1;
      const gain=scoreAnswer(answer,(gameNow()-started.current)/1000,tier,combo);
      window.psGameSfx?.answer(true,undefined,gain.speedTag);
      recordScore(stats.score+gain.total,Math.max(stats.bestCombo,combo));
      setStats(s=>({score:s.score+gain.total,combo,bestCombo:Math.max(combo,s.bestCombo),correct:s.correct+1,attempts:s.attempts+1}));
      advance({good:true,text:`${question.name} · 정답!`,gain,combo,id:gameNow()});
    }else{
      window.psGameSfx?.answer(false);
      setStats(s=>({...s,combo:0,attempts:s.attempts+1}));
      setResult({good:false,text:'다시 생각해 보세요. 콤보가 초기화됐어요.'});
      input.current?.focus();input.current?.select();
    }
  }
  function skip(){
    if(pausedAt.current!==null||leaving||(locked.current&&!mediaError)||summary)return;
    if(!practice)setStats(s=>({...s,combo:0}));advance({good:false,skipped:true,text:question.name,id:gameNow()});
  }
  useEffect(()=>{
    if(!playing||summary)return;
    return watchGameFocus({
      pause:()=>{pausedAt.current=performance.now();},
      resume:()=>{
        pausedTotal.current+=performance.now()-pausedAt.current;
        pausedAt.current=null;
        for(const job of pausedJobs.current.splice(0))job();
        input.current?.focus();
      },
      finish:()=>finish(),
    });
  },[playing,summary,mode,practice]);
  function finish(){cancelPending();locked.current=true;onFinish?.(mode);if(practice){returnToMenu();return;}setSummary(true);}
  function returnToMenu(){const complete=()=>{setSummary(false);setPlaying(false);setQuestion(null);setResult(null);setFormula(false);later(()=>document.querySelector('.gg-menu nav button')?.focus(),0);};if(summary)window.psModalMotion.exit(document.querySelector('.gg-summary'),complete);else complete();}
  return <section className={`geo-game ${playing?'gg-playing':''} ${playing&&mode==='flag'?'geo-game-flags':''} ${expert?'gg-expert':''} ${battleOpen?'gg-battle-open':''}`} aria-label="지오웹 게임 모드">
    {!battleOpen&&<div className="gg-game-actions"><button className="gg-sound" type="button" data-music-toggle aria-pressed={musicControls.musicEnabled} onClick={musicControls.toggleMusic}>SOUND {musicControls.musicEnabled?"ON":"OFF"}</button>{playing&&<button className="gg-finish" disabled={summary} onClick={finish}>게임 마치기</button>}{!playing&&!summary&&<button className="gg-mode-exit" onClick={onExit}>게임모드 종료 ↗</button>}</div>}
    {!playing&&<GeoBattle musicControls={musicControls} onOpenChange={setBattleOpen} pools={pools} onTarget={onTarget}/>}
    <aside className="gg-menu" inert={playing||battleOpen||undefined} aria-hidden={playing||battleOpen}>
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
      <h2 id="gg-difficulty-title">{GAME_MODES.find(item=>item.id===pendingMode)?.title}</h2><p>{hasContentDifficulty(pendingMode)?'어떤 난이도로 도전할까요?':'어떤 국가들이 더 자주 나올까요?'}</p>
      <div className="gg-difficulty-options">{difficultyOptions(pendingMode).map((item,i)=><button key={item.id} type="button" autoFocus={i===0} onClick={()=>startDifficulty(item.id)}><b>{item.label}</b><span>{item.description}</span></button>)}</div>
    </dialog>}
    {!playing&&<button type="button" className="gg-ranking-open" onClick={openRanking}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3h8m-6-3h4v3"/></svg>랭킹</button>}
    {rankingOpen&&<GeoRanking initialMode={mode} initialDifficulty={difficulty} onClose={closeRanking}/>}
    {playing&&<><header className="gg-play-title"><span>{expert?'GEOWEB · 전문가':`GEOWEB PLAY · ${hasCountryDifficulty(mode)?'국가 출제 ':''}${difficultyLabel(tier)}`}</span><h1>{config.title}</h1><button type="button" className="gg-practice-toggle" aria-pressed={practice} onClick={()=>{setPractice(v=>!v);setSummary(false);}}>연습 모드 {practice?'켜짐':'꺼짐'}</button></header>
    <GeoGamePlay {...{question,mode,expert,practice,summary,busy,countdown,result,stats,tier,formula,setFormula,elapsed,leaving,mediaReady,mediaError,mediaLoaded,mediaFailed,skip,submit,input,answer,setAnswer,composing,nextButton,config,onTarget}} questionKey={`${mode}-${questionSequence}`}/>
    {summary&&<div className="gg-summary" onClick={event=>{if(event.target===event.currentTarget)returnToMenu();}} role="dialog" aria-modal="true" aria-labelledby="gg-summary-title" onKeyDown={e=>{if(e.key==='Escape')returnToMenu();if(e.key==='Tab'){const buttons=[...e.currentTarget.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}}}><div><div className="gg-eyebrow">ROUND COMPLETE</div><h2 id="gg-summary-title">오늘의 지구 탐험</h2>{finishReason&&<p role="status">{finishReason}</p>}<strong>{stats.score.toLocaleString()}<small>점</small></strong><p>정답 {stats.correct}개 · 최고 콤보 {stats.bestCombo} · {formatTime(elapsed)}</p><div className="gg-summary-actions"><button autoFocus onClick={returnToMenu}>게임 선택으로</button><button className="gg-mode-exit" onClick={()=>window.psModalMotion.exit(document.querySelector('.gg-summary'),onExit)}>게임모드 종료 ↗</button></div><div className="gg-summary-submit"><button type="button" onClick={openRanking}>랭킹 · 기록 제출</button></div></div></div>}
    </>}
  </section>;
}
