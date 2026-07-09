import { useMemo, useState } from 'react';
import type { Work } from '../data/works';
import { useWorks } from '../lib/useWorks';
import { useAdminSession } from '../lib/useAdminSession';
import { sbDelete } from '../lib/supabase';
import WorkEditModal from './admin/WorkEditModal';

type StatusFilter = '전체' | 'live' | 'soon';
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '전체', label: '전체' },
  { key: 'live', label: 'Live' },
  { key: 'soon', label: '준비 중' },
];

export default function WorksFilter() {
  const { items: works, reload } = useWorks();
  const { isAdmin, accessToken } = useAdminSession();
  const [status, setStatus] = useState<StatusFilter>('전체');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [editing, setEditing] = useState<Work | 'new' | null>(null);

  // 기술 태그 (live 작업 기준, 빈도순 · 'Coming soon' 제외)
  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const w of works)
      if (w.status === 'live')
        for (const t of w.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [works]);

  const filtered = useMemo(
    () =>
      works.filter((w) => {
        if (status !== '전체' && w.status !== status) return false;
        if (activeTags.length && !activeTags.every((t) => w.tags.includes(t))) return false;
        return true;
      }),
    [works, status, activeTags]
  );

  const toggleTag = (t: string) =>
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const reset = () => {
    setStatus('전체');
    setActiveTags([]);
  };
  const active = status !== '전체' || activeTags.length > 0;
  const liveCount = filtered.filter((w) => w.status === 'live').length;
  const nextNum = String(
    Math.max(0, ...works.map((w) => parseInt(w.num, 10) || 0)) + 1
  ).padStart(3, '0');

  async function remove(w: Work) {
    if (!accessToken) return;
    if (!confirm(`Work ${w.num} "${w.title}"를 삭제할까요?`)) return;
    try {
      await sbDelete('works', `?num=eq.${encodeURIComponent(w.num)}`, accessToken);
      reload();
    } catch (e: any) {
      alert('삭제 실패: ' + (e?.message || '알 수 없는 오류'));
    }
  }

  const adminBar = (w: Work) =>
    isAdmin && (
      <div className="work-admin">
        <button type="button" className="work-admin-btn" onClick={(e) => { e.preventDefault(); setEditing(w); }} aria-label="수정">✎</button>
        <button type="button" className="work-admin-btn danger" onClick={(e) => { e.preventDefault(); remove(w); }} aria-label="삭제">✕</button>
      </div>
    );

  return (
    <div className="wf">
      <div className="wf-controls">
        {isAdmin && (
          <button type="button" className="wf-add" onClick={() => setEditing('new')}>+ Work 추가</button>
        )}
        <div className="wf-tabs" role="group" aria-label="상태">
          {STATUS_TABS.map((s) => (
            <button
              type="button"
              key={s.key}
              className={'wf-tab' + (status === s.key ? ' on' : '')}
              aria-pressed={status === s.key}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {allTags.length > 0 && (
          <div className="wf-tags">
            {allTags.map((t) => (
              <button
                type="button"
                key={t}
                className={'wf-chip' + (activeTags.includes(t) ? ' on' : '')}
                aria-pressed={activeTags.includes(t)}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            ))}
            {active && (
              <button type="button" className="wf-reset" onClick={reset}>
                초기화 ✕
              </button>
            )}
          </div>
        )}
      </div>

      <div className="wf-count">
        <b>{liveCount}</b>
        <span>{active ? '개 프로젝트 · 필터 적용됨' : '개 프로젝트 · Shipped'}</span>
      </div>

      {filtered.length > 0 ? (
        <div className="work-grid">
          {filtered.map((w) =>
            w.status === 'live' ? (
              <div className="work-card-wrap" key={w.num}>
                <a href={w.url} className="work-card live">
                  <div className="work-poster">
                    <span className="status live">Live</span>
                    <span className="pnum">{w.num}</span>
                    <span className="ptitle" dangerouslySetInnerHTML={{ __html: w.titleHtml }} />
                  </div>
                  <div className="work-body">
                    <span className="work-week">{w.week}</span>
                    <p className="work-desc">{w.desc}</p>
                    <div className="work-tags">
                      {w.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  </div>
                </a>
                {adminBar(w)}
              </div>
            ) : (
              <div className="work-card-wrap" key={w.num}>
                <div className="work-card soon">
                  <div className="work-poster">
                    <span className="status soon">Soon</span>
                    <span className="pnum">{w.num}</span>
                    <span className="ptitle" dangerouslySetInnerHTML={{ __html: w.titleHtml }} />
                  </div>
                  <div className="work-body">
                    <span className="work-week">{w.week}</span>
                    <p className="work-desc">{w.desc}</p>
                    <div className="work-tags">
                      {w.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {adminBar(w)}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="wf-empty">
          <p className="wf-empty-big">해당하는 프로젝트가 없어요</p>
          <button type="button" className="wf-reset" onClick={reset}>
            필터 초기화 ✕
          </button>
        </div>
      )}

      {editing && accessToken && (
        <WorkEditModal
          key={editing === 'new' ? 'new' : editing.num}
          accessToken={accessToken}
          initial={editing === 'new' ? undefined : editing}
          nextNum={nextNum}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}

      <style>{`
        .wf-add{align-self:flex-start;font-family:var(--ps-font-body);font-size:12.5px;font-weight:600;color:#000;background:#B8B8B8;border:0;border-radius:100px;padding:8px 16px;cursor:pointer;margin-bottom:12px;transition:background .18s}
        .wf-add:hover{background:#fff}
        .work-card-wrap{position:relative}
        .work-admin{position:absolute;top:10px;right:10px;display:flex;gap:5px;z-index:2}
        .work-admin-btn{width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:100px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.65);color:#B8B8B8;cursor:pointer;font-size:12px;line-height:1;padding:0}
        .work-admin-btn:hover{color:#fff;border-color:rgba(255,255,255,.4)}
        .work-admin-btn.danger:hover{color:#ff8080}
      `}</style>
    </div>
  );
}
