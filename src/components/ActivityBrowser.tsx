import { useMemo, useState } from 'react';
import type { Category, Resource } from '../data/resources';
import { icon, typeIcon } from '../lib/icons';
import { useResources } from '../lib/useResources';
import { useAdmin } from '../lib/useAdmin';
import { adminDeleteResource } from '../lib/adminPw';
import ResourceEditModal from './admin/ResourceEditModal';

const TYPE_META: Record<string, { en: string; ph: string }> = {
  '게임': { en: 'Game', ph: '새 게임 준비 중' },
  '인터랙티브': { en: 'Interactive', ph: '새 인터랙티브 자료 준비 중' },
  '활동지': { en: 'Worksheet', ph: '새 활동지 준비 중' },
  '커리큘럼': { en: 'Curriculum', ph: '새 커리큘럼 준비 중' },
  '수업 보조 도구': { en: 'Teaching Tools', ph: '새 수업 보조 도구 준비 중' },
};

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

const CATEGORY: Category = '교육 활동 자료';

export default function ActivityBrowser({ types }: { types: string[] }) {
  const { items: resources, reload } = useResources(CATEGORY);
  const { isAdmin, pw } = useAdmin();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('전체');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);

  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of resources) for (const t of r.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([t]) => t);
  }, [resources]);

  // 렌더 타입 = 기본 4종 + 데이터에 있는 미지 타입(Supabase 직접 추가분 등) → 조용히 사라지지 않게
  const renderTypes = useMemo(() => {
    const extra = [...new Set(resources.map((r) => r.type))].filter((t) => !types.includes(t));
    return [...types, ...extra];
  }, [resources, types]);

  const match = (r: Resource) => {
    if (type !== '전체' && r.type !== type) return false;
    if (activeTags.length && !activeTags.every((t) => r.tags.includes(t))) return false;
    const q = norm(query);
    if (!q) return true;
    const hay = norm([r.title, r.desc, r.subject, r.type, ...r.tags].join(' '));
    return q.split(' ').every((w) => hay.includes(w));
  };

  const filtering = query.trim() !== '' || type !== '전체' || activeTags.length > 0;
  const filtered = resources.filter(match);
  const toggleTag = (t: string) =>
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const reset = () => {
    setQuery('');
    setType('전체');
    setActiveTags([]);
  };

  async function remove(r: Resource) {
    if (!pw) return;
    if (!confirm(`"${r.title}" 자료를 삭제할까요?`)) return;
    try {
      await adminDeleteResource(pw, r.id);
      reload();
    } catch (e: any) {
      alert('삭제 실패: ' + (e?.message || '알 수 없는 오류'));
    }
  }

  const card = (r: Resource) => (
    <div className="act-card-wrap" key={r.id}>
      <a
        href={r.url}
        className="act-card"
        data-res-id={r.id}
        target="_blank"
        rel="noopener"
      >
        <div className="act-thumb ico" dangerouslySetInnerHTML={{ __html: icon(typeIcon[r.type], 28) }} />
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
      {isAdmin && (
        <div className="act-admin">
          <button type="button" className="act-admin-btn" onClick={() => setEditing(r)} aria-label="수정">
            <span className="ico" dangerouslySetInnerHTML={{ __html: icon('guide', 14) }} />
          </button>
          <button type="button" className="act-admin-btn danger" onClick={() => remove(r)} aria-label="삭제">✕</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="ab">
      <div className="ab-controls">
        {isAdmin && (
          <button type="button" className="ab-add" onClick={() => setEditing('new')}>+ 자료 추가</button>
        )}
        <div className="rx-search">
          <span className="rx-search-icon ico" dangerouslySetInnerHTML={{ __html: icon('search', 17) }} />
          <input
            type="search"
            className="rx-input"
            placeholder="자료 검색 — 제목·태그 (예: 맞춤법, 부피, 지도)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="활동 자료 검색"
          />
          {filtering && (
            <button type="button" className="rx-reset" onClick={reset} aria-label="필터 초기화">
              초기화 ✕
            </button>
          )}
        </div>
        <div className="rx-row">
          <div className="rx-tabs" role="group" aria-label="카테고리">
            {['전체', ...types].map((c) => (
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
      </div>

      {filtering && (
        <div className="rx-count">
          <b>{filtered.length}</b>
          <span>개 활동 · 필터 적용됨</span>
        </div>
      )}

      {filtering && filtered.length === 0 ? (
        <div className="rx-empty">
          <p className="rx-empty-big">검색 결과가 없어요</p>
          <p className="rx-empty-sub">다른 키워드·카테고리·태그로 찾아보거나, 필터를 초기화해 보세요.</p>
          <button type="button" className="rx-reset" onClick={reset}>필터 초기화 ✕</button>
        </div>
      ) : (
        renderTypes.map((t) => {
          const cards = filtered.filter((r) => r.type === t);
          if (filtering && cards.length === 0) return null;
          const total = resources.filter((r) => r.type === t).length;
          return (
            <div className="type-section" key={t}>
              <header className="type-head">
                <span className="ico type-ico" dangerouslySetInnerHTML={{ __html: icon(typeIcon[t] || 'guide', 20) }} />
                <span className="ko">{t}</span>
                <span className="en">{TYPE_META[t]?.en}</span>
                <span className="cnt"><b>{total}</b>개</span>
              </header>
              <div className="act-grid">
                {cards.map(card)}
                {!filtering && cards.length === 0 && (
                  <div className="act-card placeholder"><span>{TYPE_META[t]?.ph}</span></div>
                )}
              </div>
            </div>
          );
        })
      )}

      {editing && pw && (
        <ResourceEditModal
          key={editing === 'new' ? 'new' : editing.id}
          category={CATEGORY}
          pw={pw}
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}

      <style>{`
        .ab-add{align-self:flex-start;font-family:var(--ps-font-body);font-size:12.5px;font-weight:600;color:#000;background:#B8B8B8;border:0;border-radius:100px;padding:8px 16px;cursor:pointer;transition:background .18s}
        .ab-add:hover{background:#fff}
        .act-card-wrap{position:relative}
        .act-admin{position:absolute;top:8px;right:8px;display:flex;gap:5px;z-index:2}
        .act-admin-btn{width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:100px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.65);color:#B8B8B8;cursor:pointer;font-size:12px;line-height:1;padding:0}
        @media(max-width:767px){.act-admin{gap:8px}.act-admin-btn{width:34px;height:34px;font-size:15px}}
        .act-admin-btn:hover{color:#fff;border-color:rgba(255,255,255,.4)}
        .act-admin-btn.danger:hover{color:#ff8080}
      `}</style>
    </div>
  );
}
