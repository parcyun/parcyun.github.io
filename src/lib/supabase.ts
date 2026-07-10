// parcyun studio · Supabase REST 클라이언트 (islands 공용)
// 의존성 없이 PostgREST/RPC 를 직접 호출. anon publishable 키는 공개돼도 안전(RLS 로 보호).
// 읽기는 anon 키로만. 쓰기는 전부 admin_* RPC(비밀번호 검증, SECURITY DEFINER)로 처리하므로
// 여기엔 select + rpc만 있으면 된다. (구 sbInsert/sbUpdate/sbDelete는 RPC 전환으로 제거됨)
export const SUPABASE_URL = 'https://myeouecgpjxcddemexcg.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';

const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/** PostgREST select. query 예: '?select=*&order=sort.asc&published=eq.true' */
export async function sbSelect<T = any>(table: string, query = ''): Promise<T[]> {
  const res = await fetch(`${REST}/${table}${query}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`select ${table} → ${res.status}`);
  return res.json();
}

/** RPC 호출 (admin_* / bump_* 등). 204 면 null. 에러는 PostgREST message를 그대로 표시. */
export async function sbRpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`${REST}/rpc/${fn}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(args || {}),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { const j = JSON.parse(text); msg = j.message || j.hint || text; } catch {}
    throw new Error(msg || `rpc ${fn} → ${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}
