# parcyun studio · 코드 감사 & 최적화 보고서

**작성:** 2026-07-10 (자동 감사 세션) · **대상:** `parcyun-astro-pages` (라이브 = `main`)
**방법:** 다중 에이전트 리뷰(8개 차원 × 적대적 검증) → 검증된 47건 + 완성도 비평 14건 → 안전한 것만 자동 적용, 나머지 문서화.

> 이 문서는 **사람 판단이 필요하거나(프라이버시·제품 결정), 라이브에 위험하거나, 스코프 밖**이라 자동 적용하지 않은 항목의 목록입니다. 이미 적용·배포된 변경은 맨 아래 "적용 완료" 참고.

---

## 🔴 지금 바로 판단이 필요한 것 (프라이버시)

### 1. `mongdang-production-schedule.html` — 실명 공개 노출 (우선순위 최상)
- **문제:** `https://parcyun.github.io/mongdang-production-schedule.html` 가 **인증 없이** 공개돼 있고, 내부 8.1 상영회 제작 일정에 **실명 다수 + 역할 배정 + 마감일**이 그대로 노출됩니다(이선학·김희경·유지연·박주현·나효정·박창현·주민환·안요한·정두린).
- **경로:** 모든 페이지 하단 푸터 → "업무 대시보드"(`dashboard.html`) → 이 파일로 링크됨. 즉 사이트 방문자 누구나 2클릭.
- **조치(택1):**
  - (A) 공개 의도가 아니면 → 파일 삭제 또는 비공개 저장소로 이동. **단, 링크를 공유받은 사람이 있으면 먼저 조율.**
  - (B) 공유가 필요하면 → 실명을 역할 라벨로 치환 + `<meta name="robots" content="noindex,nofollow">` 추가(검색 색인만 차단, 링크는 유지).
  - (C) 진짜 접근 제어가 필요하면 → 정적 Pages가 아닌 인증 가능한 호스팅으로 이동.
- 이번 세션에서 `robots.txt`에 `Disallow`는 걸어뒀지만, **robots는 검색 색인만 막을 뿐 URL을 아는 사람의 접근은 못 막습니다.** 파일 자체 조치 필요.

### 2. `dashboard.html` — 내부 업무 대시보드 공개
- **문제:** "업무 대시보드"가 인증 없이 공개(TF 명칭·마일스톤 날짜·**내부 Notion 링크** 포함). 하드 PII는 없지만 의도적으로 공개된 스튜디오 대시보드 성격.
- **참고:** 제가 만든 공용 푸터(`PsFooter`)가 이 링크를 **전 페이지 하단에 노출**합니다. 내부용이면 푸터에서 링크를 빼는 걸 권장.
- **조치:** 공개 유지 시 최소 조치로 `<head>`에 `<meta name="robots" content="noindex,nofollow">` 추가(추가만 하면 됨, 링크 보존). 비공개면 푸터 링크 제거 + 파일 이동.

---

## 🟡 권장 개선 (사람 결정 필요 / 리팩터링)

### 3. 소셜 공유 카드(og:image) 전 페이지 부재
- 어떤 페이지에도 `og:image`가 없어 카카오/슬랙/X 공유 시 이미지 없는 밋밋한 카드가 뜹니다. (world-map은 이번에 `twitter:card`를 `summary`로 고쳐 빈 큰 카드는 방지함.)
- **조치:** 1200×630 공유 카드 이미지를 `public/images/`에 추가 → `CinematicLayout` Props에 `ogImage` 추가해 `og:image`/`twitter:image` 방출. 이미지 에셋 제작이 필요해 자동화하지 않음.

### 4. CSS 중복 — 3개 페이지를 `CinematicLayout`으로 이관
- `academica`/`atlas-gears`/`works`가 각자 `:root --ps-*` 토큰·리셋·`.wrap`·`section`·`.section-header`·엔트리 애니메이션·폰트 `<link>`를 **그대로 복붙**하고 있습니다(현재 `CinematicLayout`은 메인만 사용). 이미 미세하게 diverge 중(works hero `min-height:92vh` vs index `100vh`).
- **조치(중간 규모 리팩터링):** 3개 페이지를 `CinematicLayout` 슬롯 안으로 이관하고 중복 CSS 삭제, `.ps-topnav`/`.ps-back`·모달 `rem-*` CSS를 단일 소스로 추출. 레이아웃 변동 위험이 있어(라이브) 야간 자동 적용은 보류. 별도 세션에서 페이지별 시각 검증하며 진행 권장.

