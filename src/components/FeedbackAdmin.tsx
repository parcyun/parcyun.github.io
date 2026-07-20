import { useEffect, useState } from 'react';
import {
  adminListFeedback,
  adminDeleteFeedback,
  adminMarkFeedbackImplemented,
  adminSetFeedbackService,
  adminSetFeedbackStatus,
  getAdminPw,
  type FeedbackPost,
  type ServiceKey,
} from '../lib/adminPw';

const statusLabel = { pending: '승인 대기', published: '공개됨', rejected: '반려됨' } as const;
const serviceLabels: Record<ServiceKey, string> = {
  home: '홈', 'spell-drill': 'Spell Drill', 'atlas-gears': 'ATLAS GEARS', geoweb: 'GeoWeb', other: '기타', unclassified: '미분류',
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function FeedbackAdmin() {
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'logged-out'>('loading');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  async function load() {
    const pw = getAdminPw();
    if (!pw) { setState('logged-out'); return; }
    setState('loading');
    try { setPosts(await adminListFeedback(pw)); setState('ready'); }
    catch { setState('error'); }
  }

  useEffect(() => { load(); }, []);

  async function review(post: FeedbackPost, status: 'published' | 'rejected') {
    const pw = getAdminPw();
    if (!pw) { setState('logged-out'); return; }
    setBusyId(post.id);
    try {
      await adminSetFeedbackStatus(pw, post.id, status);
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, status, reviewed_at: new Date().toISOString() }
        : item));
    } catch { setState('error'); }
    finally { setBusyId(null); }
  }
  async function updateService(post: FeedbackPost, serviceKey: ServiceKey) {
    const pw = getAdminPw();
    if (!pw) { setState('logged-out'); return; }
    setBusyId(post.id);
    try { await adminSetFeedbackService(pw, post.id, serviceKey); setPosts((current) => current.map((item) => item.id === post.id ? { ...item, service_key: serviceKey } : item)); setEditingServiceId(null); }
    catch { setState('error'); }
    finally { setBusyId(null); }
  }
  async function remove(post: FeedbackPost) {
    const pw = getAdminPw();
    if (!pw) { setState('logged-out'); return; }
    if (!window.confirm('이 개선 요청을 영구 삭제할까요?')) return;
    setBusyId(post.id);
    try { await adminDeleteFeedback(pw, post.id); setPosts((current) => current.filter((item) => item.id !== post.id)); }
    catch { setState('error'); }
    finally { setBusyId(null); }
  }
  async function markImplemented(post: FeedbackPost) {
    const pw = getAdminPw();
    if (!pw) { setState('logged-out'); return; }
    setBusyId(post.id);
    try {
      await adminMarkFeedbackImplemented(pw, post.id);
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, implemented_at: new Date().toISOString() }
        : item));
    } catch { setState('error'); }
    finally { setBusyId(null); }
  }

  if (state === 'logged-out') return <p className="fa-message">관리자 로그인 후 이용할 수 있습니다. <a href="/admin/">/admin에서 로그인</a>해 주세요.</p>;
  if (state === 'loading') return <p className="fa-message">요청을 불러오는 중…</p>;
  if (state === 'error') return <p className="fa-message">요청을 불러오지 못했습니다. <button type="button" onClick={load}>다시 시도</button></p>;

  return (
    <section className="fa">
      <div className="fa-top"><p>{posts.length}개 요청</p><button type="button" onClick={load}>새로고침</button></div>
      {!posts.length ? <p className="fa-message">아직 등록된 요청이 없습니다.</p> : (
        <div className="fa-list">
          {posts.map((post) => (
            <article className="fa-post" key={post.id}>
              <header>
                <span className={`fa-status is-${post.status}`}>{statusLabel[post.status]}</span><span className="service-tag">{serviceLabels[post.service_key]}</span>
                <time>{dateTime(post.created_at)}</time>
              </header>
              <p className="fa-body">{post.body}</p>
              <footer><span>{post.source_path}</span><span>공감 {post.like_count}</span></footer>
              <div className="fa-actions">
                {editingServiceId === post.id ? <select aria-label="서비스 태그" value={post.service_key} disabled={busyId === post.id} onChange={(event) => updateService(post, event.target.value as ServiceKey)}>{Object.entries(serviceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <button type="button" disabled={busyId === post.id} onClick={() => setEditingServiceId(post.id)}>태그 수정</button>}
                {post.status === 'pending' && <>
                  <button type="button" className="fa-approve" disabled={busyId === post.id} onClick={() => review(post, 'published')}>공개 승인</button>
                  <button type="button" className="fa-reject" disabled={busyId === post.id} onClick={() => review(post, 'rejected')}>반려</button>
                </>}
                {post.status === 'published' && <span className="is-published">published</span>}
                {post.status === 'published' && <button type="button" className="fa-implemented" disabled={busyId === post.id || Boolean(post.implemented_at)} onClick={() => markImplemented(post)}>{post.implemented_at ? '반영 완료' : '업데이트 반영'}</button>}
                <button type="button" className="fa-delete" disabled={busyId === post.id} onClick={() => remove(post)}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <style>{`
        .fa{width:min(100%,720px)}.fa-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.fa-top p{margin:0;color:var(--ps-text-cinematic-secondary);font-size:13px}.fa-top button,.fa-message button{border:1px solid var(--ps-surface-cinematic-3);background:transparent;border-radius:999px;color:#fff;padding:7px 12px;font:12px var(--ps-font-body);cursor:pointer}.fa-top button:hover,.fa-message button:hover{border-color:var(--ps-primary);color:var(--ps-primary)}.fa-list{display:flex;flex-direction:column;gap:10px}.fa-post{padding:18px;background:var(--ps-surface-cinematic-1);border:1px solid var(--ps-surface-cinematic-3);border-radius:12px}.fa-post header,.fa-post footer{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--ps-text-cinematic-secondary);font:11px var(--ps-font-en)}.fa-status,.service-tag{padding:4px 8px;border:1px solid;border-radius:999px}.service-tag{color:#aaa49b;border-color:var(--ps-surface-cinematic-3)}.fa-status.is-pending{color:var(--ps-primary)}.fa-status.is-published{color:#87d8a3}.fa-status.is-rejected{color:#e58b8b}.fa-body{white-space:pre-wrap;margin:14px 0;color:#f1f1f1;font-size:14px;line-height:1.65}.fa-post footer{padding-top:12px;border-top:1px solid var(--ps-surface-cinematic-3);word-break:break-all}.fa-actions{display:flex;gap:8px;margin-top:14px;align-items:center;flex-wrap:wrap}.fa-actions button,.fa-actions select{border:0;border-radius:999px;padding:8px 13px;font:600 12px var(--ps-font-body);cursor:pointer}.fa-actions select{border:1px solid var(--ps-surface-cinematic-3);background:#1b1a18;color:#fff}.fa-actions button:disabled,.fa-actions select:disabled{opacity:.55;cursor:wait}.fa-approve{background:var(--ps-primary);color:#000}.fa-reject{background:#2a2a2a;color:#bbb}.fa-implemented{background:#264232;color:#a8e9bd}.fa-implemented:disabled{filter:grayscale(1);cursor:not-allowed!important}.fa-delete{background:#3b211e;color:#ffc0b5}.fa-message{width:min(100%,720px);color:var(--ps-text-cinematic-secondary);font-size:14px;line-height:1.7}.fa-message a{color:var(--ps-primary)}
      `}</style>
    </section>
  );
}
