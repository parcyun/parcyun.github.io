import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./geoBattle.css";
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
  const index = modes.findIndex(([key]) => key === value);
  useEffect(() => {
    const active = list.current?.children[index];
    if (active) list.current.scrollTop = active.offsetTop - active.offsetHeight;
  }, [index]);
  return (
    <div className="gb-game-picker">
      <div className="gb-game-wheel" ref={list} aria-label="게임 종류"
        onPointerDown={event => {
          if (event.pointerType === "mouse" && event.button === 0) {
            drag.current = { y: event.clientY, top: event.currentTarget.scrollTop, moved: false };
          }
        }}
        onPointerMove={event => {
          const state = drag.current;
          if (!state || !(event.buttons & 1)) return;
          const delta = state.y - event.clientY;
          if (!state.moved && Math.abs(delta) < 4) return;
          state.moved = true;
          const wheel = event.currentTarget;
          wheel.setPointerCapture(event.pointerId);
          wheel.style.scrollSnapType = "none";
          wheel.scrollTop = state.top + delta;
        }}
        onPointerUp={event => {
          const state = drag.current;
          drag.current = null;
          if (!state?.moved) return;
          const wheel = event.currentTarget;
          wheel.style.scrollSnapType = "";
          const next = modes[Math.round(wheel.scrollTop / wheel.firstElementChild.offsetHeight)]?.[0];
          if (!busy && next && next !== value) onChange(next);
        }}
        onPointerCancel={event => { drag.current = null; event.currentTarget.style.scrollSnapType = ""; }}
        onScrollEnd={event => {
          const wheel = event.currentTarget;
          const next = modes[Math.round(wheel.scrollTop / wheel.firstElementChild.offsetHeight)]?.[0];
          if (!drag.current?.moved && !busy && next && next !== value) onChange(next);
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
      }
      if (score !== old.score) row.lastElementChild.animate(
        [{ color: "#fff", textShadow: "0 0 14px #fff" }, { color: "#ffcb73", textShadow: "none" }],
        { duration: 340 },
      );
    }
    previous.current = next;
  });
  return (
    <section className="gb-scoreboard" aria-label="순위표">
      <h3>{room.phase === "finished" ? "최종 순위" : "실시간 순위"}</h3>
      <ol ref={list}>
        {ranked.map(({ id, name, score }) => (
          <li key={id} data-key={id} data-score={score}>
            <span>{ranked.findIndex(entry => entry.score === score) + 1}위</span>
            <span>{name}</span>
            <strong>{score.toLocaleString()}점</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function GeoBattle({ onTarget, onOpenChange }) {
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
    [feedback, setFeedback] = useState(""),
    [clock, setClock] = useState(Date.now()),
    [confirmExit, setConfirmExit] = useState(false);
  const sessionRef = useRef(null),
    roomRef = useRef(null),
    serverOffset = useRef(0),
    pending = useRef(false),
    refreshing = useRef(false),
    backdrop = useRef(null),
    screen = useRef(null),
    roster = useRef(null),
    teamPositions = useRef(new Map());
  sessionRef.current = session;
  roomRef.current = room;
  async function api(path, body) {
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
      const identity = await window.psBattleIdentity?.();
      if (!identity) {
        setGate("unauthenticated");
        return;
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
          const joined = await api(`rooms/${saved}/join`, {});
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
    if (refreshing.current || pending.current || !navigator.onLine || !roomRef.current) return;
    refreshing.current = true;
    try {
      await load(roomRef.current.code);
    } catch (error) {
      failure(error);
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
  async function enter() {
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
        image: invite.image, label: `대항전 ${code} 참여 QR 코드`, container: backdrop.current.querySelector(".gb-modal"),
      });
    } catch (error) { setError(error.message); }
  }
  async function create() {
    const next = await act("rooms", { mode, teamCount });
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
    const next = await act(`rooms/${code}/join`, {});
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
      if (host && room.phase !== "lobby") {
        await load(room.code);
      } else {
        setRoom(null);
        setEntry(null);
        roomRef.current = null;
        sessionStorage.removeItem(roomKey);
        clearInviteCode();
      }
    } catch {}
  }
  const expertDeadline = room?.settings.level === "expert" && room?.question?.startedAt != null
    ? room.question.startedAt + EXPERT_ANSWER_MS
    : null;
  const expertSeconds = expertDeadline == null ? null : Math.ceil((expertDeadline - clock - serverOffset.current) / 1000);
  const expertExpired = expertSeconds != null && expertSeconds <= 0;
  const shownQuestion = expertExpired ? room.nextQuestion : room?.question;
  const shownSeconds = expertExpired && shownQuestion
    ? Math.ceil((shownQuestion.startedAt + EXPERT_ANSWER_MS - clock - serverOffset.current) / 1000)
    : expertSeconds;
  useEffect(() => {
    if (!room?.nextQuestion?.image) return;
    const image = new Image();
    image.src = room.nextQuestion.image;
    image.decode?.().catch(() => {});
  }, [room?.nextQuestion?.image]);
  async function submit(e) {
    e.preventDefault();
    if (!answer.trim() || !shownQuestion || (shownSeconds != null && shownSeconds <= 0)) return;
    try {
      const result = await act(`rooms/${room.code}/answer`, {
        answer,
        index: shownQuestion.index,
      });
      setFeedback(
        result.correct ? `정답! +${result.points}점` : "다시 생각해 보세요.",
      );
      if (result.correct) setAnswer("");
    } catch {}
  }
  useEffect(() => {
    const inviteCode = new URLSearchParams(location.search).get("geoBattle");
    if (inviteCode && /^\d{6}$/.test(inviteCode)) enter();
  }, []);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(id);
  }, [open]);
  useEffect(() => {
    if (!open || !room) return;
    const id = setInterval(() => {
      if (document.hidden || !navigator.onLine || pending.current) return;
      refreshRoom();
    }, 900);
    return () => clearInterval(id);
  }, [open, room?.code]);
  useEffect(() => {
    const off = () => {
      setGate("offline");
      setError("네트워크 연결이 끊어졌습니다. 연결 후 다시 시도해 주세요.");
    };
    const on = () => {
      if (open) authenticate();
    };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!shownQuestion) return;
    onTarget?.({ id: shownQuestion.id, coordinates: shownQuestion.coordinates, mode: shownQuestion.mode },
      shownQuestion.mode, room.settings.level ?? "easy");
  }, [shownQuestion?.id, shownQuestion?.index, room?.round]);
  useEffect(() => {
    if (!open || expertDeadline == null) return;
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
  }, [open, expertDeadline]);
  const deadline =
    room?.phase === "starting"
      ? room.startsAt
      : room?.phase === "between"
        ? room.nextAt
        : room?.deadline;
  const countdown = deadline
    ? Math.max(0, Math.ceil((deadline - clock - serverOffset.current) / 1000))
    : 0;
  const host = room?.me === room?.host,
    me = room?.players?.find((p) => p.id === room.me),
    ready = room?.players?.filter((p) => p.ready).length || 0;
  const game = room?.settings.difficulty ?? "country";
  const levels = difficultyOptions(game);
  const levelIndex = Math.max(0, levels.findIndex(item => item.id === (room?.settings.level ?? "easy")));
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
          className={`gb-backdrop ${room?.question && !host && !room.question.image ? "gb-map-round" : ""}`}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="지오웹 대항전"
            className="gb-modal"
            data-phase={room?.phase ?? "entry"}
          >
            <header>
              <span>GEOWEB <small>LIVE BATTLE</small></span>
              {room && <div className="gb-toolbar-code"><small>GAME CODE</small><strong>{room.code}</strong></div>}
              <button onClick={close} aria-label="대항전 닫기">
                ×
              </button>
            </header>
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
              <div className="gb-center">
                {entry === "create" && <small className="gb-create-eyebrow">CREATE A GAME</small>}
                <h1>{entry === "create" ? "어떻게 겨뤄 볼까요?" : entry === "join" ? "게임 참여하기" : "함께 지리를 풀어요"}</h1>
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
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    join().catch(() => {});
                  }}>
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      placeholder="6자리 참가 코드"
                      aria-label="참가 코드"
                    />
                    <button className="gb-primary" disabled={busy}>방 참가하기</button>
                  </form>
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
                  <button onClick={() => {
                    navigator.clipboard?.writeText(room.code).catch(() => {});
                    showInvite(room.code);
                  }}>코드 {room.code} · QR</button>
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
                  <p role="timer" className="gb-clock">
                    {room.phase === "starting"
                      ? "시작까지"
                      : room.phase === "between"
                        ? "다음 라운드까지"
                        : "남은 시간"}{" "}
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
                        <section className="gb-players" key={team ?? "individual"} data-team={team ?? "individual"} style={{ "--gb-team-color": teamColors[team] }}>
                          <h3>{name}</h3>
                          <div className="gb-team-members">
                          {room.players?.filter(p => !p.isHost && (team === null || p.team === team)).map((p) => (
                        <div key={p.id}>
                          {p.name} {p.isHost ? "· 진행자" : ""}{" "}
                          {p.ready ? "· 준비 완료" : ""}{" "}
                          {!p.connected ? "· 연결 끊김" : ""}{" "}
                          {host && !p.isHost && (
                            <span className="gb-manage">
                              {room.mode === "team" && (
                                <select
                                  aria-label={`${p.name} 팀 이동`}
                                  value={p.team}
                                  onChange={(e) =>
                                    act(`rooms/${room.code}/move`, {
                                      playerId: p.id,
                                      team: Number(e.target.value),
                                    })
                                  }
                                >
                                  {room.teamNames.map((name, i) => (
                                    <option value={i} key={i}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                disabled={p.ready}
                                onClick={() =>
                                  act(`rooms/${room.code}/kick`, {
                                    playerId: p.id,
                                  })
                                }
                              >
                                내보내기
                              </button>
                            </span>
                          )}
                        </div>
                          ))}
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
                        className="gb-primary gb-lobby-action"
                        disabled={busy}
                        onClick={() =>
                          act(`rooms/${room.code}/ready`, { ready: !me?.ready })
                        }
                      >
                        {me?.ready ? "준비 취소" : "준비 완료"}
                      </button>
                    )}
                  </>
                ) : room.phase === "playing" && room.waiting ? (
                  <div className="gb-center"><h2>다음 라운드부터 함께해요</h2></div>
                ) : room.phase === "playing" && !host ? (
                  <div className="gb-question" hidden={!shownQuestion} data-question-index={shownQuestion?.index}>
                    <p>{shownQuestion?.prompt}</p>
                    {shownSeconds > 0 && (
                      <strong className="gb-expert-clock" role="timer">{shownSeconds}</strong>
                    )}
                    {shownQuestion?.image && (
                      <img src={shownQuestion.image} alt="문제 이미지" />
                    )}
                    <h3>
                      {shownQuestion?.cue || "지도와 이미지를 보고 답해 보세요"}
                    </h3>
                    <form onSubmit={submit}>
                      <input
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        aria-label="정답"
                        autoComplete="off"
                      />
                      <button disabled={busy}>정답 제출</button>
                    </form>
                    <button
                      disabled={busy || shownQuestion?.hintUsed}
                      onClick={() =>
                        act(`rooms/${room.code}/hint`, {
                          index: shownQuestion.index,
                        })
                      }
                    >
                      힌트
                    </button>
                    {shownQuestion?.hintUsed && <p>{shownQuestion.hint}</p>}
                    <button
                      disabled={busy || room.stats?.passesRemaining <= 0}
                      onClick={() =>
                        act(`rooms/${room.code}/pass`, {
                          index: shownQuestion.index,
                        })
                      }
                    >
                      패스 · {room.stats?.passesRemaining}
                    </button>
                    <p role="status">{feedback}</p>
                  </div>
                ) : host && room.phase === "playing" ? null : (
                  <div className="gb-center">
                    <p>
                      {room.phase === "finished"
                        ? "최종 점수를 확인하세요."
                        : room.phase === "cancelled"
                          ? "진행자가 경기를 취소했습니다."
                          : "다른 참가자를 기다리는 중입니다."}
                    </p>
                  </div>
                )}
                {["playing", "between", "finished"].includes(room.phase) &&
                  <BattleLeaderboard room={room} />}
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
                    <p>{host && room.phase !== "lobby" ? "현재까지 획득한 점수로 최종 순위를 표시합니다." : host ? "모든 참여자의 대항전이 종료됩니다." : "게임 코드로 다시 참여할 수 있어요."}</p>
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
                      onClick={() => act(`rooms/${room.code}/rematch`, {})}
                    >
                      다시 경기하기
                    </button>
                  )}
                  <button className={host ? "gb-danger" : undefined} onClick={() => setConfirmExit(true)}>
                    {host ? "경기 종료" : "방 나가기"}
                  </button>
                </footer>
              </>
            )}
            {gate === "ready" && error && (
              <p role="alert" className="gb-error">
                {error}
              </p>
            )}
            </main>
            <div className="gb-brand">Designed by parcyun studio · <a href="https://www.instagram.com/parcyun">@parcyun</a></div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
