import {createOfflineBattle} from '../../public/battle-offline.js';
import {createJoinNotice} from "../../public/battle-join-notice.js";
import GeoGamePlay from "./GeoGamePlay.jsx";
import {GAME_MODES} from "./geoGameData.js";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./geoBattle.css";
import { watchGameFocus } from "../../public/game-focus-guard.js";

import { difficultyOptions, EXPERT_ANSWER_MS } from "./geoGameDifficulty.js";

const base = import.meta.env.DEV
  ? "/api/geoweb-battle"
  : "https://spell-drill-battle-1093702239224.asia-northeast3.run.app/api/geoweb-battle";
const roomKey = "ps-geoweb-battle-room.v1";
function clearInviteCode() {
  const url = new URL(location.href);
  if (url.searchParams.has("geoBattle")) {
    url.searchParams.delete("geoBattle");
    history.replaceState(null, "", url);
  }
}
const modes = [
  ["country", "나라 이름"],
  ["capital-easy", "수도 이름"],
  ["capital-hard", "수도 위치"],
  ["flag", "국기"],
  ["nature", "자연환경"],
  ["landmark", "랜드마크"],
];
const teamColors = ["#ffb11a", "#69c7b5", "#829def", "#ed89a5", "#b2cf72", "#b294df", "#e99a6c", "#72bddc", "#cf8dc5", "#7ab88e"];

