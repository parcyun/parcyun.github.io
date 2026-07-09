import { Fragment, useMemo, useState } from 'react';
import type { Resource, Category } from '../data/resources';

const CATEGORIES: (Category | '전체')[] = ['전체', '강의 자료', '교육 활동 자료'];

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export default function ResourceExplorer({
  resources,
  showCategoryTabs = true,
  placeholder = '자료 검색 — 제목·설명·태그 (예: LLM, 맞춤법, Notion)',
  unit = '자료',
}: {
  resources: Resource[];
  showCategoryTabs?: boolean;
  placeholder?: string;
  unit?: string;
}) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | '전체'>('전체');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // 전체 태그 (빈도순)
  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of resources) for (const t of r.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [resources]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return resources.filter((r) => {
      if (cat !== '전체' && r.category !== cat) return false;
      if (activeTags.length && !activeTags.every((t) => r.tags.includes(t))) return false;
      if (!q) return true;
      const hay = norm([r.title, r.desc, r.subject, r.category, ...r.tags].join(' '));
      return q.split(' ').every((w) => hay.includes(w));
    });
  }, [resources, query, cat, activeTags]);

  const toggleTag = (t: string) =>
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const reset = () => {
    setQuery('');
    setCat('전체');
    setActiveTags([]);
  };

  const active = query.trim() !== '' || cat !== '전체' || activeTags.length > 0;

  return (
    <div className="rx">
      <div className="rx-controls">
        <div className="rx-search">
          <span className="rx-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="rx-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="자료 검색"
          />
          {active && (
            <button type="button" className="rx-reset" onClick={reset} aria-label="필터 초기화">
              초기화 ✕
            </button>
          )}
        </div>

        {showCategoryTabs && (
          <div className="rx-tabs" role="tablist" aria-label="카테고리">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                className={'rx-tab' + (cat === c ? ' on' : '')}
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

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
        <span>{active ? `개 ${unit} · 필터 적용됨` : `개 ${unit}`}</span>
      </div>

      {filtered.length > 0 ? (
        <div className="lecture-grid rx-grid">
          {filtered.map((r) => (
            <a
              key={r.id}
              href={r.url}
              className="lecture-card"
              target={r.external ? '_blank' : undefined}
              rel={r.external ? 'noopener' : undefined}
            >
              <div className="lecture-card-poster">
                <div className="lid">{r.lid}</div>
                <p className="ptitle" dangerouslySetInnerHTML={{ __html: r.posterTitle }} />
              </div>
              <div className="lecture-card-body">
                {r.meta && r.meta.length > 0 && (
                  <div className="lecture-card-meta">
                    {r.meta.map((m, i) => (
                      <Fragment key={i}>
                        {i > 0 && <span className="dot"></span>}
                        <span>{m}</span>
                      </Fragment>
                    ))}
                  </div>
                )}
                <h3 className="lecture-card-title">{r.title}</h3>
                <p className="lecture-card-desc">{r.desc}</p>
                <div className="lecture-card-tags">
                  {r.tags.map((t) => (
                    <span key={t} className={'tag-pill' + (activeTags.includes(t) ? ' on' : '')}>
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
          <p className="rx-empty-sub">다른 키워드나 태그로 찾아보거나, 필터를 초기화해 보세요.</p>
          <button type="button" className="rx-reset" onClick={reset}>필터 초기화 ✕</button>
        </div>
      )}
    </div>
  );
}
