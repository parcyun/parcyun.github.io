import { useEffect, useState } from 'react';
import { getAdminPw, setAdminPw, clearAdminPw, passwordExists, checkPassword, setPassword } from '../lib/adminPw';

// /admin 비밀번호 로그인 — 이메일/계정 없음.
// 최초 방문(비번 미설정) 시엔 "비밀번호 설정" 폼, 그 후엔 "비밀번호 입력" 폼.
export default function AdminLogin() {
  const [ready, setReady] = useState(false);
  const [exists, setExists] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy'>('idle');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setLoggedIn(!!getAdminPw());
      setExists(await passwordExists());
      setReady(true);
    })();
  }, []);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setStatus('busy');
    const ok = await checkPassword(pw);
    setStatus('idle');
    if (ok) { setAdminPw(pw); setLoggedIn(true); setPw(''); }
    else setErr('비밀번호가 올바르지 않아요.');
  }
  async function doSet(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (pw.length < 6) { setErr('비밀번호는 6자 이상이어야 해요.'); return; }
    if (pw !== pw2) { setErr('두 비밀번호가 달라요.'); return; }
    setStatus('busy');
    try { await setPassword('', pw); setAdminPw(pw); setLoggedIn(true); setExists(true); }
    catch (ex: any) { setErr(ex?.message || '설정에 실패했어요.'); }
    finally { setStatus('idle'); }
  }
  function logout() { clearAdminPw(); setLoggedIn(false); setPw(''); setPw2(''); }

  return (
    <div className="al">
      {!ready ? (
        <p className="al-muted">확인 중…</p>
      ) : loggedIn ? (
        <div className="al-in">
          <div className="al-badge">● 관리자 로그인됨</div>
          <p className="al-muted">라이브 페이지로 가서 카드의 수정·삭제·＋추가로 편집하세요. (텍스트 인라인 편집은 다음 단계에서 추가됩니다.)</p>
          <div className="al-links">
            <a className="al-go" href="/atlas-gears/">교육 활동 자료 편집 →</a>
            <a className="al-go" href="/academica/">강의 자료 편집 →</a>
            <a className="al-go" href="/works/">Works 편집 →</a>
          </div>
          <div className="al-tools">
            <span className="al-tools-label">관리자 도구</span>
            <a className="al-tool" href="/dashboard.html">업무 대시보드 ↗</a>
          </div>
          <button type="button" className="al-out" onClick={logout}>로그아웃</button>
        </div>
      ) : !exists ? (
        <form className="al-form" onSubmit={doSet}>
          <p className="al-muted">최초 접속입니다. 관리자 비밀번호를 설정하세요.</p>
          <input className="al-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="new-password" placeholder="새 비밀번호 (6자 이상)" />
          <input className="al-input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" placeholder="비밀번호 확인" />
          <button className="al-submit" type="submit" disabled={status === 'busy' || !pw}>{status === 'busy' ? '설정 중…' : '비밀번호 설정하고 입장'}</button>
          {err && <p className="al-err">{err}</p>}
        </form>
      ) : (
        <form className="al-form" onSubmit={doLogin}>
          <label className="al-label">관리자 비밀번호</label>
          <input className="al-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" placeholder="비밀번호" />
          <button className="al-submit" type="submit" disabled={status === 'busy' || !pw}>{status === 'busy' ? '확인 중…' : '입장'}</button>
          {err && <p className="al-err">{err}</p>}
        </form>
      )}

      <style>{`
        .al{width:100%;max-width:360px}
        .al-form{display:flex;flex-direction:column;gap:10px}
        .al-label{font-family:var(--ps-font-en);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ps-text-cinematic-secondary)}
        .al-input{font-family:var(--ps-font-body);font-size:15px;color:#fff;background:var(--ps-surface-cinematic-1);border:1px solid var(--ps-surface-cinematic-3);border-radius:10px;padding:13px 14px;outline:none;transition:border-color .18s}
        .al-input:focus{border-color:var(--ps-primary)}
        .al-submit{font-family:var(--ps-font-body);font-size:14px;font-weight:600;color:#000;background:var(--ps-primary);border:0;border-radius:100px;padding:12px 20px;cursor:pointer;transition:background .18s}
        .al-submit:hover:not(:disabled){background:var(--ps-primary-dark)}
        .al-submit:disabled{opacity:.5;cursor:not-allowed}
        .al-err{margin:2px 0 0;font-size:12.5px;color:#ff8080}
        .al-muted{font-size:13px;color:var(--ps-text-cinematic-secondary);line-height:1.6;margin:0}
        .al-in{display:flex;flex-direction:column;gap:14px}
        .al-badge{font-family:var(--ps-font-en);font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--ps-primary)}
        .al-links{display:flex;flex-direction:column;gap:8px}
        .al-go{font-family:var(--ps-font-body);font-size:14px;font-weight:600;color:#fff;background:var(--ps-surface-cinematic-1);border:1px solid var(--ps-surface-cinematic-3);border-radius:10px;padding:12px 16px;text-decoration:none;transition:border-color .18s}
        .al-go:hover{border-color:var(--ps-primary);color:var(--ps-primary)}
        .al-tools{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--ps-surface-cinematic-3)}
        .al-tools-label{font-family:var(--ps-font-en);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ps-text-cinematic-secondary)}
        .al-tool{font-family:var(--ps-font-body);font-size:13px;font-weight:500;color:var(--ps-text-cinematic-secondary);text-decoration:none;transition:color .18s}
        .al-tool:hover{color:var(--ps-primary)}
        .al-out{align-self:flex-start;font-family:var(--ps-font-en);font-size:12px;color:var(--ps-text-cinematic-secondary);background:transparent;border:1px solid var(--ps-surface-cinematic-3);border-radius:100px;padding:8px 16px;cursor:pointer;transition:color .18s,border-color .18s}
        .al-out:hover{color:#fff;border-color:rgba(255,255,255,.3)}
      `}</style>
    </div>
  );
}
