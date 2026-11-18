import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./geoBattle.css";

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
    [invite, setInvite] = useState(""),
    [confirmExit, setConfirmExit] = useState(false);
  const sessionRef = useRef(null),
    roomRef = useRef(null),
    serverOffset = useRef(0),
    pending = useRef(false),
    backdrop = useRef(null),
    screen = useRef(null);
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
    const next = await api(`rooms/${value}`);
    setRoom(next);
    roomRef.current = next;
    sessionStorage.setItem(roomKey, next.code);
    setGate("ready");
    return next;
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
    await dismiss(backdrop.current);
    setOpen(false);
    onOpenChange?.(false);
    setError("");
  }
  async function create() {
    const next = await act("rooms", { mode, teamCount });
    if (next) {
      sessionStorage.setItem(roomKey, next.code);
      setRoom(next);
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
  async function submit(e) {
    e.preventDefault();
    if (!answer.trim() || !room?.question) return;
    try {
      const result = await act(`rooms/${room.code}/answer`, {
        answer,
        index: room.question.index,
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
      load(roomRef.current.code).catch(failure);
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
  useEffect(() => {
    if (room?.question)
      onTarget?.(
        {
          id: room.question.id,
          coordinates: room.question.coordinates,
          mode: room.question.mode,
        },
        room.question.mode,
        "easy",
      );
  }, [room?.question?.id, room?.question?.index]);
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

  return (
    <>
      {!open && (
        <button className="gb-launch" onClick={enter}>
          대항전 시작하기
        </button>
      )}
      {open && (
        <div
          ref={backdrop}
          className={`gb-backdrop ${room?.phase === "playing" && !host ? "gb-live" : ""}`}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="지오웹 대항전"
            className="gb-modal"
          >
            <header>
              <span>GEOWEB / LIVE BATTLE</span>
              <button onClick={close} aria-label="대항전 닫기">
                ×
              </button>
            </header>
            <div ref={screen} className="gb-screen">
            {gate === "checking" ? (
              <div className="gb-center" role="status">
                <span className="gb-spinner" />
                계정 정보를 확인 중입니다
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
                <h1>{entry === "create" ? "게임 만들기" : entry === "join" ? "게임 참여하기" : "함께 지리를 풀어요"}</h1>
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
                    <div className="gb-options">
                      <button onClick={() => setMode("team")} aria-pressed={mode === "team"}>
                        팀 대항전
                      </button>
                      <button onClick={() => setMode("individual")} aria-pressed={mode === "individual"}>
                        개인 대항전
                      </button>
                    </div>
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
                      방 만들기
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
                      ROOM {room.code} /{" "}
                      {room.mode === "team" ? "TEAM" : "INDIVIDUAL"}
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
                  <button
                    onClick={() => navigator.clipboard.writeText(room.code)}
                  >
                    코드 복사
                  </button>
                  <button
                    onClick={() =>
                      api(`rooms/${room.code}/qr`)
                        .then((data) => setInvite(data.image))
                        .catch((e) => setError(e.message))
                    }
                  >
                    초대 QR
                  </button>
                </div>
                {invite && (
                  <div className="gb-invite">
                    <img src={invite} alt={`방 ${room.code} 참가 QR 코드`} />
                    <button onClick={async event => {
                      await dismiss(event.currentTarget.closest(".gb-invite"));
                      setInvite("");
                    }}>QR 닫기</button>
                  </div>
                )}
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
                    <div className="gb-settings">
                      {host && (
                        <>
                          {room.mode === "team" && (
                            <label>
                              팀 수
                              <select
                                value={room.teamCount}
                                onChange={(e) =>
                                  act(`rooms/${room.code}/teams`, {
                                    teamCount: Number(e.target.value),
                                  })
                                }
                              >
                                {Array.from({ length: 9 }, (_, i) => (
                                  <option key={i} value={i + 2}>
                                    {i + 2}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label>
                            문제 종류
                            <select
                              value={room.settings.difficulty}
                              onChange={(e) =>
                                act(`rooms/${room.code}/settings`, {
                                  ...room.settings,
                                  difficulty: e.target.value,
                                })
                              }
                            >
                              {modes.map(([value, label]) => (
                                <option value={value} key={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            시간
                            <select
                              value={room.settings.seconds}
                              onChange={(e) =>
                                act(`rooms/${room.code}/settings`, {
                                  ...room.settings,
                                  seconds: Number(e.target.value),
                                })
                              }
                            >
                              {[30, 60, 90, 120].map((n) => (
                                <option key={n}>{n}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            라운드
                            <select
                              value={room.settings.rounds}
                              onChange={(e) =>
                                act(`rooms/${room.code}/settings`, {
                                  ...room.settings,
                                  rounds: Number(e.target.value),
                                })
                              }
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n}>{n}</option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                    <div className="gb-players">
                      {room.players?.map((p) => (
                        <div key={p.id}>
                          {p.name} {p.isHost ? "· 진행자" : ""}{" "}
                          {p.ready ? "· 준비 완료" : ""}{" "}
                          {!p.connected ? "· 연결 끊김" : ""}{" "}
                          {room.mode === "team" &&
                            !p.isHost &&
                            `· ${room.teamNames[p.team]}`}{" "}
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
                    {host ? (
                      <button
                        disabled={
                          busy ||
                          room.participantCount < 2 ||
                          ready < room.participantCount
                        }
                        onClick={() => act(`rooms/${room.code}/start`, {})}
                      >
                        경기 시작 · 준비 {ready}/{room.participantCount}
                      </button>
                    ) : (
                      <button
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
                  <div className="gb-question">
                    <p>{room.question?.prompt}</p>
                    {room.question?.image && (
                      <img src={room.question.image} alt="문제 이미지" />
                    )}
                    <h3>
                      {room.question?.cue || "지도와 이미지를 보고 답해 보세요"}
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
                      disabled={busy || room.question?.hintUsed}
                      onClick={() =>
                        act(`rooms/${room.code}/hint`, {
                          index: room.question.index,
                        })
                      }
                    >
                      힌트
                    </button>
                    {room.question?.hintUsed && <p>{room.question.hint}</p>}
                    <button
                      disabled={busy || room.stats?.passesRemaining <= 0}
                      onClick={() =>
                        act(`rooms/${room.code}/pass`, {
                          index: room.question.index,
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
                    className="gb-confirm"
                    role="alertdialog"
                    aria-label="경기 나가기 확인"
                  >
                    <p>
                      {host
                        ? "경기를 종료하거나 방을 취소할까요?"
                        : "방을 나갈까요?"}
                    </p>
                    <button onClick={async event => {
                      await dismiss(event.currentTarget.closest(".gb-confirm"));
                      setConfirmExit(false);
                    }}>
                      계속하기
                    </button>
                    <button onClick={async event => {
                      await dismiss(event.currentTarget.closest(".gb-confirm"));
                      await leave();
                    }}>
                      {host ? "종료 확인" : "나가기 확인"}
                    </button>
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
                  <button onClick={() => setConfirmExit(true)}>
                    {host ? "경기 종료 / 방 취소" : "방 나가기"}
                  </button>
                </footer>
              </>
            )}
            {gate === "ready" && error && (
              <p role="alert" className="gb-error">
                {error}
              </p>
            )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
