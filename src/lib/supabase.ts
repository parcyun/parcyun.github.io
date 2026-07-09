// parcyun studio · Supabase REST 클라이언트 (islands 공용)
// 의존성 없이 PostgREST/RPC 를 직접 호출. anon publishable 키는 공개돼도 안전(RLS 로 보호).
export const SUPABASE_URL = 'https://myeouecgpjxcddemexcg.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';

const REST = `${SUPABASE_URL}/rest/v1`;
const baseHeaders: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/** PostgREST select. query 예: '?select=*&order=sort.asc&published=eq.true' */
export async function sbSelect<T = any>(table: string, query = ''): Promise<T[]> {
  const res = await fetch(`${REST}/${table}${query}`, { headers: baseHeaders });
  if (!res.ok) throw new Error(`select ${table} → ${res.status}`);
  return res.json();
}

/** 단일 행/여러 행 insert. 반환 표현 포함. */
export async function sbInsert<T = any>(table: string, row: unknown): Promise<T[]> {
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: { ...baseHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ${table} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** RPC 호출 (예: bump_resource). 204 면 null. */
export async function sbRpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`${REST}/rpc/${fn}`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(args || {}),
  });
  if (!res.ok) throw new Error(`rpc ${fn} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}
