import { useEffect, useRef, useState } from 'react';
import { sbInsert, sbUpdate } from '../../lib/supabase';
import type { Category, Resource, ResourceType } from '../../data/resources';

const TYPES_BY_CATEGORY: Record<Category, ResourceType[]> = {
  '강의 자료': ['강의', '실습', '가이드', '아카이브'],
  '교육 활동 자료': ['게임', '활동지', '커리큘럼', '인터랙티브'],
};

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return (base || 'resource') + '-' + Math.random().toString(36).slice(2, 6);
}

interface Props {
  category: Category;
  accessToken: string;
  initial?: Resource;
  onClose: () => void;
  onSaved: () => void;
}

export default function ResourceEditModal({ category, accessToken, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  const [id] = useState(initial?.id || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [desc, setDesc] = useState(initial?.desc || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [external, setExternal] = useState(!!initial?.external);
  const [type, setType] = useState<ResourceType>(initial?.type || TYPES_BY_CATEGORY[category][0]);
  const [subject, setSubject] = useState(initial?.subject || '');
  const [thumb, setThumb] = useState(initial?.thumb || '');
  const [date, setDate] = useState(initial?.date || '');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // ESC 닫기 + 최초 포커스(첫 활성 입력). 리스너는 모달 수명 동안만 등록.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    formRef.current?.querySelector<HTMLElement>('input:not([disabled]), select, textarea')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setErr('제목과 링크는 필수예요.');
      return;
    }
    setSaving(true);
    setErr('');
    const payload = {
      category,
      type,
      subject: subject.trim(),
      title: title.trim(),
      description: desc.trim(),
      url: url.trim(),
      external,
      thumb: thumb.trim(),
      lid: initial?.lid || '',
      poster_title: initial?.posterTitle || title.trim(),
      date: date.trim(),
      meta: initial?.meta || [],
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (isEdit) {
        await sbUpdate('resources', `?id=eq.${encodeURIComponent(id)}`, payload, accessToken);
      } else {
        await sbInsert('resources', { id: slugify(title), sort: 999, ...payload }, accessToken);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setErr('저장 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rem-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="rem-title">
      <form ref={formRef} className="rem-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="rem-title" id="rem-title">{isEdit ? '자료 수정' : '자료 추가'}</h3>

        <label className="rem-field">
          <span>제목</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="rem-field">
          <span>설명</span>
          <textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        <label className="rem-field">
          <span>링크</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} required />
        </label>
        <label className="rem-check">
          <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} />
          <span>외부 링크(새 탭)</span>
        </label>
        <div className="rem-row">
          <label className="rem-field">
            <span>유형</span>
            <select value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
              {TYPES_BY_CATEGORY[category].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="rem-field">
            <span>소분류</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 국어, LLM · Harness Agent" />
          </label>
        </div>
        <div className="rem-row">
          <label className="rem-field">
            <span>썸네일(이모지)</span>
            <input value={thumb} onChange={(e) => setThumb(e.target.value)} placeholder="🎬" />
          </label>
          <label className="rem-field">
            <span>날짜</span>
            <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="2026.07.09" />
          </label>
        </div>
        <label className="rem-field">
          <span>태그(쉼표로 구분)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="국어, 맞춤법, 게임" />
        </label>

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
          .rem-field input:focus,.rem-field textarea:focus,.rem-field select:focus{border-color:var(--ps-primary)}
          .rem-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
          .rem-check{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#EDEDED}
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
