import {readPendingRecords,pendingBoardKey,acknowledgePendingRecord} from './geoPendingRecords.js';
import { useEffect, useRef, useState } from 'react';
import { DIFFICULTIES, difficultyLabel, hasCountryDifficulty,hasGameDifficulty,difficultyOptions } from './geoGameDifficulty.js';
import { GAME_MODES } from './geoGameData.js';
import { rankingAffiliation, compareRankingEfficiency } from '../../public/spell-leaderboard.js';

const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
const played = value => value?.toDate ? new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short'}).format(value.toDate()) : '—';

export default function GeoRanking({ initialMode, initialDifficulty='easy', onClose }) {
  const dialog=useRef(null),request=useRef(0),submitting=useRef(false),alive=useRef(true),mineBadge=useRef(null),minePanel=useRef(null),awardWord=useRef(null),animationTimers=useRef([]);
  const [difficulty,setDifficulty]=useState(initialDifficulty);
  const [mode,setMode]=useState(initialMode),[rows,setRows]=useState([]),[mine,setMine]=useState(null),[signedIn,setSignedIn]=useState(false);
  const [cursor,setCursor]=useState(null),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [sending,setSending]=useState(false),[notice,setNotice]=useState('');
  const [pending,setPending]=useState(()=>{try{return readPendingRecords(window.localStorage);}catch{return {};}}),[merging,setMerging]=useState(null),[award,setAward]=useState(null),[renewed,setRenewed]=useState(null);
  useEffect(()=>{alive.current=true;const changed=()=>{try{setPending(readPendingRecords(window.localStorage));}catch{}};window.addEventListener('storage',changed);return()=>{alive.current=false;animationTimers.current.forEach(clearTimeout);window.removeEventListener('storage',changed);};},[]);
  useEffect(()=>{const node=dialog.current;node.showModal();const unbind=window.psModalMotion.bindSheet(node,()=>dismiss());return()=>{unbind();request.current++;node.close();};},[]);
  const boardDifficulty=hasGameDifficulty(mode)?difficulty:undefined;
  const boardKey=pendingBoardKey(mode,boardDifficulty),record=pending[boardKey];
  const selectedTitle=GAME_MODES.find(item=>item.id===mode)?.title;
  useEffect(()=>{load(false);return()=>{request.current++;};},[mode,boardDifficulty]);
  useEffect(()=>{
    if(!award)return;
    return window.psRecordFeedback.fly(awardWord.current,mineBadge.current,()=>{if(alive.current){setRenewed(award.key);setAward(null);}},()=>setAward(previous=>previous?{...previous,flying:true}:null));
  },[award?.key]);
  async function load(append=false,retain=false) {
    const token=++request.current;setLoading(true);setError('');
    if(!append){setRows([]);if(!retain)setMine(null);setMore(false);setCursor(null);}
    try {
      if(!window.psGeoRanking)throw new Error('서버 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      const data=await window.psGeoRanking.load({mode,diff:boardDifficulty},append?cursor:null);
      if(token!==request.current||!alive.current)return;
      setRows(previous=>append?[...previous,...data.rows]:data.rows);setMine(data.mine);setSignedIn(data.signedIn);setCursor(data.cursor);setMore(data.more);
    } catch(e) {if(token===request.current)setError(e.message||'랭킹을 불러오지 못했어요. 다시 시도해 주세요.');}
    finally {if(token===request.current)setLoading(false);}
  }
  async function submit() {
    if(submitting.current||!record||merging)return;
    const candidate={...record},key=boardKey;
    submitting.current=true;setSending(true);setNotice('');
    try {
      if(!window.psGeoRanking)throw new Error('서버 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      const result=await window.psGeoRanking.submit(candidate);
      let next;try{next=acknowledgePendingRecord(window.localStorage,candidate);}catch{next={...pending};delete next[key];}
      if(!alive.current)return;
      setMerging({key,record:candidate});
      setNotice('기록을 제출했어요.');
      animationTimers.current.push(setTimeout(()=>{const focused=dialog.current?.querySelector('.gg-ranking-pending')?.contains(document.activeElement);try{setPending(readPendingRecords(window.localStorage));}catch{setPending(next);}setMerging(null);if(focused)requestAnimationFrame(()=>minePanel.current?.focus({preventScroll:true}));},360));
      await load(false,true);
      if(alive.current&&result?.improved){setRenewed(null);setAward({key,flying:false});}
    } catch(e) {if(alive.current)setNotice(e.message||'기록을 제출하지 못했어요. 다시 시도해 주세요.');}
    finally {submitting.current=false;if(alive.current)setSending(false);}
  }
  const dismiss=after=>window.psModalMotion.exit(dialog.current,()=>{onClose();if(typeof after==='function')requestAnimationFrame(after);});
  let rank=1;
  return <dialog ref={dialog} className="gg-ranking-dialog" aria-labelledby="gg-ranking-title" onCancel={event=>{event.preventDefault();dismiss();}}>
    <header className="gg-ranking-header">
      <div className="gg-ranking-heading">
        <div className="gg-ranking-kicker"><span className="gg-eyebrow">GEOWEB / RANKING</span><span className="gg-ranking-note">플레이어별 최고 점수</span></div>
        <div className="gg-ranking-title-row"><h2 id="gg-ranking-title">전체 플레이어 랭킹</h2>
        {hasGameDifficulty(mode)?<nav className="gg-ranking-levels" aria-label="랭킹 난이도">{[...difficultyOptions(mode),{id:'legacy',label:'이전 기록'}].map(item=><button key={item.id} type="button" aria-pressed={difficulty===item.id} disabled={sending||!!merging||!!award} onClick={()=>setDifficulty(item.id)}>{item.label}</button>)}</nav>:<span className="gg-ranking-note">고정 난이도 · {difficultyLabel(GAME_MODES.find(item=>item.id===mode)?.tier)}</span>}
        </div>
      </div>
      <div className="gg-ranking-help"><p>공개 항목: 별명·학교(입력 시)·콤보·점수·소요 시간·플레이 시각</p>
        <p>미제출 기록은 이 브라우저에 보관돼요.</p>
        {notice&&<p role="status">{notice}</p>}
      </div>
      <div className="gg-ranking-actions"><button type="button" className="gg-ranking-refresh" disabled={loading||sending||!!merging||!!award} onClick={()=>load(false)} aria-label="기록 새로고침" title="기록 새로고침"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg></button><button type="button" className="gg-ranking-close" onClick={()=>dismiss()} aria-label="랭킹 닫기">×</button></div>
    </header>
    <div className="gg-ranking-layout">
    <nav className="gg-ranking-games" aria-label="랭킹 게임 종류">{GAME_MODES.map(item=><button key={item.id} type="button" aria-pressed={mode===item.id} disabled={sending||!!merging||!!award} onClick={()=>{setMode(item.id);if(difficulty!=='legacy'&&!difficultyOptions(item.id).some(level=>level.id===difficulty))setDifficulty('easy');}}>{item.title}</button>)}</nav>
    <div className="gg-ranking-content">
    <div className="gg-ranking-scroll" tabIndex="0" aria-label="랭킹 목록"><table><thead><tr><th>순위</th><th>플레이어</th><th>최대 콤보</th><th>점수</th><th>소요 시간</th><th>플레이 시각</th></tr></thead><tbody>
      {rows.map((row,i)=>{if(i===0||compareRankingEfficiency(row,rows[i-1])!==0)rank=i+1;return <tr key={row.id}><td>{rank}</td><td>{row.nickname}<small>{rankingAffiliation(row)}</small></td><td>{row.maxCombo??'—'}</td><td>{row.score.toLocaleString()}</td><td>{time(row.elapsedMs)}</td><td>{played(row.playedAt)}</td></tr>;})}
      {!rows.length&&<tr><td colSpan="6">{loading?'서버 기록을 불러오는 중…':error?'서버 기록 확인 불가':'첫 번째 지구 탐험 기록을 남겨 보세요.'}</td></tr>}
    </tbody></table></div>
    {error&&<p role="alert" className="gg-ranking-note">{error} <button type="button" onClick={()=>load(false)}>다시 시도</button></p>}
    {more&&<button type="button" disabled={loading} onClick={()=>load(true)}>{loading?'불러오는 중…':'더 보기'}</button>}
    </div></div>
    <div className="gg-ranking-personal">
    {(record||merging?.key===boardKey)&&<div className={`gg-ranking-pending ${merging?.key===boardKey?'gg-ranking-pending-merge':''}`} aria-label="미제출 기록">
      <div><span className="gg-eyebrow">NEW RECORD · 미제출</span><strong>{(merging?.key===boardKey?merging.record:record).score.toLocaleString()}점 <small>· {time((merging?.key===boardKey?merging.record:record).elapsedMs)}</small></strong><small>{selectedTitle} · {difficultyLabel(boardDifficulty)}</small></div>
      <button type="button" className="gg-ranking-submit" disabled={sending||!!merging||loading||!!award} onClick={submit}>{sending?'제출 중…':merging?'제출 완료':'기록 제출'}</button>
    </div>}
    <section ref={minePanel} tabIndex={-1} className={`gg-ranking-mine ${merging?.key===boardKey?'gg-ranking-mine-merge':''}`} aria-label="내 최고 기록" role="status">
      <div className="gg-ranking-mine-label"><span className="gg-eyebrow">MY BEST RECORD</span><h3>{selectedTitle}{boardDifficulty?` · ${difficultyLabel(boardDifficulty)}`:''}</h3><span ref={mineBadge} className={`gg-ranking-renewed ${renewed===boardKey?'is-renewed':''}`} aria-hidden={renewed!==boardKey}>경신!</span>{mine&&<p>{mine.nickname} · {rankingAffiliation(mine)} · {played(mine.playedAt)}</p>}</div>
      {loading?<p>내 순위를 확인하고 있어요…</p>:error?<p>내 기록을 확인하지 못했어요. 다시 시도해 주세요.</p>:mine?<p className="gg-ranking-mine-score"><strong>{mine.rank}위</strong><span>최대 콤보 {mine.maxCombo==null?'—':`${mine.maxCombo}회`}</span><b>{mine.score.toLocaleString()}점</b><span>소요 {time(mine.elapsedMs)}</span></p>:<p>{signedIn?'이 게임·난이도에 제출한 기록이 없어요.':'프로필을 만들면 내 기록과 순위를 볼 수 있어요.'}</p>}
      {!loading&&!signedIn&&<button type="button" onClick={()=>{dismiss(()=>document.querySelector('.ps-account-trigger')?.click());}}>내 프로필 만들기</button>}
    </section></div>
    {award&&<div className={`gg-ranking-award ${award.flying?'is-flying':''}`} role="status"><div className="gg-ranking-award-flash"/><div className="gg-ranking-award-title"><small>NEW PERSONAL BEST</small><strong><span className="gg-ranking-award-prefix">기록 </span><span ref={awardWord} className="gg-ranking-award-word">경신!</span></strong></div></div>}

  </dialog>;
}
