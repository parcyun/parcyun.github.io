import { useMemo, useState } from 'react';
import type { Work, WorkStatus } from '../data/works';

type StatusFilter = '전체' | 'live' | 'soon';
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '전체', label: '전체' },
  { key: 'live', label: 'Live' },
  { key: 'soon', label: '준비 중' },
];

export default function WorksFilter({ works }: { works: Work[] }) {
  const [status, setStatus] = useState<StatusFilter>('전체');
  const [activeTags, setActiveTags] = useState<string[]>([]);

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

  return (
    <div className="wf">
      <div className="wf-controls">
        <div className="wf-tabs" role="tablist" aria-label="상태">
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
              <a key={w.num} href={w.url} className="work-card live">
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
            ) : (
              <div key={w.num} className="work-card soon">
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
    </div>
  );
}