function GamePicker({ value, onChange, busy }) {
  const list = useRef(null);
  const drag = useRef(null);
  const wheelIdle = useRef(null);
  const wheelDirection = useRef(0);
  const positioned = useRef(false);
  const index = modes.findIndex(([key]) => key === value);
  function step(direction) {
    const next = modes[index + direction]?.[0];
    if (!busy && next) onChange(next);
  }
  useEffect(() => {
    const active = list.current?.children[index];
    if (active) {
      list.current.scrollTo({top:active.offsetTop-active.offsetHeight,
        behavior:positioned.current&&!matchMedia("(prefers-reduced-motion: reduce)").matches?"smooth":"auto"});
      positioned.current=true;
    }
  }, [index]);
  useEffect(() => {
    const wheel = list.current;
    function handleWheel(event) {
      if (!event.deltaY || event.ctrlKey) return;
      event.preventDefault();
      const direction=Math.sign(event.deltaY);
      const first = wheelIdle.current === null || direction !== wheelDirection.current;
      wheelDirection.current=direction;
      clearTimeout(wheelIdle.current);
      wheelIdle.current = setTimeout(() => { wheelIdle.current = null; }, 180);
      if (first) step(Math.sign(event.deltaY));
    }
    wheel.addEventListener("wheel", handleWheel, { passive: false });
    return () => wheel.removeEventListener("wheel", handleWheel);
  }, [index, busy, onChange]);
  useEffect(() => () => clearTimeout(wheelIdle.current), []);
  return (
    <div className="gb-game-picker">
      <div className="gb-game-wheel" ref={list} aria-label="게임 종류"
        onPointerDown={event => {
          if (event.isPrimary && event.button === 0) drag.current = event.clientY;
        }}
        onPointerMove={event => {
          if (drag.current !== null && Math.abs(drag.current - event.clientY) >= 8) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={event => {
          const start = drag.current;
          drag.current = null;
          if (start !== null && Math.abs(start - event.clientY) >= 8) step(Math.sign(start - event.clientY));
        }}
        onPointerCancel={() => { drag.current = null; }}
        onPointerLeave={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) drag.current = null;
        }}>
        {modes.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={key === value} disabled={busy} onClick={() => onChange(key)}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function LobbyStepper({ title, label, value, previous, next, onChange, busy }) {
  return (
    <div className="gb-lobby-setting">
      <small>{title}</small>
      <span>{label}</span>
      <div className="gb-stepper">
        <output aria-label={label}>{value}</output>
        <div>
          <button type="button" aria-label={label + " 다음"} disabled={busy || next == null} onClick={() => onChange(next)}>
            <span className="gb-arrow gb-arrow-up" aria-hidden="true" />
          </button>
          <button type="button" aria-label={label + " 이전"} disabled={busy || previous == null} onClick={() => onChange(previous)}>
            <span className="gb-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BattleLeaderboard({ room }) {
  const list = useRef(null);
  const previous = useRef(new Map());
  const entries = room.mode === "individual"
    ? room.standings ?? []
    : (room.teamTotals ?? []).map((score, id) => ({ id, score, name: room.teamNames[id] }));
  const ranked = [...entries].sort((a, b) => b.score - a.score);
  useLayoutEffect(() => {
    const next = new Map();
    const animate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const row of list.current.children) {
      const { key, score } = row.dataset;
      const top = row.offsetTop;
      const old = previous.current.get(key);
      next.set(key, { top, score });
      if (!animate || !old) continue;
      if (top !== old.top) {
        row.getAnimations().forEach(animation => animation.cancel());
        row.animate([{ transform: `translateY(${old.top - top}px)` }, { transform: "none" }],
          { duration: 320, easing: "cubic-bezier(.2,.75,.2,1)" });
        row.animate([{boxShadow:"0 0 0 2px #ffffff99"},{boxShadow:"0 0 0 0px #ffffff00"}],{duration:600});
      }
      if (score !== old.score) row.lastElementChild.animate(
        [{ color: "#fff", textShadow: "0 0 14px #fff" }, { color: "#ffcb73", textShadow: "none" }],
        { duration: 340 },
      );
    }
    previous.current = next;
  });
  return (
    <section className={`gb-scoreboard gb-board-${room.mode}`} aria-label="순위표">
      <h3>{room.phase === "finished" ? "최종 순위" : "실시간 순위"}</h3>
      <ol ref={list}>
        {ranked.map(({ id, name, score, photo, connected }) => (
          <li key={id} className={id===ranked[0]?.id?"gb-first-place":""} style={{"--team-color":teamColors[Number(id)%teamColors.length]||"#ffb11a"}} data-key={id} data-score={score}>
            <span>{ranked.findIndex(entry => entry.score === score) + 1}위</span>
            <span>{room.mode==="individual"&&(<img src={photo||"/images/dexter-base-character-01.png"} alt="" referrerPolicy="no-referrer"/>)}{name}{connected===false&&<small> · 연결 끊김</small>}</span>
            <strong>{score.toLocaleString()}<small>점</small></strong>
            {room.mode==="team"&&<div className="gb-team-scores">{room.players.filter(p=>p.team===id).sort((a,b)=>b.score-a.score).map(p=><div key={p.id}>{<img src={p.photo||"/images/dexter-base-character-01.png"} alt="" referrerPolicy="no-referrer"/>}<span>{p.name}</span><b>{p.score.toLocaleString()}점</b></div>)}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function BattleResult({room,host}) {
  const entries=room.mode==="individual"?room.standings:(room.teamTotals||[]).map((score,id)=>({id,score,name:room.teamNames[id]}));
  const sorted=[...entries].sort((a,b)=>b.score-a.score);
  const own=entries.find(p=>p.id===(room.mode==="individual"?room.me:room.myTeam));
  const rank=own?1+entries.filter(p=>p.score>own.score).length:1;
  return <section className="gb-results">
    <div className="gb-winning-score"><small>1위 · {sorted[0]?.name} · {room.phase==="finished"?"합산 점수":"라운드 점수"}</small><strong>{(sorted[0]?.score||0).toLocaleString()}</strong></div>
    <small>{room.phase==="finished"?"MATCH COMPLETE":"ROUND COMPLETE"}</small>
    <h1>{host?(room.phase==="finished"?"대항전 종료":room.round+"라운드 종료"):(room.mode==="individual"?"내 순위 ":"우리 팀 ")+rank+"위"}</h1>
    {own&&<p className="gb-final-total">{room.phase==="finished"?"최종 합산 점수":"이번 라운드 점수"} <b>{own.score.toLocaleString()}점</b></p>}
    <p>{room.phase==="between"?"":room.endedEarly?"진행자가 경기를 종료했어요. 지금까지의 점수로 순위를 정했어요.":"함께해서 더 멋진 경기였어요."}</p>
  </section>;
}

export default function GeoBattle({ pools, onTarget, onOpenChange, musicControls }) {
  const [open, setOpen] = useState(false),
    [gate, setGate] = useState("checking"),
    [error, setError] = useState(""),
    [session, setSession] = useState(null),
    [room, setRoom] = useState(null),
    [entry, setEntry] = useState(null),
    [code, setCode] = useState(""),
    [mode, setMode] = useState("team"),
    [teamCount, setTeamCount] = useState(2),
    [busy, setBusy] = useState(false),
    [answer, setAnswer] = useState(""),
    [focusPaused, setFocusPaused] = useState(false),
    [feedback, setFeedback] = useState(""),
    [scoreEffect, setScoreEffect] = useState(null),
    [skipEffect,setSkipEffect]=useState(null),
    [formula,setFormula]=useState(false),
    [media,setMedia]=useState({}),
    [clock, setClock] = useState(Date.now()),
    [confirmExit, setConfirmExit] = useState(false),
    [managed, setManaged] = useState(null),
    [moveTo, setMoveTo] = useState(0),
    [dragged, setDragged] = useState(null),
    [dropTeam, setDropTeam] = useState(null);
  const {musicEnabled,playMusic,toggleMusic}=musicControls;
  const joinNotice=useRef(null);
  useEffect(()=>{if(!open||!backdrop.current)return;joinNotice.current=createJoinNotice(backdrop.current);return()=>{joinNotice.current?.dispose();joinNotice.current=null;};},[open]);
  useEffect(()=>{joinNotice.current?.update(room);},[room]);
  const answerInput=useRef(null), answerComposing=useRef(false);
  const sessionRef = useRef(null),
    roomRef = useRef(null),
    serverOffset = useRef(0),
    pending = useRef(false),
    refreshing = useRef(false),
    touchDrag = useRef(null),
    suppressManage = useRef(0),
    backdrop = useRef(null),
    screen = useRef(null),
    roster = useRef(null),
    teamPositions = useRef(new Map());
  sessionRef.current = session;
  roomRef.current = room;
  const offlineBattle=useRef(null);
  if(!offlineBattle.current)offlineBattle.current=createOfflineBattle("geo");
  async function api(path,body){return offlineBattle.current.request(path,body,networkApi);}
  async function networkApi(path, body) {
    const response = await fetch(`${base}/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(sessionRef.current
          ? { Authorization: `Bearer ${sessionRef.current.token}` }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(9000),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error("서버 응답을 확인할 수 없습니다. 다시 시도해 주세요.");
    }
    if (!response.ok) {
      const issue = Error(data.error || "요청을 처리하지 못했습니다.");
      issue.status = response.status;
      throw issue;
    }
    const serverNow = data.serverNow ?? data.room?.serverNow;
    if (Number.isFinite(serverNow)) serverOffset.current = serverNow - Date.now();
    return data;
  }
  function failure(e) {
    setGate(e?.status === 401 ? "unauthenticated" : "offline");
    setError(e?.message || "네트워크 연결을 확인하고 다시 시도해 주세요.");
  }
  async function authenticate() {
    setGate("checking");
    setError("");
    try {
      if (!navigator.onLine)
        throw Error("네트워크 연결을 확인하고 다시 시도해 주세요.");
      if (!window.psBattleIdentity) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if(!window.psBattleIdentity)throw Error('계정 서버 연결을 준비하지 못했어요. 다시 시도해 주세요.');
      const identity = await window.psBattleIdentity();
      if (!identity) {
        setGate("unauthenticated");
        return;
      }
      if(identity.photo?.startsWith("data:")&&(!identity.photo.startsWith("data:image/webp;")||identity.photo.length>8000)){
        const image=new Image();image.src=identity.photo;await image.decode();
        const canvas=document.createElement("canvas");canvas.width=canvas.height=48;
        canvas.getContext("2d").drawImage(image,0,0,48,48);
        identity.photo=canvas.toDataURL("image/webp",.65);
      }
      const next = await api("session", identity);
      if (sessionRef.current?.id && sessionRef.current.id !== next.id) {
        setRoom(null);
        roomRef.current = null;
      }
      sessionRef.current = next;
      setSession(next);
      setGate("ready");
      const inviteCode = new URLSearchParams(location.search).get("geoBattle");
      const saved = /^\d{6}$/.test(inviteCode || "")
        ? inviteCode
        : sessionStorage.getItem(roomKey);
      if (saved) {
        try {
          const joined = await api(`rooms/${saved}/join`, {photo:next.photo||""});
          setRoom(joined);
          roomRef.current = joined;
          sessionStorage.setItem(roomKey, saved);
        } catch (e) {
          if (!e.status || e.status >= 500) {
            failure(e);
            return;
          }
          sessionStorage.removeItem(roomKey);
          clearInviteCode();
          setRoom(null);roomRef.current=null;setEntry(null);await close();
        }
      }
    } catch (e) {
      if (e?.status === 400 || e?.status === 403) {
        setGate("unauthenticated");
        setError(e.message);
      } else failure(e);
    }
  }
  async function load(value) {
    const previous = roomRef.current;
    const next = await api(`rooms/${value}`);
    if (roomRef.current !== previous) return next;
    if (next.dailyClosed || next.phase === "cancelled") {
      roomRef.current = null;
      setRoom(null);
      setEntry(null);
      sessionStorage.removeItem(roomKey);
      clearInviteCode();
      setError("");setScoreEffect(null);setSkipEffect(null);window.psGameQr?.closeInvitation();
      if(next.dailyClosed)await close();
      return next;
    }
    if (previous?.settings.level === "expert" &&
        previous.question && !previous.nextQuestion && (previous.question.index !== next.question?.index || previous.round !== next.round)) {
      setAnswer("");
      setFeedback("");
    }
    setRoom(next);
    roomRef.current = next;
    sessionStorage.setItem(roomKey, next.code);
    setGate("ready");
    return next;
  }
  async function refreshRoom() {
    if (refreshing.current || pending.current || !roomRef.current) return;
    refreshing.current = true;
    try {
      await load(roomRef.current.code);
    } catch (error) {
      if (error.status === 400 && /내보내졌|게임 코드를 확인/.test(error.message)) {
        setRoom(null);
        roomRef.current = null;
        setEntry(null);
        sessionStorage.removeItem(roomKey);
        clearInviteCode();
        setError(error.message);
      } else failure(error);
    } finally {
      refreshing.current = false;
    }
  }
  async function act(path, body) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api(path, body);
      if (next?.room) {
        setRoom(next.room);
        roomRef.current = next.room;
      } else if (next?.code) {
        setRoom(next);
        roomRef.current = next;
      }
      return next;
    } catch (e) {
      setError(e.message);
      if (!e.status || e.status === 401) failure(e);
      throw e;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function enter(event) {
    if (event && musicEnabled) playMusic();
    setEntry(null);
    setOpen(true);
    onOpenChange?.(true);
    await authenticate();
  }
  async function dismiss(element) {
    if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    await element.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }], {
      duration: 160, easing: "ease-in", fill: "forwards",
    }).finished.catch(() => {});
  }
  async function close() {

    setManaged(null);
    window.psGameQr?.closeInvitation();
    await dismiss(backdrop.current);
    setOpen(false);
    onOpenChange?.(false);
    setError("");
  }
  async function showInvite(code) {
    try {
      const invite = await api(`rooms/${code}/qr`);
      if (backdrop.current) window.psGameQr.openInvitation({
        image: invite.image, label: `대항전 ${code} 참여 QR 코드`, container: backdrop.current,
      });
    } catch (error) { setError(error.message); }
  }
  async function create() {
    const next = await act("rooms", { mode, teamCount, photo:session?.photo||"" });
    if (next) {
      sessionStorage.setItem(roomKey, next.code);
      setRoom(next);
      await showInvite(next.code);
    }
  }
  async function join() {
    if (!/^\d{6}$/.test(code)) {
      setError("여섯 자리 참가 코드를 입력해 주세요.");
      return;
    }
    const next = await act(`rooms/${code}/join`, {photo:session?.photo||""});
    if (next) {
      sessionStorage.setItem(roomKey, code);
      setRoom(next);
    }
  }
  async function leave() {
    if (!room) return;
    setConfirmExit(false);
    const host = room.me === room.host;
    try {
      await act(`rooms/${room.code}/${host ? "end" : "leave"}`, {});
      setRoom(null);
      setEntry(null);
      roomRef.current = null;
      sessionStorage.removeItem(roomKey);
      clearInviteCode();
      window.psGameQr?.closeInvitation();
    } catch {}
  }
  const expertDeadline = room?.settings.level === "expert" && room?.question?.startedAt != null
    ? room.question.startedAt + EXPERT_ANSWER_MS
    : null;
  const expertSeconds = expertDeadline == null ? null : Math.ceil((expertDeadline - clock - serverOffset.current) / 1000);
  const expertExpired = !focusPaused && expertSeconds != null && expertSeconds <= 0;
  const shownQuestion = expertExpired ? room.nextQuestion : room?.question;
  const shownSeconds = expertExpired && shownQuestion
    ? Math.ceil((shownQuestion.startedAt + EXPERT_ANSWER_MS - clock - serverOffset.current) / 1000)
    : expertSeconds;
  const game = room?.settings.difficulty ?? "country";
  const questionKey=`${room?.code}-${room?.round}-${shownQuestion?.index}`;
  const playQuestion=useMemo(()=>shownQuestion?(pools[game]?.find(item=>item.id===shownQuestion.id)||{...shownQuestion,name:shownQuestion.cue,photos:shownQuestion.image?[shownQuestion]:[]}):null,[pools,game,shownQuestion?.id]);
  const playConfig=GAME_MODES.find(item=>item.id===game);
  const playTier=room?.settings.level==='expert'?'hard':room?.settings.level||playConfig?.tier||'easy';
  const mediaReady=media.key===questionKey&&media.ready,mediaError=media.key===questionKey&&media.error;
  useEffect(()=>{setAnswer("");},[questionKey]);
  useEffect(()=>{if(!skipEffect)return;const timer=setTimeout(()=>setSkipEffect(null),1400);return()=>clearTimeout(timer);},[skipEffect]);
  async function skipQuestion(){if(room.stats?.passesRemaining<=0)return;const name=playQuestion?.name;await act(`rooms/${room.code}/pass`,{index:shownQuestion.index});setScoreEffect(null);setSkipEffect({skipped:true,text:name,id:performance.now()});setAnswer("");}
  useEffect(()=>{if(!scoreEffect)return;const timer=setTimeout(()=>setScoreEffect(null),2200);return()=>clearTimeout(timer);},[scoreEffect]);
  useEffect(() => {
    if (!room?.nextQuestion?.image) return;
    const image = new Image();
    image.src = room.nextQuestion.image;
    image.decode?.().catch(() => {});
  }, [room?.nextQuestion?.image]);
  async function submit(e) {
    e.preventDefault();
    if (focusPaused || !answer.trim() || !shownQuestion || (shownSeconds != null && shownSeconds <= 0)) return;
    try {
      setSkipEffect(null);
      const result = await act(`rooms/${room.code}/answer`, {
        answer,
        index: shownQuestion.index,
      });
      window.psGameSfx?.answer(result.correct,undefined,result.details?.speedTag);
      setScoreEffect(result.correct && result.details?{ ...result.details, id: performance.now() }:null);
      setFeedback(
        result.correct ? `정답! +${result.points}점` : "다시 생각해 보세요.",
      );
      if (result.correct) setAnswer("");
    } catch {}
  }
  useEffect(()=>{if(room?.code){const url=new URL(location.href);url.searchParams.set("geoBattle",room.code);history.replaceState(null,"",url);}},[room?.code]);
  useEffect(() => {
    const inviteCode = new URLSearchParams(location.search).get("geoBattle");
    if ((inviteCode && /^\d{6}$/.test(inviteCode)) || sessionStorage.getItem(roomKey)) enter();
  }, []);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(id);
  }, [open]);
  useEffect(() => {
    if (!open || !room) return;
    const id = setInterval(() => {
      if (document.hidden || pending.current) return;
      refreshRoom();
    }, 900);
    return () => clearInterval(id);
  }, [open, room?.code]);
  useEffect(() => {
    const off = () => {
      if(roomRef.current?.phase==="playing"){refreshRoom();return;}
      setGate("offline");
      setError("네트워크 연결이 끊어졌습니다. 연결 후 다시 시도해 주세요.");
    };
    const on = () => {
      if (open) {if(roomRef.current)refreshRoom();else authenticate();}
    };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, [open]);
  useEffect(() => {
    if (!open || focusPaused || expertDeadline == null) return;
    let timeout;
    let cancelled = false;
    let expired = false;
    async function advance() {
      if (cancelled) return;
      const remaining = expertDeadline - Date.now() - serverOffset.current;
      if (remaining > 0) {
        timeout = setTimeout(advance, remaining);
        return;
      }
      if (!expired) {
        expired = true;
        setAnswer("");
        setFeedback("");
        setClock(Date.now());
      }
      if (!document.hidden) await refreshRoom();
      if (!cancelled && roomRef.current?.question?.startedAt + EXPERT_ANSWER_MS === expertDeadline) {
        timeout = setTimeout(advance, 100);
      }
    }
    timeout = setTimeout(advance, Math.max(0, expertDeadline - Date.now() - serverOffset.current));
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [open, focusPaused, expertDeadline]);
  const deadline =
    room?.phase === "starting"
      ? room.startsAt
      : room?.phase === "between"
        ? room.nextAt
        : room?.deadline;
  const localDeadline = useMemo(() => deadline ? deadline - serverOffset.current : null, [deadline]);
  const countdown = localDeadline == null
    ? 0
    : Math.max(0, Math.ceil((localDeadline - clock) / 1000));
  const host = room?.me === room?.host,
    me = room?.players?.find((p) => p.id === room.me),
    ready = room?.players?.filter((p) => p.ready).length || 0;
  const managedPlayer = host && room?.phase === "lobby" ? room.players.find(player => player.id === managed) : null;
  function finishTouchDrag(event) {
    const state = touchDrag.current;
    if (!state) return;
    clearTimeout(state.timer);
    touchDrag.current = null;
    if (!state.held) return;
    suppressManage.current = Date.now() + 350;
    const team = document.elementFromPoint(event.clientX, event.clientY)?.closest(".gb-roster [data-team]");
    if (event.type !== "pointercancel" && team) movePlayer(state.playerId, Number(team.dataset.team));
    setDragged(null);
    setDropTeam(null);
  }
  function movePlayer(playerId, team) {
    act(`rooms/${room.code}/move`, { playerId, team }).catch(() => {});
  }
  const focusGuardActive = open && !host && ["starting", "playing", "between"].includes(room?.phase);
  useEffect(() => {
    if (!focusGuardActive) { setFocusPaused(false); return; }
    const code = room.code;
    let pauseRequest = Promise.resolve();
    return watchGameFocus({
      initialPaused: me?.focusPausedAt != null,
      warned: me?.focusWarned,
      pause: () => {
        setFocusPaused(true);
        pauseRequest = api(`rooms/${code}/focus`, { paused: true }).catch(failure);
      },
      resume: async () => {
        await pauseRequest;
        try {
          const next = await api(`rooms/${code}/focus`, { paused: false });
          if (roomRef.current?.code === code) { roomRef.current = next; setRoom(next); }
          setFocusPaused(false);
        } catch (error) { failure(error); }
      },
      finish: () => {
        roomRef.current = null;
        setRoom(null);
        setEntry(null);
        sessionStorage.removeItem(roomKey);
        clearInviteCode();
        close();
        pauseRequest.then(() => api(`rooms/${code}/leave`, {})).catch(() => {});
      },
    });
  }, [focusGuardActive, room?.code]);
  const levels = difficultyOptions(game);
  const levelIndex = Math.max(0, levels.findIndex(item => item.id === (room?.settings.level ?? "easy")));
  useEffect(()=>{
    if(room?.phase==="playing"&&!busy&&!room.waiting&&!focusPaused){
      answerInput.current?.focus({preventScroll:true});
    }
  },[room?.phase,room?.round,shownQuestion?.index,busy,shownQuestion?.hintUsed,focusPaused]);
  const phase = room?.phase;
  const round = room?.round;
  useEffect(() => {
    if (!open || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = screen.current?.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
      { duration: 230, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
    return () => animation?.cancel();
  }, [open, gate, entry, phase, round, room?.waiting]);

  useLayoutEffect(() => {
    const cards = Array.from(roster.current?.children ?? []);
    const positions = new Map();
    const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const card of cards) {
      const position = { x: card.offsetLeft, y: card.offsetTop, width: card.offsetWidth };
      const previous = teamPositions.current.get(card.dataset.team);
      positions.set(card.dataset.team, position);
      if (!motion || !teamPositions.current.size) continue;
      if (!previous) {
        card.animate([{ opacity: 0, transform: "translateX(32px) scale(.9)" }, { opacity: 1, transform: "scale(1.025)", offset: .75 }, { transform: "none" }], { duration: 420 });
      } else if (previous.x !== position.x || previous.y !== position.y || previous.width !== position.width) {
        card.animate([{ transform: `translate(${previous.x - position.x}px,${previous.y - position.y}px) scaleX(${previous.width / position.width})` }, { transform: "scale(1.025)", offset: .74 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.75,.2,1)" });
      }
    }
    teamPositions.current = positions;
  });

  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const resize = () => backdrop.current?.style.setProperty('--geo-keyboard-inset', `${viewport ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0}px`);
    resize();
    viewport?.addEventListener('resize', resize);
    return () => viewport?.removeEventListener('resize', resize);
  }, [open]);

  return (
    <>
      {!open && (
        <button className="gb-launch" onClick={enter}>
          대항전 시작하기
        </button>
      )}
      {open && createPortal(
        <div
          ref={backdrop}
          className={`gb-backdrop ${room?.phase === "playing" && !host && !room.waiting ? "gb-map-round" : ""}`}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="지오웹 대항전"
            className="gb-modal"
            data-phase={room?.phase ?? "entry"}
            onPointerDown={event => {
              if (musicEnabled && !event.target.closest(".gb-sound")) playMusic();
            }}
          >
            <header>
              <span>GEOWEB <small>{room?.phase === "playing" ? `ROUND ${room.round} / ${room.settings.rounds}` : "LIVE BATTLE"}</small></span>
              {room && <button className="gb-toolbar-code" onClick={()=>showInvite(room.code)}><small>GAME CODE · QR</small><strong>{room.code}</strong></button>}
              <div className="gb-header-actions">
                <button className="gb-sound" type="button" aria-pressed={musicEnabled} onClick={toggleMusic}>
                  SOUND {musicEnabled ? "ON" : "OFF"}
                </button>
                <button onClick={close} aria-label="대항전 닫기">×</button>
                {room && <button onClick={()=>setConfirmExit(true)}>방 나가기</button>}
              </div>
            </header>
            {room?.phase === "playing" && !host && <h2 className="gb-game-title">{modes.find(([key])=>key===game)?.[1]}</h2>}
            <main ref={screen} className="gb-screen">
            {gate === "checking" ? (
              <div className="gb-center" role="status">
                <span className="gb-spinner" />
                <p>계정 정보 확인 중</p>
                <button disabled>로그인 또는 브라우저 계정 만들기</button>
              </div>
            ) : gate === "unauthenticated" ? (
              <div className="gb-center">
                <h2>계정이 필요해요</h2>
                <p>로그인하거나 브라우저 계정을 만들어 참가하세요.</p>
                {error && <p role="alert" className="gb-error">{error}</p>}
                <button
                  onClick={() =>
                    document.querySelector(".ps-account-trigger")?.click()
                  }
                >
                  로그인 / 브라우저 계정 만들기
                </button>
                <button onClick={authenticate}>계정 다시 확인</button>
              </div>
            ) : gate === "offline" ? (
              <div className="gb-center">
                <h2>네트워크에 연결할 수 없어요</h2>
                <p>{error}</p>
                <button onClick={authenticate}>다시 시도</button>
              </div>
            ) : !room ? (
              <div className={`gb-center ${entry === "join" ? "gb-join-screen" : ""}`}>
                {entry === "join" && <small className="gb-create-eyebrow">JOIN A GAME</small>}
                {entry === "create" && <small className="gb-create-eyebrow">CREATE A GAME</small>}
                <h1>{entry === "create" ? "어떻게 겨뤄 볼까요?" : entry === "join" ? "게임 코드로 만나요." : "함께 지리를 풀어요"}</h1>
                {!entry && (
                  <div className="gb-entry-options">
                    <button aria-label="게임 만들기" onClick={() => setEntry("create")}>
                      <strong>게임 만들기</strong><small>팀전 또는 개인전을 열어요.</small>
                    </button>
                    <button aria-label="게임 참여하기" onClick={() => setEntry("join")}>
                      <strong>게임 참여하기</strong><small>참가 코드로 게임에 들어가요.</small>
                    </button>
                  </div>
                )}
                {entry === "create" && (
                  <>
                    <div className="gb-entry-options" role="group" aria-label="게임 방식">
                      <button onClick={() => setMode("team")} aria-pressed={mode === "team"}>
                        <strong>팀전</strong><small>우리 팀의 점수를 모아요</small>
                      </button>
                      <button onClick={() => setMode("individual")} aria-pressed={mode === "individual"}>
                        <strong>개인전</strong><small>나의 점수로 겨뤄요</small>
                      </button>
                    </div>
                    <p>{mode === "team" ? "참여자는 인원이 적은 팀에 배정돼요. 진행자는 시작 전에 팀을 바꿀 수 있어요." : "같은 난이도와 시간으로 각자의 점수를 겨뤄요."}</p>
                    {mode === "team" && (
                      <div className="gb-team-count">
                        <label htmlFor="gb-team-count">팀 개수</label>
                        <div className="gb-stepper">
                          <output id="gb-team-count" aria-live="polite">{teamCount}</output>
                          <div>
                            <button type="button" aria-label="팀 개수 늘리기" disabled={busy || teamCount === 10}
                              onClick={() => setTeamCount(count => Math.min(10, count + 1))}>
                              <span className="gb-arrow gb-arrow-up" aria-hidden="true" />
                            </button>
                            <button type="button" aria-label="팀 개수 줄이기" disabled={busy || teamCount === 2}
                              onClick={() => setTeamCount(count => Math.max(2, count - 1))}>
                              <span className="gb-arrow" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <button className="gb-primary" disabled={busy} onClick={() => create().catch(() => {})}>
                      게임 만들기
                    </button>
                  </>
                )}
                {entry === "join" && (
                  <><p>진행자가 보여 주는 QR을 휴대폰 카메라로 촬영하세요.<br/>또는 여섯 자리 코드를 입력하세요. QR을 촬영하면 참여 코드가 자동으로 입력돼요.</p><form onSubmit={(event) => {
                    event.preventDefault();
                    join().catch(() => {});
                  }}>
                    <label className="gb-code-label">게임 코드<input
                      autoFocus
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      autoComplete="off"
                      aria-label="참가 코드"
                    /></label>
                    <button className="gb-primary" disabled={busy}>게임 참여하기</button>
                  </form></>
                )}
                {entry && (
                  <button disabled={busy} onClick={() => {
                    setEntry(null);
                    setError("");
                  }}>돌아가기</button>
                )}
              </div>
            ) : (
              <>
                <div className="gb-heading">
                  <div>
                    <small>
                      {room.mode === "team" ? "TEAM BATTLE" : "INDIVIDUAL BATTLE"}
                    </small>
                    <h2>
                      {room.phase === "lobby"
                        ? "함께 준비해요"
                        : room.phase === "finished"
                          ? "경기 결과"
                          : room.phase === "cancelled"
                            ? "취소된 경기"
                            : `라운드 ${room.round} / ${room.settings.rounds}`}
                    </h2>
                  </div>
                  {room.phase === "lobby" && (host ? (
                    <GamePicker value={game} busy={busy} onChange={difficulty => {
                      if (difficulty !== game) act(`rooms/${room.code}/settings`, { ...room.settings, difficulty, level: "easy" }).catch(() => {});
                    }} />
                  ) : <span>{modes.find(([key]) => key === game)?.[1]} · {levels[levelIndex]?.label}</span>)}
                  {room.phase === "lobby" && <button onClick={() => {
                    navigator.clipboard?.writeText(room.code).catch(() => {});
                    showInvite(room.code);
                  }}>코드 {room.code} · QR</button>}
                  {host && room.phase === "lobby" && (
                      <button
                        className="gb-primary gb-lobby-action"
                        disabled={
                          busy ||
                          room.participantCount < 2 ||
                          ready < room.participantCount
                        }
                        onClick={() => act(`rooms/${room.code}/start`, {})}
                      >
                        경기 시작 · 준비 {ready}/{room.participantCount}
                      </button>
                  )}
                </div>
                {["starting", "playing", "between"].includes(room.phase) && (
                  <p role="timer" className={`gb-clock ${host?"gb-host-clock":""}`}>

                    <strong key={countdown}>{countdown}</strong>
                  </p>
                )}
                {room.phase === "lobby" ? (
                  <>
                    {host && (
                      <div className="gb-settings">
                        {room.mode === "team" && <LobbyStepper title="TEAMS" label="팀 개수" value={room.teamCount} busy={busy}
                          previous={room.teamCount > 2 ? room.teamCount - 1 : null}
                          next={room.teamCount < 10 ? room.teamCount + 1 : null}
                          onChange={teamCount => act(`rooms/${room.code}/teams`, { teamCount }).catch(() => {})} />}
                        <LobbyStepper title="DIFFICULTY" label="난이도" value={levels[levelIndex]?.label} busy={busy}
                          previous={levels[levelIndex - 1]?.id}
                          next={levels[levelIndex + 1]?.id}
                          onChange={level => act(`rooms/${room.code}/settings`, { ...room.settings, level }).catch(() => {})} />
                        <LobbyStepper title="ROUND TIME" label="시간" value={room.settings.seconds + "초"} busy={busy}
                          previous={room.settings.seconds > 15 ? Math.max(15, room.settings.seconds - 15) : null}
                          next={room.settings.seconds < 600 ? Math.min(600, room.settings.seconds + 15) : null}
                          onChange={seconds => act(`rooms/${room.code}/settings`, { ...room.settings, seconds }).catch(() => {})} />
                        <LobbyStepper title="ROUNDS" label="라운드" value={room.settings.rounds + "회"} busy={busy}
                          previous={room.settings.rounds > 1 ? room.settings.rounds - 1 : null}
                          next={room.settings.rounds < 10 ? room.settings.rounds + 1 : null}
                          onChange={rounds => act(`rooms/${room.code}/settings`, { ...room.settings, rounds }).catch(() => {})} />
                        <small>설정이 바뀌면 준비 상태가 해제돼요.</small>
                      </div>
                    )}
                    <div className="gb-roster" ref={roster}
                      style={{ "--gb-columns": host && room.mode === "team" ? Math.ceil(room.teamCount / (room.teamCount > 5 ? 2 : 1)) : 1 }}>
                      {(room.mode === "team"
                        ? room.teamNames.map((name, team) => ({ name, team })).filter(group => host || group.team === me?.team)
                        : [{ name: "참여자", team: null }]
                      ).map(({ name, team }) => (
                        <section className={`gb-players ${dropTeam === team && dragged ? "gb-drop-team" : ""}`}
                          key={team ?? "individual"} data-team={team ?? "individual"} style={{ "--gb-team-color": teamColors[team] }}
                          onDragOver={event => {
                            if (!host || !dragged || team === null) return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setDropTeam(team);
                          }}
                          onDragLeave={event => {
                            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropTeam(null);
                          }}
                          onDrop={event => {
                            event.preventDefault();
                            if (host && dragged && team !== null) movePlayer(dragged, team);
                            setDragged(null);
                            setDropTeam(null);
                          }}>
                          <h3>{name}</h3>
                          <div className="gb-team-members">
                          {room.players?.filter(p => !p.isHost && (team === null || p.team === team)).map(player => {
                            const Tag = host ? "button" : "div";
                            return (
                              <Tag key={player.id} type={host ? "button" : undefined}
                                data-player={player.id} className={`gb-player-card ${player.ready ? "gb-player-ready" : ""}`}
                                draggable={host && team !== null}
                                onDragStart={event => {
                                  event.dataTransfer.setData("text/plain", player.id);
                                  event.dataTransfer.effectAllowed = "move";
                                  setDragged(player.id);
                                }}
                                onDragEnd={() => { setDragged(null); setDropTeam(null); }}
                                onPointerDown={event => {
                                  if (event.pointerType !== "touch" || !host || team === null) return;
                                  const target = event.currentTarget;
                                  const pointerId = event.pointerId;
                                  const state = { playerId: player.id, held: false };
                                  state.timer = setTimeout(() => {
                                    if (!target.isConnected) return;
                                    target.setPointerCapture(pointerId);
                                    state.held = true;
                                    setDragged(player.id);
                                  }, 220);
                                  touchDrag.current = state;
                                }}
                                onPointerMove={event => {
                                  if (!touchDrag.current?.held) return;
                                  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".gb-roster [data-team]");
                                  setDropTeam(target ? Number(target.dataset.team) : null);
                                }}
                                onPointerUp={finishTouchDrag}
                                onPointerCancel={finishTouchDrag}
                                onClick={host ? () => {
                                  if (Date.now() < suppressManage.current) return;
                                  setMoveTo(player.team ?? 0);
                                  setManaged(player.id);
                                } : undefined}>
                                <span>{player.name}</span>
                                {player.ready ? <span aria-label="준비 완료" className="gb-ready-check">✓</span> :
                                  !player.connected && <span>연결 끊김</span>}
                              </Tag>
                            );
                          })}
                          </div>
                        </section>
                      ))}
                    </div>
                    {!host && room.mode === "team" && (
                      <button
                        onClick={() => {
                          const name = prompt(
                            "팀 이름 (2~20자)",
                            room.teamNames[me.team],
                          );
                          if (name) act(`rooms/${room.code}/name`, { name });
                        }}
                      >
                        우리 팀 이름 바꾸기
                      </button>
                    )}
                    {!host && (
                      <button
                        className={`gb-primary gb-lobby-action ${me?.ready ? "gb-ready-action" : ""}`}
                        disabled={busy}
                        onClick={() =>
                          act(`rooms/${room.code}/ready`, { ready: !me?.ready })
                        }
                      >
                        {me?.ready ? "✓ 준비 완료 · 취소하기" : "준비 완료"}
                      </button>
                    )}
                  </>
                ) : room.phase === "playing" && room.waiting ? (
                  <div className="gb-center"><h2>다음 라운드부터 함께해요</h2></div>
                ) : room.phase === "playing" && !host ? createPortal(
                  <div className={`geo-game gg-playing gb-game-surface ${game==='flag'?'geo-game-flags':''} ${room.settings.level==='expert'?'gg-expert':''}`} data-question-index={shownQuestion?.index}>
                    <GeoGamePlay question={playQuestion} questionKey={questionKey} mode={game} expert={room.settings.level==='expert'} countdown={shownSeconds} onTarget={onTarget}
                      config={playConfig} tier={playTier} stats={{score:me?.score||0,combo:room.stats?.combo||0}} elapsed={Math.max(0,room.settings.seconds-countdown)} formula={formula} setFormula={setFormula}
                      result={skipEffect|| (scoreEffect?{gain:scoreEffect,combo:scoreEffect.combo,id:scoreEffect.id}:feedback?{text:feedback}:null)}
                      mediaReady={mediaReady} mediaError={mediaError} mediaLoaded={()=>setMedia({key:questionKey,ready:true})} mediaFailed={()=>setMedia({key:questionKey,error:true})}
                      tools={<div className="gb-answer-tools"><button type="button" disabled={busy||shownQuestion?.hintUsed} onClick={()=>act(`rooms/${room.code}/hint`,{index:shownQuestion.index})}>HINT</button>{shownQuestion?.hintUsed&&<span>{shownQuestion.hint}</span>}<span>PASS · {room.stats?.passesRemaining||0}</span></div>}
                      submit={submit} input={answerInput} answer={answer} setAnswer={setAnswer} composing={answerComposing}
                      skip={skipQuestion} busy={busy}/>
                  </div>,backdrop.current
                ) : host && room.phase === "playing" ? null : (
                  ["finished","between"].includes(room.phase)?<BattleResult room={room} host={host}/>:<div className="gb-center">
                    <p>
                      {room.phase === "finished"
                        ? "최종 점수를 확인하세요."
                        : room.phase === "cancelled"
                          ? "진행자가 경기를 취소했습니다."
                          : ""}
                    </p>
                  </div>
                )}
                {host && ["playing", "between", "finished"].includes(room.phase) &&
                  <BattleLeaderboard room={room} />}
                {managedPlayer && (
                  <div className="gb-confirm-shade" role="dialog" aria-modal="true" aria-label="참여자 관리"
                    onClick={event => { if (event.target === event.currentTarget) setManaged(null); }}>
                    <div className="gb-confirm">
                      <small>PLAYER MANAGEMENT</small>
                      <h2>{managedPlayer.name}</h2>
                      <button type="button" className="gb-popup-close" aria-label="참여자 관리 닫기" onClick={() => setManaged(null)}>×</button>
                      {room.mode === "team" && (
                        <>
                          <p>팀 이동 또는 내보내기를 선택하세요.</p>
                          <label>이동할 팀{" "}
                            <select value={moveTo} aria-label="이동할 팀" onChange={event => setMoveTo(Number(event.target.value))}>
                              {room.teamNames.map((name, team) => <option key={team} value={team}>{team + 1}팀</option>)}
                            </select>
                          </label>
                          <button type="button" className="gb-primary gb-manage-action" onClick={() => {
                            movePlayer(managedPlayer.id, moveTo);
                            setManaged(null);
                          }}>선택한 팀 맨 아래로 이동</button>
                        </>
                      )}
                      <button type="button" className="gb-danger gb-manage-action" disabled={busy} onClick={() => {
                        setManaged(null);
                        act(`rooms/${room.code}/kick`, { playerId: managedPlayer.id }).catch(() => {});
                      }}>이 참여자 내보내기</button>
                      <p><small>내보낸 참여자도 코드를 입력해 새로 참여할 수 있어요.</small></p>
                    </div>
                  </div>
                )}
                {confirmExit && (
                  <div
                    className="gb-confirm-shade"
                    onClick={event => { if (event.target === event.currentTarget) setConfirmExit(false); }}
                    role="alertdialog"
                    aria-label="경기 나가기 확인"
                  >
                    <div className="gb-confirm">
                    <small>{host ? "END BATTLE" : "LEAVE BATTLE"}</small>
                    <h2>{host ? "경기를 종료할까요?" : "방을 나갈까요?"}</h2>
                    <p>{host ? "방을 종료하고 모든 참여자를 대항전 처음으로 돌려보냅니다." : "게임 코드로 다시 참여할 수 있어요."}</p>
                    <button onClick={async event => {
                      await dismiss(event.currentTarget.closest(".gb-confirm"));
                      setConfirmExit(false);
                    }}>
                      취소
                    </button>
                    <button className="gb-danger" onClick={async event => {
                      await dismiss(event.currentTarget.closest(".gb-confirm"));
                      await leave();
                    }}>
                      {host ? "종료 확인" : "나가기 확인"}
                    </button>
                    </div>
                  </div>
                )}
                <footer>
                  {host && room.phase === "finished" && (
                    <button
                      className="gb-primary" onClick={() => room.mode==="team"?act(`rooms/${room.code}/rematch`, {}):leave()}
                    >
                      다시하기
                    </button>
                  )}
                  {!host && room.phase === "finished" && <button onClick={leave}>대항전 나가기</button>}
                  {host&&<button className="gb-danger" onClick={() => setConfirmExit(true)}>경기 종료</button>}
                </footer>
              </>
            )}
            {gate === "ready" && error && (
              <p role="alert" className="gb-error">
                {error}
              </p>
            )}
            </main>
            <div className="gb-brand">Designed by parcyun studio · <a href="https://www.instagram.com/parcyun">@parcyun</a> · <a href="/geoweb-battle/music-credits.html" target="_blank" rel="noopener noreferrer">BGM ⓘ</a></div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
