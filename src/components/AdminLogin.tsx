import { useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL, isAdminEmail } from '../lib/supabaseClient';

// /admin 비밀번호 로그인 — 이메일 매직링크 대체.
// 고정 관리자 계정(ADMIN_EMAIL)에 비밀번호로 로그인 → Supabase 세션(RLS 통과) 확보.
// 세션은 localStorage에 저장돼 전 페이지·게이트가 공유한다.
export default function AdminLogin() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setEmail(data.session?.user?.email ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending'); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pw });
    if (error) {
      setStatus('error');
      setErr(/Invalid login/i.test(error.message) ? '비밀번호가 틀렸어요.' : error.message);
    } else {
      setStatus('idle'); setPw('');
    }
  }
  async function logout() { await supabase.auth.signOut(); }

  const isAdmin = isAdminEmail(email);

  return (
    <div className="al">
      {!ready ? (
        <p className="al-muted">확인 중…</p>
      ) : isAdmin ? (
        <div className="al-in">
          <div className="al-badge">● 관리자 로그인됨</div>
          <p className="al-muted">라이브 페이지로 가서 카드의 수정·삭제·＋추가 버튼으로 편집하세요. (인라인 편집은 다음 단계에서 추가됩니다.)</p>
          <div className="al-links">
            <a className="al-go" href="/atlas-gears/">교육 활동 자료 편집 →</a>
            <a className="al-go" href="/academica/">강의 자료 편집 →</a>
            <a className="al-go" href="/works/">Works 편집 →</a>
          </div>
          <button type="button" className="al-out" onClick={logout}>로그아웃</button>
        </div>
      ) : (
        <form className="al-form" onSubmit={login}>
          <label className="al-label">관리자 비밀번호</label>
          <input className="al-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" placeholder="비밀번호" />
          <button className="al-submit" type="submit" disabled={status === 'sending' || !pw}>{status === 'sending' ? '로그인 중…' : '로그인'}</button>
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
        .al-out{align-self:flex-start;font-family:var(--ps-font-en);font-size:12px;color:var(--ps-text-cinematic-secondary);background:transparent;border:1px solid var(--ps-surface-cinematic-3);border-radius:100px;padding:8px 16px;cursor:pointer;transition:color .18s,border-color .18s}
        .al-out:hover{color:#fff;border-color:rgba(255,255,255,.3)}
      `}</style>
    </div>
  );
}