### 5. world-map: 공용 푸터(브랜드 서명) 누락
- `world-map.astro`는 `<PsFooter>`(Designed by parcyun studio·커피·인스타·관리자)를 렌더하지 않고 자체 셸에 GlobeLab만 넣습니다. 브랜드 규정상 서명이 있어야 하지만, 전체화면 WebGL 지구본 위에 고정 요소를 얹으면 **globe 터치/드래그를 가릴 위험**이 있어 자동 적용 보류.
- **조치:** `<PsFooter />`를 넣되 `z-index`와 pointer 영역을 globe 캔버스와 조율(브랜드 pill이 지구본 조작을 막지 않도록). GlobeLab은 다른 세션 소유라 함께 확인 필요.

### 6. world-map: 핀치 줌 차단 (a11y ↔ 지도 UX 상충)
- `world-map.astro`의 뷰포트에 `maximum-scale=1`이 있어 브라우저 핀치 줌을 막습니다(WCAG 1.4.4 위반). **다만** 전체화면 지도는 핀치가 페이지가 아니라 지구본을 확대해야 정상이라 의도적 설정일 수 있습니다.
- **조치:** 저시력 접근성 vs 지도 조작 UX 중 택. GlobeLab이 자체 핀치 줌을 처리한다면 제거 고려, 아니면 유지. 판단 필요라 미변경.

---

## 🟢 잠재적 버그·개선 (낮은 우선순위, 대부분 관리자 전용)

| # | 위치 | 문제 | 조치 |
|---|---|---|---|
| 7 | `src/lib/supabase.ts` `sbDelete`/`sbUpdate` | RLS로 0행 처리돼도 성공으로 간주 → 관리자 JWT 이메일 불일치 시 "삭제됨" 후 새로고침하면 부활(진단 없음) | `Prefer: count=exact`로 0행이면 throw(단, 3개 호출자 계약이 `Promise<void>`→변경 필요) |
| 8 | `ActivityBrowser.tsx` | `ACTIVITY_TYPES`(게임/인터랙티브/활동지/커리큘럼)에 없는 타입의 자료를 Supabase 대시보드에서 직접 넣으면 **조용히 사라짐** + 카운트 제외 | 미지의 타입용 catch-all 섹션 렌더 또는 데이터의 distinct 타입으로 섹션 유도 |
| 9 | `WorksFilter.tsx` `nextNum` | DB 읽기 실패로 정적 폴백(max '003') 중 Work 추가 시 기존 DB num과 PK 충돌 → 409 "저장 실패" | `useWorks().source==='db'`일 때만 추가 허용(정적/에러 구분) |
| 10 | `ResourceEditModal.tsx` `poster_title` | 자료 이름 변경 시 `poster_title = 기존값 \|\| title`이라 이미 있던 포스터 헤드라인이 옛 제목에 고정돼 목록 제목과 어긋남. 폼에 poster_title 입력 없음 | poster_title 입력 필드 노출 or 의도적 결합 문서화(무조건 결합하면 손수 만든 `<br>/<strong>` 포스터 파괴 주의) |
| 11 | `resources` `published=false` 가시성 | 읽기는 항상 published만 요청, 폼에 `published` 없음 → `published=false`로 만든 행은 사이트·관리자 UI 어디에도 안 보임(고아) | 관리자 읽기 정책 추가 or 폼에 published 체크박스 + 관리자 읽기에 accessToken 전달 |
| 12 | 관리자 CRUD 버튼 터치 타깃 | 수정/삭제 버튼 22~24px(가이드 44px 미만), 좁은 화면서 제목과 겹칠 수 있음(관리자 전용, 삭제는 confirm 버퍼) | 모바일 미디어쿼리로 32~36px 확대 + 컨테이너 패딩 확보(절대배치 컨트롤 위치 시각 검증 필요) |
| 13 | `supabaseClient.ts` 정적 import | 읽기 아일랜드들이 관리자 감지용으로 `@supabase/supabase-js` 전체(≈수백KB)를 비관리자 방문자도 다운로드 | SDK 동적 import 또는 localStorage `sb-<ref>-auth-token` 선검사 후 로드(인증 흐름 회귀 테스트 필요) |
| 14 | `AdminAuth.tsx` 매직링크 | 항상 `ADMIN_EMAIL`로만 발송돼 열거/제3자 스팸은 없음. 다만 주소를 아는 이가 폼 반복 시 관리자 본인 메일함에 자가 스팸 가능 | 30~60초 재전송 쿨다운 + Supabase Auth 이메일 rate-limit 확인(선택) |

