import { useEffect, useRef, useState } from 'react';
import { DIFFICULTIES, difficultyLabel, hasCountryDifficulty } from './geoGameDifficulty.js';
import { GAME_MODES } from './geoGameData.js';
import { rankingAffiliation, compareRankingEfficiency } from '../../public/spell-leaderboard.js';

const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
const played = value => value?.toDate ? new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short'}).format(value.toDate()) : '—';

export default function GeoRanking({ initialMode, initialDifficulty='easy', record, onClose }) {
  const dialog=useRef(null),request=useRef(0),submitting=useRef(false);
  const [difficulty,setDifficulty]=useState(initialDifficulty);
  const [mode,setMode]=useState(initialMode),[rows,setRows]=useState([]),[mine,setMine]=useState(null),[signedIn,setSignedIn]=useState(false);
  const [cursor,setCursor]=useState(null),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [sending,setSending]=useState(false),[submitted,setSubmitted]=useState(false),[notice,setNotice]=useState('');
  useEffect(()=>{const node=dialog.current;node.showModal();const unbind=window.psModalMotion.bindSheet(node,()=>dismiss());return()=>{unbind();request.current++;node.close();};},[]);
  const boardDifficulty=hasCountryDifficulty(mode)?difficulty:undefined;
  useEffect(()=>{load(false);return()=>{request.current++;};},[mode,boardDifficulty]);
  async function load(append=false) {
    const token=++request.current;setLoading(true);setError('');
    if(!append){setRows([]);setMine(null);setMore(false);setCursor(null);}
    try {
      if(!window.psGeoRanking)throw new Error('서버 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      const data=await window.psGeoRanking.load({mode,diff:boardDifficulty},append?cursor:null);
      if(token!==request.current)return;
      setRows(previous=>append?[...previous,...data.rows]:data.rows);setMine(data.mine);setSignedIn(data.signedIn);setCursor(data.cursor);setMore(data.more);
    } catch(e) {if(token===request.current)setError(e.message||'랭킹을 불러오지 못했어요. 다시 시도해 주세요.');}
    finally {if(token===request.current)setLoading(false);}
  }
  async function submit() {
    if(submitting.current||!record)return;
    submitting.current=true;setSending(true);setNotice('');
    try {
      if(!window.psGeoRanking)throw new Error('서버 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      await window.psGeoRanking.submit(record);setSubmitted(true);setNotice('기록을 제출했어요. 기존 최고 기록보다 좋을 때 갱신됩니다.');
      if(mode===record.mode&&boardDifficulty===record.diff)await load(false);else{setMode(record.mode);setDifficulty(record.diff||initialDifficulty);}
    } catch(e) {setNotice(e.message||'기록을 제출하지 못했어요. 다시 시도해 주세요.');}
    finally {submitting.current=false;setSending(false);}
  }
  const dismiss=after=>window.psModalMotion.exit(dialog.current,()=>{onClose();if(typeof after==='function')requestAnimationFrame(after);});
  let rank=1;
  return <dialog ref={dialog} className="gg-ranking-dialog" aria-labelledby="gg-ranking-title" onCancel={event=>{event.preventDefault();dismiss();}}>
    <header className="gg-ranking-header">
      <div className="gg-ranking-heading">
        <div className="gg-ranking-kicker"><span className="gg-eyebrow">GEOWEB / RANKING</span><span className="gg-ranking-note">플레이어별 최고 점수</span></div>
        <div className="gg-ranking-title-row"><h2 id="gg-ranking-title">전체 플레이어 랭킹</h2>
        {hasCountryDifficulty(mode)?<nav className="gg-ranking-levels" aria-label="랭킹 난이도">{[...DIFFICULTIES,{id:'legacy',label:'이전 기록'}].map(item=><button key={item.id} type="button" aria-pressed={difficulty===item.id} onClick={()=>setDifficulty(item.id)}>{item.label}</button>)}</nav>:<span className="gg-ranking-note">고정 난이도 · {difficultyLabel(GAME_MODES.find(item=>item.id===mode)?.tier)}</span>}
        </div>
      </div>
      <div className="gg-ranking-help"><p>기록 제출 시 별명·학교 이름(입력한 경우)·점수·소요 시간·플레이 시각이 공개됩니다.</p>
        {record?<div className="gg-ranking-top-submit"><span>{GAME_MODES.find(item=>item.id===record.mode)?.title}{record.diff?` · ${difficultyLabel(record.diff)}`:''} · {record.score.toLocaleString()}점 · {time(record.elapsedMs)}</span><button type="button" className="gg-ranking-submit" disabled={sending||submitted} onClick={submit}>{sending?'제출 중…':submitted?'제출 완료':'기록 제출'}</button></div>:<p>게임을 마치면 기록을 제출할 수 있어요. 연습 모드는 제외됩니다.</p>}
        {notice&&<p role="status">{notice}</p>}
      </div>
      <div className="gg-ranking-actions"><button type="button" className="gg-ranking-refresh" disabled={loading} onClick={()=>load(false)} aria-label="기록 새로고침" title="기록 새로고침"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg></button><button type="button" className="gg-ranking-close" onClick={()=>dismiss()} aria-label="랭킹 닫기">×</button></div>
    </header>
    <div className="gg-ranking-layout">
    <nav className="gg-ranking-games" aria-label="랭킹 게임 종류">{GAME_MODES.map(item=><button key={item.id} type="button" aria-pressed={mode===item.id} onClick={()=>setMode(item.id)}>{item.title}</button>)}</nav>
    <div className="gg-ranking-content">
    <div className="gg-ranking-scroll" tabIndex="0" aria-label="랭킹 목록"><table><thead><tr><th>순위</th><th>플레이어</th><th>점수</th><th>소요 시간</th><th>플레이 시각</th></tr></thead><tbody>
      {rows.map((row,i)=>{if(i===0||compareRankingEfficiency(row,rows[i-1])!==0)rank=i+1;return <tr key={row.id}><td>{rank}</td><td>{row.nickname}<small>{rankingAffiliation(row)}</small></td><td>{row.score.toLocaleString()}</td><td>{time(row.elapsedMs)}</td><td>{played(row.playedAt)}</td></tr>;})}
      {!rows.length&&<tr><td colSpan="5">{loading?'서버 기록을 불러오는 중…':error?'서버 기록 확인 불가':'첫 번째 지구 탐험 기록을 남겨 보세요.'}</td></tr>}
    </tbody></table></div>
    {error&&<p role="alert" className="gg-ranking-note">{error} <button type="button" onClick={()=>load(false)}>다시 시도</button></p>}
    {more&&<button type="button" disabled={loading} onClick={()=>load(true)}>{loading?'불러오는 중…':'더 보기'}</button>}
    </div></div>
    <section className="gg-ranking-mine" aria-label="내 최고 기록" role="status">
      <div className="gg-ranking-mine-label"><span className="gg-eyebrow">MY BEST RECORD</span><h3>내 최고 기록{boardDifficulty?` · ${difficultyLabel(boardDifficulty)}`:''}</h3>{mine&&<p>{mine.nickname} · {rankingAffiliation(mine)} · {played(mine.playedAt)}</p>}</div>
      {loading?<p>내 순위를 확인하고 있어요…</p>:error?<p>내 기록을 확인하지 못했어요. 다시 시도해 주세요.</p>:mine?<p className="gg-ranking-mine-score"><strong>{mine.rank}위</strong><b>{mine.score.toLocaleString()}점</b><span>소요 {time(mine.elapsedMs)}</span></p>:<p>{signedIn?'이 게임·난이도에 제출한 기록이 없어요.':'프로필을 만들면 내 기록과 순위를 볼 수 있어요.'}</p>}
      {!loading&&!signedIn&&<button type="button" onClick={()=>{dismiss(()=>document.querySelector('.ps-account-trigger')?.click());}}>내 프로필 만들기</button>}
    </section>
  </dialog>;
}
