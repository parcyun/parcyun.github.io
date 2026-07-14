import { useEffect, useState } from 'react';
import { getAdminPw, setAdminPw, clearAdminPw, checkPassword } from '../lib/adminPw';

// /admin 비밀번호 로그인 — 이메일/계정 없음. 사전에 정해둔 비밀번호를 입력하면 편집 메뉴로.
export default function AdminLogin() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [pw, setPw] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy'>('idle');
  const [err, setErr] = useState('');

  useEffect(() => { setLoggedIn(!!getAdminPw()); setReady(true); }, []);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setStatus('busy');
    const ok = await checkPassword(pw);
    setStatus('idle');
    if (ok) { setAdminPw(pw); setLoggedIn(true); setPw(''); }
    else setErr('비밀번호가 올바르지 않아요.');
  }
  function logout() { clearAdminPw(); setLoggedIn(false); setPw(''); }

  return (
    <div className="al">
      {!ready ? (
        <p className="al-muted">확인 중…</p>
      ) : loggedIn ? (
        <div className="al-in">
          <div className="al-badge">● 관리자 로그인됨</div>
          <p className="al-muted">Design Studio 한 곳에서 페이지 문구·디자인·경력·자료·Works·개선 요청을 관리할 수 있어요.</p>
          <div className="al-links">
            <a className="al-go" href="/admin/components/">Design Studio 열기 →</a>
          </div>
          <div className="al-tools">
            <span className="al-tools-label">관리자 도구</span>
            <a className="al-tool" href="/dashboard.html">업무 대시보드 ↗</a>
          </div>
          <button type="button" className="al-out" onClick={logout}>로그아웃</button>
        </div>
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
