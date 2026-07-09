// parcyun studio · Supabase REST 클라이언트 (islands 공용)
// 의존성 없이 PostgREST/RPC 를 직접 호출. anon publishable 키는 공개돼도 안전(RLS 로 보호).
// 관리자 쓰기(insert/update/delete)는 accessToken(로그인 세션 JWT)을 넘기면 Authorization 헤더로 실려
// RLS의 auth.jwt()->>'email' 검사를 통과한다. 토큰 없으면 anon 키로만 동작(읽기 전용).
export const SUPABASE_URL = 'https://myeouecgpjxcddemexcg.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_qHxQM-Z6vVAk9YKMluyFSw_0_fo9sKY';

const REST = `${SUPABASE_URL}/rest/v1`;

function headers(accessToken?: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** PostgREST select. query 예: '?select=*&order=sort.asc&published=eq.true' */
export async function sbSelect<T = any>(table: string, query = ''): Promise<T[]> {
  const res = await fetch(`${REST}/${table}${query}`, { headers: headers() });
  if (!res.ok) throw new Error(`select ${table} → ${res.status}`);
  return res.json();
}

/** 단일 행/여러 행 insert. 반환 표현 포함. accessToken 있으면 관리자 권한으로 기록. */
export async function sbInsert<T = any>(table: string, row: unknown, accessToken?: string): Promise<T[]> {
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: headers(accessToken, { Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ${table} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** PK 조건으로 update. query 예: "?id=eq.spell-drill" */
export async function sbUpdate<T = any>(table: string, query: string, patch: unknown, accessToken?: string): Promise<T[]> {
  const res = await fetch(`${REST}/${table}${query}`, {
    method: 'PATCH',
    headers: headers(accessToken, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update ${table} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** PK 조건으로 delete. query 예: "?id=eq.spell-drill" */
export async function sbDelete(table: string, query: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${REST}/${table}${query}`, {
    method: 'DELETE',
    headers: headers(accessToken),
  });
  if (!res.ok) throw new Error(`delete ${table} → ${res.status} ${await res.text()}`);
}

/** RPC 호출 (예: bump_resource). 204 면 null. */
export async function sbRpc<T = any>(fn: string, args?: Record<string, unknown>, accessToken?: string): Promise<T | null> {
  const res = await fetch(`${REST}/rpc/${fn}`, {
    method: 'POST',
    headers: headers(accessToken),
    body: JSON.stringify(args || {}),
  });
  if (!res.ok) throw new Error(`rpc ${fn} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}
