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

export interface CareerItem {
  id: string;
  section_id: string;
  year: string;
  role: string;
  org: string;
  sort: number;
}

export interface CareerSection {
  id: string;
  title: string;
  sort: number;
  items: CareerItem[];
}

export async function adminListCareerTimeline(): Promise<CareerSection[]> {
  return (await sbRpc<CareerSection[]>('list_career_timeline')) || [];
}
export async function adminSaveCareerSection(pw: string, row: Pick<CareerSection, 'id' | 'title' | 'sort'>) {
  await sbRpc('admin_save_career_section', { p_pw: pw, p_row: row });
}
export async function adminDeleteCareerSection(pw: string, id: string) { await sbRpc('admin_delete_career_section', { p_pw: pw, p_id: id }); }
export async function adminSaveCareerItem(pw: string, row: CareerItem) { await sbRpc('admin_save_career_item', { p_pw: pw, p_row: row }); }
export async function adminDeleteCareerItem(pw: string, id: string) { await sbRpc('admin_delete_career_item', { p_pw: pw, p_id: id }); }
export async function adminSaveSiteDesign(pw: string, key: string, value: Record<string, string>) {
  await sbRpc('admin_save_site_design', { p_pw: pw, p_key: key, p_value: value });
}
export async function adminDeleteSiteDesign(pw: string, key: string) { await sbRpc('admin_delete_site_design', { p_pw: pw, p_key: key }); }
export async function adminSaveSiteDesignMigrating(pw: string, key: string, legacyKey: string, value: Record<string, string>) {
  await sbRpc('admin_save_site_design_migrating', { p_pw: pw, p_key: key, p_legacy_key: legacyKey, p_value: value });
}
export async function adminDeleteSiteDesignKeys(pw: string, keys: string[]) {
  await sbRpc('admin_delete_site_design_keys', { p_pw: pw, p_keys: [...new Set(keys)] });
}

export type ComponentDesignValues = Record<string, string>;
export async function listComponentDesign(componentKey: string): Promise<ComponentDesignValues> {
  const rows = (await sbRpc<Array<{ property: string; value: string }>>('list_component_design', {
    p_component_key: componentKey,
  })) || [];
  return Object.fromEntries(rows.map(({ property, value }) => [property, value]));
}
export async function adminSaveComponentDesign(pw: string, componentKey: string, values: ComponentDesignValues) {
  await sbRpc('admin_save_component_design', { p_pw: pw, p_component_key: componentKey, p_values: values });
}
export async function adminDeleteComponentDesign(pw: string, componentKey: string) {
  await sbRpc('admin_delete_component_design', { p_pw: pw, p_component_key: componentKey });
}
export async function adminDeleteComponentDesignProperty(pw: string, componentKey: string, property: string) {
  await sbRpc('admin_delete_component_design_property', {
    p_pw: pw,
    p_component_key: componentKey,
    p_property: property,
  });
}
export async function adminApplyComponentDesign(
  pw: string,
  componentKey: string,
  resetProperties: string[],
  values: ComponentDesignValues,
) {
  await sbRpc('admin_apply_component_design', {
    p_pw: pw,
    p_component_key: componentKey,
    p_reset_properties: resetProperties,
    p_values: values,
  });
}

export type FeedbackStatus = 'pending' | 'published' | 'rejected';
export type ServiceKey = 'home' | 'spell-drill' | 'atlas-gears' | 'geoweb' | 'other' | 'unclassified';

export interface FeedbackPost {
  id: number;
  body: string;
  source_path: string;
  status: FeedbackStatus;
  created_at: string;
  reviewed_at: string | null;
  like_count: number;
  service_key: ServiceKey;
}

export async function adminListFeedback(pw: string): Promise<FeedbackPost[]> {
  return (await sbRpc<FeedbackPost[]>('admin_list_feedback', { p_pw: pw })) || [];
}

export async function adminSetFeedbackStatus(pw: string, id: number, status: Exclude<FeedbackStatus, 'pending'>) {
  await sbRpc('admin_set_feedback_status', { p_pw: pw, p_id: id, p_status: status });
}
export async function adminSetFeedbackService(pw: string, id: number, serviceKey: ServiceKey) {
  await sbRpc('admin_set_feedback_service', { p_pw: pw, p_id: id, p_service_key: serviceKey });
}
export async function adminDeleteFeedback(pw: string, id: number) {
  await sbRpc('admin_delete_feedback', { p_pw: pw, p_id: id });
}

export type ReviewStatus = 'pending' | 'published' | 'rejected';
export interface ReviewPost {
  id: number;
  rating: number;
  body: string;
  status: ReviewStatus;
  moderation_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  service_key: ServiceKey;
  like_count: number;
}
export async function adminListReviews(pw: string): Promise<ReviewPost[]> {
  return (await sbRpc<ReviewPost[]>('admin_list_reviews', { p_pw: pw })) || [];
}
export async function adminSetReviewStatus(pw: string, id: number, status: ReviewStatus) {
  await sbRpc('admin_set_review_status', { p_pw: pw, p_id: id, p_status: status });
}
export async function adminSetReviewService(pw: string, id: number, serviceKey: ServiceKey) {
  await sbRpc('admin_set_review_service', { p_pw: pw, p_id: id, p_service_key: serviceKey });
}
export async function adminDeleteReview(pw: string, id: number) {
  await sbRpc('admin_delete_review', { p_pw: pw, p_id: id });
}
