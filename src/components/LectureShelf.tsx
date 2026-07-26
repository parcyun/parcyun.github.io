import { useMemo, useState } from 'react';
import type { Category, Resource } from '../data/resources';
import { icon, typeIcon } from '../lib/icons';
import { useResources } from '../lib/useResources';
import { useAdmin } from '../lib/useAdmin';
import { adminDeleteResource } from '../lib/adminPw';
import ResourceEditModal from './admin/ResourceEditModal';
import ResourceHoverPreview, { resourcePreviewId } from './ResourceHoverPreview';

const CATEGORY: Category = '강의 자료';
const SUBJECT_EN: Record<string, string> = {
  '연수 아카이브': 'Training Archive',
  'LLM · Harness Agent': 'LLM & Harness',
  'Notion 활용': 'Notion',
};

export default function LectureShelf() {
  const { items: lectures, loading, reload } = useResources(CATEGORY);
  const { isAdmin, pw } = useAdmin();
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);

  const cats = useMemo(() => [...new Set(lectures.map((r) => r.subject))], [lectures]);
  const byCat = (s: string) => lectures.filter((r) => r.subject === s);

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

  // loading 중에도 정적 시드(useResources 초기값)로 서가를 즉시 렌더 → SSR 콘텐츠 확보 +
  // client:visible 하이드레이션이 관측할 실제 높이 확보(빈 아일랜드로 인한 조기/미하이드레이션 방지).
  void loading;

  return (
    <div className="ls">
      {isAdmin && (
        <button type="button" className="ls-add" onClick={() => setEditing('new')}>+ 자료 추가</button>
      )}
      {cats.map((c) => (
        <div className="shelf-cat" key={c}>
          <header className="shelf-cat-head">
            <span className="ko">{c}</span>
            <span className="en">{SUBJECT_EN[c] ?? ''}</span>
            <span className="cnt"><b>{byCat(c).length}</b>권</span>
          </header>
          <div className="hbooks">
            {byCat(c).map((r) => (
              <div className="hbook-row" key={r.id}>
                <a href={r.url} className="hbook" data-res-id={r.id} aria-describedby={resourcePreviewId(r.id)} target={r.external ? '_blank' : undefined} rel={r.external ? 'noopener' : undefined}>
                  <span className="hbook-ico ico" dangerouslySetInnerHTML={{ __html: icon(typeIcon[r.type], 20) }} />
                  <span className="hbook-main">
                    <span className="hbook-title">{r.title}</span>
                    <span className="hbook-meta">{r.type}{r.meta && r.meta[1] ? ' · ' + r.meta[1] : ''}</span>
                  </span>
                  <span className="hbook-go ico" dangerouslySetInnerHTML={{ __html: icon('arrowRight', 18) }} />
                </a>
                <ResourceHoverPreview resource={r} />
                {isAdmin && (
                  <div className="hbook-admin">
                    <button type="button" className="hbook-admin-btn" onClick={() => setEditing(r)} aria-label="수정">
                      <span className="ico" dangerouslySetInnerHTML={{ __html: icon('guide', 13) }} />
                    </button>
                    <button type="button" className="hbook-admin-btn danger" onClick={() => remove(r)} aria-label="삭제">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

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
        .ls-add{display:inline-block;margin-bottom:22px;font-family:var(--ps-font-body);font-size:12.5px;font-weight:600;color:#000;background:#B8B8B8;border:0;border-radius:100px;padding:8px 16px;cursor:pointer;transition:background .18s}
        .ls-add:hover{background:#fff}
        .hbook-row{position:relative}
        .hbook-admin{position:absolute;top:50%;right:44px;transform:translateY(-50%);display:flex;gap:5px;z-index:2}
        .hbook-admin-btn{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:100px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.7);color:#B8B8B8;cursor:pointer;font-size:11px;line-height:1;padding:0}
        @media(max-width:767px){.hbook-admin{right:40px;gap:8px}.hbook-admin-btn{width:32px;height:32px;font-size:14px}}
        .hbook-admin-btn:hover{color:#fff;border-color:rgba(255,255,255,.4)}
        .hbook-admin-btn.danger:hover{color:#ff8080}
        .resource-hover-preview{display:none}
        @media(hover:hover) and (pointer:fine){
          .hbook-row:hover,.hbook-row:focus-within{z-index:50}
          .resource-hover-preview{position:absolute;bottom:calc(100% + 12px);left:0;z-index:40;width:100%;min-height:230px;display:grid;grid-template-columns:minmax(220px,40%) minmax(0,1fr);gap:22px;padding:18px;border:1px solid rgba(255,177,26,.42);border-radius:18px;background:rgba(20,20,20,.98);box-shadow:0 22px 56px rgba(0,0,0,.6);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(10px);transition:opacity .3s ease,transform .3s var(--ps-ease-out),visibility 0s linear .3s}
          .hbook-row:hover .resource-hover-preview,.hbook-row:focus-within .resource-hover-preview{opacity:1;visibility:visible;transform:translateY(0);transition-delay:.7s,.7s,.7s}
          .resource-hover-image{width:100%;height:100%;min-height:192px;object-fit:cover;object-position:top;border-radius:12px;background:#000}
          .resource-hover-copy{display:flex;min-width:0;flex-direction:column;justify-content:center;gap:10px;color:#C5C5C5;font-size:13px;line-height:1.7}
          .resource-hover-copy strong{color:#fff;font-size:16px;font-weight:600;line-height:1.4}
          .resource-hover-kind{display:flex;align-items:center;gap:6px;color:var(--ps-primary);font-family:var(--ps-font-en);font-size:9px;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
        }
      `}</style>
    </div>
  );
}
