import { useEffect, useState } from 'react';
import { adminDeleteReview, adminListReviews, adminSetReviewService, adminSetReviewStatus, getAdminPw } from '../lib/adminPw';
import type { ReviewPost, ReviewStatus, ServiceKey } from '../lib/adminPw';

const serviceLabels: Record<ServiceKey, string> = {
  home: '홈', 'spell-drill': 'Spell Drill', 'atlas-gears': 'ATLAS GEARS', geoweb: 'GeoWeb', works: 'Works', other: '기타', unclassified: '미분류',
};

export default function ReviewAdmin() {
  const [items, setItems] = useState<ReviewPost[]>([]);
  const [status, setStatus] = useState('불러오는 중…');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const password = typeof window !== 'undefined' ? getAdminPw() : null;
  async function load() { if (!password) return; try { setItems(await adminListReviews(password)); setStatus(''); } catch (error) { setStatus(error instanceof Error ? error.message : '리뷰를 불러오지 못했습니다.'); } }
  useEffect(() => { load(); }, []);
  async function review(item: ReviewPost, next: ReviewStatus) { if (!password) return; setBusyId(item.id); try { await adminSetReviewStatus(password, item.id, next); await load(); } catch (error) { setStatus(error instanceof Error ? error.message : '상태를 바꾸지 못했습니다.'); } finally { setBusyId(null); } }
  async function updateService(item: ReviewPost, serviceKey: ServiceKey) { if (!password) return; setBusyId(item.id); try { await adminSetReviewService(password, item.id, serviceKey); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, service_key: serviceKey } : entry)); setEditingServiceId(null); } catch (error) { setStatus(error instanceof Error ? error.message : '태그를 바꾸지 못했습니다.'); } finally { setBusyId(null); } }
  async function remove(item: ReviewPost) { if (!password || !window.confirm('이 리뷰를 영구 삭제할까요?')) return; setBusyId(item.id); try { await adminDeleteReview(password, item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); } catch (error) { setStatus(error instanceof Error ? error.message : '리뷰를 삭제하지 못했습니다.'); } finally { setBusyId(null); } }
  return <div className="cs-data cs-review-manager"><div className="cs-data-top"><p><b>{items.length}</b>개 리뷰</p><button onClick={load}>새로고침</button></div>{status && <p className="cs-status">{status}</p>}<div className="cs-data-list">{items.map((item) => <article className="cs-data-row" key={item.id}><div className="cs-data-main"><small>{'★'.repeat(item.rating)} · <span className={`service-tag service-${item.service_key}`}>{serviceLabels[item.service_key]}</span> · <span className={`review-status is-${item.status}`}>{item.status}</span></small><p>{item.body}</p><span>공감 {item.like_count} · {new Date(item.created_at).toLocaleString('ko-KR')}</span></div><div className="cs-row-actions">{editingServiceId === item.id ? <select aria-label="서비스 태그" value={item.service_key} disabled={busyId === item.id} onChange={(event) => updateService(item, event.target.value as ServiceKey)}>{Object.entries(serviceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <button onClick={() => setEditingServiceId(item.id)}>태그 수정</button>}<button className="approve-review" disabled={busyId === item.id || item.status === 'published'} onClick={() => review(item, 'published')}>승인</button>{item.status === 'pending' && <button disabled={busyId === item.id} onClick={() => review(item, 'rejected')}>거절</button>}{item.status !== 'pending' && <button disabled={busyId === item.id} onClick={() => review(item, 'pending')}>보류</button>}<button className="danger" disabled={busyId === item.id} onClick={() => remove(item)}>삭제</button></div></article>)}</div></div>;
}
