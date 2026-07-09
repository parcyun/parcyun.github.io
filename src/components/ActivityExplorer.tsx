import { useMemo, useState } from 'react';
import type { Resource } from '../data/resources';

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export default function ActivityExplorer({
  resources,
  types,
}: {
  resources: Resource[];
  types: string[];
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('전체');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of resources) for (const t of r.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [resources]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return resources.filter((r) => {
      if (type !== '전체' && r.type !== type) return false;
      if (activeTags.length && !activeTags.every((t) => r.tags.includes(t))) return false;
      if (!q) return true;
      const hay = norm([r.title, r.desc, r.subject, r.type, ...r.tags].join(' '));
      return q.split(' ').every((w) => hay.includes(w));
    });
  }, [resources, query, type, activeTags]);

  const toggleTag = (t: string) =>
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const reset = () => {
    setQuery('');
    setType('전체');
    setActiveTags([]);
  };
  const active = query.trim() !== '' || type !== '전체' || activeTags.length > 0;
  const tabs = ['전체', ...types];

  return (
    <div className="rx">
      <div className="rx-controls">
        <div className="rx-search">
          <span className="rx-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="rx-input"
            placeholder="활동 자료 검색 — 과목·주제·태그 (예: 맞춤법, 부피, 지도)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="활동 자료 검색"
          />
          {active && (
            <button type="button" className="rx-reset" onClick={reset} aria-label="필터 초기화">
              초기화 ✕
            </button>
          )}
        </div>

        <div className="rx-tabs" role="tablist" aria-label="카테고리">
          {tabs.map((c) => (
            <button
              type="button"
              key={c}
              className={'rx-tab' + (type === c ? ' on' : '')}
              aria-pressed={type === c}
              onClick={() => setType(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="rx-tags">
          {allTags.map((t) => (
            <button
              type="button"
              key={t}
              className={'rx-chip' + (activeTags.includes(t) ? ' on' : '')}
              aria-pressed={activeTags.includes(t)}
              onClick={() => toggleTag(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      <div className="rx-count">
        <b>{filtered.length}</b>
        <span>{active ? '개 활동 · 필터 적용됨' : '개 활동'}</span>
      </div>

      {filtered.length > 0 ? (
        <div className="act-grid">
          {filtered.map((r) => (
            <a
              key={r.id}
              href={r.url}
              className="act-card"
              target={r.external ? '_blank' : undefined}
              rel={r.external ? 'noopener' : undefined}
            >
              <div className="act-thumb">{r.thumb}</div>
              <div className="act-body">
                <span className="act-type">{r.type}</span>
                <h3 className="act-title">{r.title}</h3>
                <p className="act-desc">{r.desc}</p>
                <div className="act-tags">
                  {r.tags.map((t) => (
                    <span key={t} className={'tag-pill sm' + (activeTags.includes(t) ? ' on' : '')}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rx-empty">
          <p className="rx-empty-big">검색 결과가 없어요</p>
          <p className="rx-empty-sub">다른 키워드·카테고리·태그로 찾아보거나, 필터를 초기화해 보세요.</p>
          <button type="button" className="rx-reset" onClick={reset}>필터 초기화 ✕</button>
        </div>
      )}
    </div>
  );
}
