import { useEffect, useRef, useState } from 'react';
import { adminSaveWork } from '../../lib/adminPw';
import type { Work, WorkStatus } from '../../data/works';

interface Props {
  pw: string;
  initial?: Work;
  nextNum: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function WorkEditModal({ pw, initial, nextNum, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  const [num] = useState(initial?.num || nextNum);
  const [title, setTitle] = useState(initial?.title || '');
  const [titleHtml, setTitleHtml] = useState(initial?.titleHtml || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [week, setWeek] = useState(initial?.week || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [status, setStatus] = useState<WorkStatus>(initial?.status || 'live');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // ESC 닫기 + 최초 포커스(disabled 번호 필드는 건너뛰고 제목에). 모달 수명 동안만 리스너 등록.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    formRef.current?.querySelector<HTMLElement>('input:not([disabled]), select, textarea')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErr('제목은 필수예요.');
      return;
    }
    setSaving(true);
    setErr('');
    const payload = {
      title: title.trim(),
      title_html: titleHtml.trim() || title.trim(),
      description: desc.trim(),
      week: week.trim(),
      url: url.trim(),
      status,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      const row = isEdit ? { num, ...payload } : { num, sort: Number(num) * 10 || 999, ...payload };
      await adminSaveWork(pw, row);
      onSaved();
      onClose();
    } catch (e: any) {
      setErr('저장 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rem-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="work-modal-title">
      <form ref={formRef} className="rem-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="rem-title" id="work-modal-title">{isEdit ? `Work ${num} 수정` : '새 Work 추가'}</h3>
        <label className="rem-field"><span>번호</span><input value={num} disabled /></label>
        <label className="rem-field"><span>제목</span><input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label className="rem-field"><span>포스터 제목(HTML, &lt;br&gt; 허용)</span><input value={titleHtml} onChange={(e) => setTitleHtml(e.target.value)} placeholder={title} /></label>
        <label className="rem-field"><span>설명</span><textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <div className="rem-row">
          <label className="rem-field"><span>주차</span><input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Week 04 · 2026.07" /></label>
          <label className="rem-field">
            <span>상태</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as WorkStatus)}>
              <option value="live">live</option>
              <option value="soon">soon</option>
            </select>
          </label>
        </div>
        <label className="rem-field"><span>링크</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/works/004-..." /></label>
        <label className="rem-field"><span>태그(쉼표로 구분)</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="HTML, CSS, Static" /></label>

        {err && <p className="rem-err">{err}</p>}
        <div className="rem-actions">
          <button type="button" className="rem-cancel" onClick={onClose}>취소</button>
          <button type="submit" className="rem-save" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>

        <style>{`
          .rem-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}
          .rem-card{width:100%;max-width:440px;max-height:88vh;overflow-y:auto;background:var(--ps-surface-cinematic-1);border:1px solid var(--ps-surface-cinematic-3);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:12px}
          .rem-title{margin:0 0 4px;font-size:17px;font-weight:700;color:#fff}
          .rem-field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--ps-text-cinematic-secondary)}
          .rem-field input,.rem-field textarea,.rem-field select{font-family:var(--ps-font-body);font-size:13.5px;color:#fff;background:#000;border:1px solid var(--ps-surface-cinematic-3);border-radius:8px;padding:9px 11px;outline:none;resize:vertical}
          .rem-field input:disabled{opacity:.5}
          .rem-field input:focus,.rem-field textarea:focus,.rem-field select:focus{border-color:var(--ps-primary)}
          .rem-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
          .rem-err{margin:0;font-size:12px;color:#ff8080}
          .rem-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}
          .rem-cancel,.rem-save{font-family:var(--ps-font-body);font-size:13px;font-weight:600;border:0;border-radius:100px;padding:9px 18px;cursor:pointer}
          .rem-cancel{background:transparent;color:var(--ps-text-cinematic-secondary);border:1px solid var(--ps-surface-cinematic-3)}
          .rem-cancel:hover{color:#fff}
          .rem-save{background:var(--ps-primary);color:#000}
          .rem-save:hover:not(:disabled){background:var(--ps-primary-dark)}
          .rem-save:disabled{opacity:.5;cursor:not-allowed}
        `}</style>
      </form>
    </div>
  );
}
