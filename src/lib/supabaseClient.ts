// parcyun studio · Supabase 인증 클라이언트 (admin 전용, 여러 island가 세션 공유)
// supabase-js는 localStorage의 동일 키(sb-<ref>-auth-token)를 써서 별도 번들끼리도 세션이 동기화된다.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export const ADMIN_EMAIL = 'pen.layered@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function isAdminEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}
