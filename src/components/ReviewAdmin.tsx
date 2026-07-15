import { useEffect, useState } from 'react';
import { adminListReviews, adminSetReviewStatus } from '../lib/adminPw';
import type { ReviewPost, ReviewStatus } from '../lib/adminPw';

export default function ReviewAdmin() {
  const [items, setItems] = useState<ReviewPost[]>([]);
  const [status, setStatus] = useState('불러오는 중…');
  const password = typeof window !== 'undefined' ? sessionStorage.getItem('ps_admin_pw') : null;
  async function load() { if (!password) return; try { setItems(await adminListReviews(password)); setStatus(''); } catch (error) { setStatus(error instanceof Error ? error.message : '리뷰를 불러오지 못했습니다.'); } }
  useEffect(() => { load(); }, []);
  async function change(item: ReviewPost, next: ReviewStatus) { if (!password) return; try { await adminSetReviewStatus(password, item.id, next); await load(); } catch (error) { setStatus(error instanceof Error ? error.message : '상태를 바꾸지 못했습니다.'); } }
  return <div className="cs-data cs-review-manager"><div className="cs-data-top"><p><b>{items.length}</b>개 리뷰</p><button onClick={load}>새로고침</button></div>{status && <p className="cs-status">{status}</p>}<div className="cs-data-list">{items.map((item) => <article className="cs-data-row" key={item.id}><div className="cs-data-main"><small>{'★'.repeat(item.rating)} · {item.status}</small><p>{item.body}</p><span>{new Date(item.created_at).toLocaleString('ko-KR')}</span></div><div className="cs-row-actions"><button onClick={() => change(item, 'published')}>승인</button><button onClick={() => change(item, 'rejected')}>거절</button><button onClick={() => change(item, 'pending')}>보류</button></div></article>)}</div></div>;
}
