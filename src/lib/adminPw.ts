// 이메일 없는 비밀번호-시크릿 관리자 모델 (클라이언트).
// 비밀번호는 sessionStorage에만 보관(탭 닫으면 사라짐). 실제 검증·쓰기는 서버 RPC(SECURITY DEFINER).
import { sbRpc } from './supabase';

const KEY = 'ps_admin_pw';

export function getAdminPw(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}
export function setAdminPw(pw: string) {
  try { sessionStorage.setItem(KEY, pw); window.dispatchEvent(new Event('ps-admin-change')); } catch {}
}
export function clearAdminPw() {
  try { sessionStorage.removeItem(KEY); window.dispatchEvent(new Event('ps-admin-change')); } catch {}
}

export async function checkPassword(pw: string): Promise<boolean> {
  try { return (await sbRpc<boolean>('admin_check', { p_pw: pw })) === true; } catch { return false; }
}

export async function adminSaveResource(pw: string, row: unknown) { await sbRpc('admin_save_resource', { p_pw: pw, p_row: row }); }
export async function adminDeleteResource(pw: string, id: string) { await sbRpc('admin_delete_resource', { p_pw: pw, p_id: id }); }
export async function adminSaveWork(pw: string, row: unknown) { await sbRpc('admin_save_work', { p_pw: pw, p_row: row }); }
export async function adminDeleteWork(pw: string, num: string) { await sbRpc('admin_delete_work', { p_pw: pw, p_num: num }); }

export type FeedbackStatus = 'pending' | 'published' | 'rejected';

export interface FeedbackPost {
  id: number;
  body: string;
  source_path: string;
  status: FeedbackStatus;
  created_at: string;
  reviewed_at: string | null;
  like_count: number;
}

export async function adminListFeedback(pw: string): Promise<FeedbackPost[]> {
  return (await sbRpc<FeedbackPost[]>('admin_list_feedback', { p_pw: pw })) || [];
}

export async function adminSetFeedbackStatus(pw: string, id: number, status: Exclude<FeedbackStatus, 'pending'>) {
  await sbRpc('admin_set_feedback_status', { p_pw: pw, p_id: id, p_status: status });
}
