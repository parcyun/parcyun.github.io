import { useEffect, useState } from 'react';
import { getAdminPw } from './adminPw';

// 관리자 여부 = sessionStorage에 비밀번호 보유(로그인 시 저장됨).
// UI 게이트용 — 실제 저장/삭제는 서버 RPC가 비번을 재검증하므로 위조 pw로는 아무것도 못 씀.
export function useAdmin() {
  const [pw, setPw] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setPw(getAdminPw());
    sync();
    window.addEventListener('ps-admin-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ps-admin-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return { isAdmin: !!pw, pw };
}