---

## 🔵 이번 세션에 적용·배포 완료 (참고)

1. **죽은 코드 제거** — 미사용 컴포넌트 5개(`ResourceExplorer`/`ActivityExplorer`/`ResourceCard`/`ActivityCard`/`test-push.txt`) + index/서브페이지의 고아 CSS(약 8KB, `.lecture-*`/`.arcade-cta`/`.ps-corner`/`.float-nav`).
2. **성능·복원력** — 관리자 아일랜드 `client:idle`; 서가 SSR 즉시 렌더; world-map 폰트 경량화(dynamic-subset); JS-off/`IntersectionObserver` 미지원 시 콘텐츠 강제 노출(`<noscript>` + 가드).
3. **접근성** — 필터 `role=tablist→group`; 관리자 모달 `dialog`/ESC/포커스; 모달 remount `key`; AdminAuth 팝오버 ESC.
4. **SEO** — `robots.txt`·`sitemap.xml`·`404` 페이지·`canonical`·홈 `JSON-LD`; world-map `twitter:card=summary`.
5. **보안** — 관리자 `title_html` 렌더에 화이트리스트 새니타이저(저장형 XSS 방어, `<br>/<strong>` 등만 허용).
6. **반응형 4단계 표준화** — `480 / 768 / 1024 / 1280`. 제각각이던 639/640/720/430/520 통일. 전 페이지 가로 오버플로 0px, 그리드 flip 768/1024 일관, 모바일 플로팅 클러스터 겹침 0 (검증: iframe 4폭 측정).

### 반응형 브레이크포인트 기준 (앞으로 이 4개만 사용)
| 단계 | 폭 | 의미 |
|---|---|---|
| MOBILE | `≤480px` | 하단 플로팅 클러스터(공유/방문자/브랜드) 일괄 reflow. 초협소 430은 공유 버튼 원형 축소 tier(라벨 유지 목적). |
| TABLET | `768px` | 카드 그리드 1→2열, 섹션 헤더 열→행 전환의 단일 경계. |
| DESKTOP | `1024px` | 카드 밀도 2→3열(works 적용). atlas 활동 그리드는 현재 2열 유지(3열 추가는 선택 — 아래 참고). |
| WIDE | `1280px` | 예약(컨테이너 max 1108px라 현재 콘텐츠엔 무효). |

### 검증 못한 것 — 실브라우저에서 확인 요망
- **관리자 로그인 전체 흐름**(매직링크 수신→로그인→CRUD): 자동 세션에서 실메일 발송을 트리거하지 않아 미검증. 로그인 후 자료/Works **추가·수정·삭제 및 모달 ESC·포커스** 동작 확인 권장.
- **`client:visible` 최적화 보류:** 데이터 아일랜드 3종을 `client:load`→`client:visible`로 낮추면 초기 부하가 줄지만, 헤드리스 프리뷰에선 하이드레이션 검증이 불가해(실브라우저는 정상 예상) **라이브 안전을 위해 `client:load` 유지**함. 실브라우저에서 스크롤 시 검색/필터/관리자 정상 확인되면 전환 가능.
- **atlas 활동 그리드 1024 3열화(선택):** works와 밀도 통일하려면 `.act-grid`에 `@media(min-width:1024px){grid-template-columns:repeat(3,1fr)}` 추가 가능. 3열 시 카드(썸네일+제목+설명+태그) 폭 여유는 있으나 시각 판단 필요라 미적용.

### 참고: 오탐 1건 (조치 불필요)
- 자동 감사가 "방문자 카운터가 브랜드 pill의 left를 써서 우하단으로 밀려 겹친다"고 지적했으나, 이는 **사용자가 명시적으로 요청한 정렬**("방문자 카운터를 우측 플로팅 푸터 좌측 정렬에 맞춰")이며 실측 겹침 0을 확인함. 의도된 레이아웃이라 유지.
