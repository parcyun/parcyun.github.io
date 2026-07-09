import { useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL, isAdminEmail } from '../lib/supabaseClient';

export default function AdminAuth() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (input.trim().toLowerCase() !== ADMIN_EMAIL) {
      setErr('등록된 관리자 이메일이 아니에요.');
      return;
    }
    setStatus('sending');
    const { error } = await supabase.auth.signInWithOtp({ email: ADMIN_EMAIL });
    if (error) {
      setStatus('error');
      setErr(error.message);
    } else {
      setStatus('sent');
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  const isAdmin = isAdminEmail(email);

  return (
    <div className="pa-wrap">
      {isAdmin ? (
        <button type="button" className="pa-link on" onClick={logout} title={email || ''}>
          관리자 모드 · 로그아웃
        </button>
      ) : (
        <button type="button" className="pa-link" onClick={() => setOpen((v) => !v)}>
          관리자
        </button>
      )}

      {open && !isAdmin && (
        <div className="pa-pop" role="dialog" aria-label="관리자 로그인">
          {status === 'sent' ? (
            <p className="pa-msg">메일함에서 로그인 링크를 확인해 주세요.</p>
          ) : (
            <form onSubmit={sendLink} className="pa-form">
              <input
                type="email"
                placeholder="관리자 이메일"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="pa-input"
                autoFocus
              />
              <button type="submit" className="pa-submit" disabled={status === 'sending'}>
                {status === 'sending' ? '전송 중…' : '로그인 링크 받기'}
              </button>
              {err && <p className="pa-err">{err}</p>}
            </form>
          )}
        </div>
      )}

      <style>{`
        .pa-wrap{position:relative;display:inline-flex;align-items:center}
        .pa-link{font-family:var(--ps-font-en);font-size:11px;font-weight:400;letter-spacing:.3px;color:var(--ps-text-cinematic-secondary);background:transparent;border:0;cursor:pointer;padding:0;transition:color .18s}
        .pa-link:hover{color:#fff}
        .pa-link.on{color:#B8B8B8}
        .pa-link.on:hover{color:#fff}
        .pa-pop{position:absolute;bottom:calc(100% + 10px);left:0;width:230px;background:#141414;border:1px solid #333;border-radius:12px;padding:14px;box-shadow:0 12px 30px rgba(0,0,0,.5);z-index:10001}
        .pa-form{display:flex;flex-direction:column;gap:8px}
        .pa-input{width:100%;font-family:var(--ps-font-body);font-size:12.5px;color:#fff;background:#000;border:1px solid #333;border-radius:7px;padding:8px 10px;outline:none}
        .pa-input:focus{border-color:#8C8C8C}
        .pa-submit{font-family:var(--ps-font-body);font-size:12px;font-weight:600;color:#000;background:#B8B8B8;border:0;border-radius:100px;padding:8px 12px;cursor:pointer;transition:background .18s}
        .pa-submit:hover:not(:disabled){background:#fff}
        .pa-submit:disabled{opacity:.5;cursor:not-allowed}
        .pa-msg{margin:0;font-size:12px;color:var(--ps-text-cinematic-secondary);line-height:1.5}
        .pa-err{margin:0;font-size:11px;color:#ff8080}
      `}</style>
    </div>
  );
}
