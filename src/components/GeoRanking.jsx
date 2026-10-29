import { useEffect, useRef, useState } from 'react';
import { GAME_MODES } from './geoGameData.js';
import { rankingAffiliation } from '../../public/spell-leaderboard.js';

const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
const played = value => value?.toDate ? new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short'}).format(value.toDate()) : '—';

export default function GeoRanking({ initialMode, record, onClose }) {
  const dialog=useRef(null),request=useRef(0),submitting=useRef(false);
  const [mode,setMode]=useState(initialMode),[rows,setRows]=useState([]),[mine,setMine]=useState(null),[signedIn,setSignedIn]=useState(false);
  const [cursor,setCursor]=useState(null),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [sending,setSending]=useState(false),[submitted,setSubmitted]=useState(false),[notice,setNotice]=useState('');
  useEffect(()=>{const node=dialog.current;node.showModal();return()=>{request.current++;node.close();};},[]);
  useEffect(()=>{load(false);return()=>{request.current++;};},[mode]);
  async function load(append=false) {
    const token=++request.current;setLoading(true);setError('');
    if(!append){setRows([]);setMine(null);setMore(false);setCursor(null);}
    try {
      if(!window.psGeoRanking)throw new Error('서버 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      const data=await window.psGeoRanking.load({mode},append?cursor:null);
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
      if(mode===record.mode)await load(false);else setMode(record.mode);
    } catch(e) {setNotice(e.message||'기록을 제출하지 못했어요. 다시 시도해 주세요.');}
    finally {submitting.current=false;setSending(false);}
  }
  let rank=1;
  return <dialog ref={dialog} className="gg-ranking-dialog" aria-labelledby="gg-ranking-title" onCancel={event=>{event.preventDefault();onClose();}} onClose={onClose}>
    <header><div><span className="gg-eyebrow">GEOWEB / RANKING</span><h2 id="gg-ranking-title">전체 플레이어 랭킹</h2></div><button type="button" onClick={onClose} aria-label="랭킹 닫기">×</button></header>
    <p className="gg-ranking-note">플레이어별 최고 점수 · 동점이면 소요 시간 순</p>
    <div className="gg-ranking-layout">
    <nav className="gg-ranking-games" aria-label="랭킹 게임 종류">{GAME_MODES.map(item=><button key={item.id} type="button" aria-pressed={mode===item.id} onClick={()=>setMode(item.id)}>{item.title}</button>)}</nav>
    <div className="gg-ranking-content">
    <div className="gg-ranking-scroll" tabIndex="0" aria-label="랭킹 목록"><table><thead><tr><th>순위</th><th>플레이어</th><th>점수</th><th>소요 시간</th><th>플레이 시각</th></tr></thead><tbody>
      {rows.map((row,i)=>{if(i===0||row.score!==rows[i-1].score||row.elapsedMs!==rows[i-1].elapsedMs)rank=i+1;return <tr key={row.id}><td>{rank}</td><td>{row.nickname}<small>{rankingAffiliation(row)}</small></td><td>{row.score.toLocaleString()}</td><td>{time(row.elapsedMs)}</td><td>{played(row.playedAt)}</td></tr>;})}
      {!rows.length&&<tr><td colSpan="5">{loading?'서버 기록을 불러오는 중…':error?'서버 기록 확인 불가':'첫 번째 지구 탐험 기록을 남겨 보세요.'}</td></tr>}
    </tbody></table></div>
    {error&&<p role="alert" className="gg-ranking-note">{error} <button type="button" onClick={()=>load(false)}>다시 시도</button></p>}
    {more&&<button type="button" disabled={loading} onClick={()=>load(true)}>{loading?'불러오는 중…':'더 보기'}</button>}
    <div className="gg-ranking-mine" role="status">{mine?`내 순위 ${mine.rank}위 · ${mine.nickname} · ${rankingAffiliation(mine)} · ${mine.score.toLocaleString()}점 · ${time(mine.elapsedMs)}`:signedIn?'이 게임에 제출한 내 기록이 없어요.':'로그인하면 내 기록과 순위를 볼 수 있어요.'}{!signedIn&&<button type="button" onClick={()=>{onClose();requestAnimationFrame(()=>document.querySelector('.ps-account-trigger')?.click());}}>로그인 및 프로필</button>}</div>
    <footer>{record?<><p className="gg-ranking-note">제출할 기록: {GAME_MODES.find(item=>item.id===record.mode)?.title} · {record.score.toLocaleString()}점 · {time(record.elapsedMs)}</p><button type="button" className="gg-ranking-submit" disabled={sending||submitted} onClick={submit}>{sending?'제출 중…':submitted?'제출 완료':'기록 제출'}</button></>:<p className="gg-ranking-note">게임을 마치면 기록을 제출할 수 있어요. 연습 모드는 제외됩니다.</p>}
    <p className="gg-ranking-note">기록 제출 시 별명·학교 이름(입력한 경우)·점수·소요 시간·플레이 시각이 공개됩니다.</p><p className="gg-ranking-note" role="status">{notice}</p></footer>
    </div></div>
  </dialog>;
}
