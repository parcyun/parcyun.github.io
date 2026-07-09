import { useEffect, useRef, useState } from 'react';
import { sbSelect, sbInsert } from '../lib/supabase';

interface Entry {
  id: number;
  name: string;
  message: string;
  created_at: string;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  } catch {
    return '';
  }
}

export default function Guestbook({ context = '' }: { context?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sending' | 'error' | 'off'>('loading');
  const loadedRef = useRef(false);

  async function load() {
    try {
      const rows = await sbSelect<Entry>(
        'guestbook',
        '?select=id,name,message,created_at&approved=eq.true&order=created_at.desc&limit=50'
      );
      setEntries(rows);
      setStatus('idle');
    } catch {
      // 스키마 미적용/네트워크 실패 → 위젯을 조용히 비활성.
      setStatus('off');
    }
  }

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const msg = message.trim();
    if (!msg) return;
    setStatus('sending');
    try {
      const rows = await sbInsert<Entry>('guestbook', {
        name: name.trim() || '익명',
        message: msg.slice(0, 500),
        context: context.slice(0, 120),
      });
      setEntries((prev) => [...rows, ...prev]);
      setMessage('');
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'off') return null;   // 백엔드 미연결 시 렌더 안 함

  return (
    <div className="gb">
      <form className="gb-form" onSubmit={submit}>
        <input
          className="gb-name"
          type="text"
          placeholder="이름 (선택)"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="gb-msg"
          placeholder="한마디 남겨주세요. 자료 요청·피드백 환영해요!"
          maxLength={500}
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="gb-actions">
          <span className="gb-count">{message.length}/500</span>
          <button className="gb-submit" type="submit" disabled={status === 'sending' || !message.trim()}>
            {status === 'sending' ? '남기는 중…' : '방명록 남기기'}
          </button>
        </div>
        {status === 'error' && <p className="gb-err">전송에 실패했어요. 잠시 후 다시 시도해 주세요.</p>}
      </form>

      <div className="gb-list">
        {status === 'loading' && <p className="gb-empty">불러오는 중…</p>}
        {status !== 'loading' && entries.length === 0 && (
          <p className="gb-empty">아직 방명록이 없어요. 첫 한마디를 남겨보세요.</p>
        )}
        {entries.map((en) => (
          <div className="gb-item" key={en.id}>
            <div className="gb-item-head">
              <span className="gb-item-name">{en.name || '익명'}</span>
              <span className="gb-item-date">{fmtDate(en.created_at)}</span>
            </div>
            <p className="gb-item-msg">{en.message}</p>
          </div>
        ))}
      </div>

      <style>{`
        .gb{display:flex;flex-direction:column;gap:24px}
        .gb-form{display:flex;flex-direction:column;gap:10px;padding:22px;border:1px solid var(--ps-surface-cinematic-3);border-radius:14px;background:var(--ps-surface-cinematic-1)}
        .gb-name,.gb-msg{width:100%;font-family:var(--ps-font-body);font-size:14px;color:#fff;background:var(--ps-bg-cinematic);border:1px solid var(--ps-surface-cinematic-3);border-radius:9px;padding:11px 13px;outline:none;transition:border-color .18s}
        .gb-name:focus,.gb-msg:focus{border-color:var(--ps-primary)}
        .gb-msg{resize:vertical;line-height:1.6}
        .gb-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .gb-count{font-family:var(--ps-font-en);font-size:11px;color:var(--ps-text-cinematic-secondary)}
        .gb-submit{font-family:var(--ps-font-body);font-size:13px;font-weight:600;color:#000;background:var(--ps-primary);border:0;border-radius:100px;padding:10px 20px;cursor:pointer;transition:background .18s}
        .gb-submit:hover:not(:disabled){background:var(--ps-primary-dark)}
        .gb-submit:disabled{opacity:.45;cursor:not-allowed}
        .gb-err{margin:0;font-size:12px;color:#ff6b6b}
        .gb-list{display:flex;flex-direction:column;gap:12px}
        .gb-empty{font-size:13px;color:var(--ps-text-cinematic-secondary);margin:4px 0}
        .gb-item{padding:16px 18px;border:1px solid var(--ps-surface-cinematic-3);border-radius:12px;background:var(--ps-surface-cinematic-1)}
        .gb-item-head{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}
        .gb-item-name{font-size:13px;font-weight:600;color:var(--ps-primary)}
        .gb-item-date{font-family:var(--ps-font-en);font-size:11px;color:var(--ps-text-cinematic-secondary)}
        .gb-item-msg{margin:0;font-size:14px;line-height:1.65;color:#EDEDED;white-space:pre-wrap;word-break:break-word}
      `}</style>
    </div>
  );
}
