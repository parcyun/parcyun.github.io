# 경량화·정리 보고 (2026-07-10)

## ✅ 이번에 정리·삭제한 것 (안전, 배포)
- `src/styles/base.css` 삭제 — 어디서도 import 안 됨(중단된 CSS 통합 작업 잔재).
- `src/lib/supabase.ts` 슬림화 — `sbInsert`/`sbUpdate`/`sbDelete` 3개 함수 + `accessToken`
  배선 제거. 쓰기는 전부 `admin_*` RPC(비번 검증)로 넘어가 이 헬퍼들이 완전 미사용이었음.
  남은 건 `sbSelect`(읽기) + `sbRpc`(RPC)뿐.
- 로컬 빌드 캐시 `dist/`·`.astro/` 삭제(재생성됨, git 미추적).

**결과:** 컴포넌트는 전부 사용 중(미사용 0), lib 미사용 export 0. src 트리 클린.

---

## ⚠ 삭제할지 결정 필요 (의도적 산출물이라 임의 삭제 안 함)

| 대상 | 현황 | 삭제 시 | 권장 |
|---|---|---|---|
| `public/design-library/` (16개 HTML) | 라이브 어디에도 **링크 안 됨**. 단, parcyun-studio **스킬의 컴포넌트 미러**(메모리상 "design-library와 동기화 유지"). | 공개 미러 사라짐. 스킬 원본(`~/Library/.../skills/parcyun-studio`)은 유지 → 실질 손실 적음. | 공개 참조 필요없으면 **삭제 OK**. 유지 정책이면 보존. |
| `supabase/migrations/0002·0004·0005` | `0006`이 전부 대체(0004는 KOCOMATE를 옛 카테고리로 넣는 **footgun** — 0006 이후 재실행 금지). | 신규 셋업은 `0001`+`0006`만으로 완결. | **삭제 권장**(0001 기본스키마 + 0006 현행만 유지). 이미 실행한 DB엔 영향 없음. |
| `public/arcade/index.html` | 옛 `/arcade/` → `/atlas-gears/` 리다이렉트 스텁(QR·북마크 보존용). | 옛 arcade 링크 죽음. | QR 배포 이력 없으면 삭제, 있으면 보존. |
| `public/world-map/`(=Astro `/world-map/`) | 사용자: "world-map 더 안 씀, WebGL Globelab으로 전환, **원본 참고용 데이터로 보관**". 현재 자료실(atlas-gears)의 "세계 지도" 카드가 아직 `/world-map/`로 링크. | 참고 데이터 소실 + 자료실 링크 404. | **보존**. 단 자료실 카드를 새 WebGL 페이지로 교체할지 결정 필요(어느 URL?). |

## 🟢 남은 라이브 콘텐츠(삭제 금지 — 실제 자료)
`academica-parcyun-studio`·`llm-fundamentals`·`math-solid-volume`·`korean-spell-drill-parcyun`·`studio`·`works/002-i-am-serif` = 자료실에서 링크되는 실제 강의/게임/작업물. `dashboard.html`·`mongdang-production-schedule.html` = 관리자 비번 게이트됨.

---

## 🔴 진짜 속도·토큰 절감 레버 (레포가 아니라 대화)
현재 느림·토큰 소모의 **주원인은 이 대화 세션이 길어진 것**(context bloat)입니다. 레포 정리는 파일 읽기를 조금 줄일 뿐입니다. 근본 해결:
- **`/compact`** — 대화를 요약 압축해 컨텍스트 확보(속도·토큰 즉효). 이 정리 커밋 후 바로 권장.
- **`/clear`** — 완전 초기화(새 세션). 프로젝트 맥락은 `MEMORY.md`로 유지되니 안전.
- 두 worktree(`parcyun-astro-pages`·`parcyun.github.io`)의 `node_modules`가 각 202MB(합 400MB)로 디스크 대부분 — 빌드에 필요해 삭제 불가. 디스크만 급하면 한쪽 worktree에서 `node_modules` 지웠다가 필요할 때 `npm i` 가능.
