# Service-Scoped Feedback and Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 리뷰와 기능 개선 요청을 서비스별로 격리하고, 리뷰 공감·정렬·관리자 태그/삭제·목록 스크롤 힌트를 추가하며 Design Studio 문구의 배포 안전성을 회귀 검증한다.

**Architecture:** Supabase가 `service_key`를 검증·저장하고 공개 RPC 단계에서 서비스별로 필터링한다. 공용 푸터는 현재 서비스 키를 리뷰 페이지에 전달하며, 리뷰와 기능 개선 클라이언트는 전체 데이터를 받지 않는다. 관리자 RPC만 태그 변경과 영구 삭제를 수행한다.

**Tech Stack:** Astro, React, vanilla JavaScript, Node test runner, Supabase Postgres/PostgREST

## Global Constraints

- 서비스 키는 `home`, `spell-drill`, `atlas-gears`, `geoweb`, `other`, `unclassified`만 허용한다.
- 출처 없는 기존 리뷰는 `unclassified`로 유지하고 공개 목록에서 제외한다.
- 공개 목록 정렬은 `like_count DESC, created_at DESC`이다.
- 개인정보, IP, 로그인 정보는 저장하지 않는다.
- 공개 목록의 스크롤바는 숨기고 9개 이상일 때 하단 페이드를 표시한다.
- DB 문구는 정적 기본값보다 우선하며 명시적 초기화 외에는 삭제하지 않는다.
- 기존 사용자 변경 `public/reviews.js`와 `docs/USABILITY_REVIEW_2026-07-15.md`를 덮어쓰지 않는다.

---

### Task 1: Supabase 서비스 분리·리뷰 공감·관리자 변경 API

**Files:**
- Create: `supabase/migrations/*_service_scoped_feedback_reviews.sql` using the Supabase CLI in Step 1
- Test: `test/service-scoped-feedback-reviews.test.mjs`

**Interfaces:**
- Produces: `submit_review(integer,text,text,text)`, `list_reviews(text)`, `toggle_review_like(bigint,text)`, `submit_feedback(text,text,text,text)`, `list_feedback(text)`, `admin_set_review_service(text,bigint,text)`, `admin_set_feedback_service(text,bigint,text)`, `admin_delete_review(text,bigint)`, `admin_delete_feedback(text,bigint)`
- Produces: 관리자 목록 결과의 `service_key`, `like_count`

- [ ] **Step 1: 새 마이그레이션 파일 생성**

Run: `supabase migration new service_scoped_feedback_reviews`

Expected: `supabase/migrations/*_service_scoped_feedback_reviews.sql` 한 개 생성.

- [ ] **Step 2: 실패 테스트 작성**

```js
test('service-scoped RPCs filter server-side and review likes sort first', async () => {
  const sql = await readMigration('service_scoped_feedback_reviews');
  assert.match(sql, /add column if not exists service_key text/i);
  assert.match(sql, /create table[^;]*review_votes/i);
  assert.match(sql, /where r\\.status = 'published'\\s+and r\\.service_key = p_service_key/i);
  assert.match(sql, /order by count\\(v\\.review_id\\) desc, r\\.created_at desc/i);
  assert.match(sql, /admin_set_review_service/i);
  assert.match(sql, /admin_set_feedback_service/i);
  assert.match(sql, /admin_delete_review/i);
  assert.match(sql, /admin_delete_feedback/i);
});
```

- [ ] **Step 3: 테스트가 기능 부재로 실패하는지 확인**

Run: `node --test test/service-scoped-feedback-reviews.test.mjs`

Expected: 새 RPC와 컬럼 패턴이 없어 FAIL.

- [ ] **Step 4: 최소 스키마·RPC 구현**

```sql
alter table public.reviews add column if not exists service_key text not null default 'unclassified';
alter table public.feedback_posts add column if not exists service_key text not null default 'unclassified';
create table if not exists public.review_votes (
  review_id bigint not null references public.reviews(id) on delete cascade,
  voter_id text not null check (char_length(voter_id) between 16 and 128),
  created_at timestamptz not null default now(),
  primary key (review_id, voter_id)
);
alter table public.review_votes enable row level security;
revoke all on table public.review_votes from anon, authenticated;
```

각 공개 RPC는 허용 키를 서버에서 검사하고 `status = 'published' and service_key = p_service_key`를 적용한다. 새 함수는 `security definer set search_path = public`을 사용하고 `PUBLIC` 실행 권한을 철회한 뒤 `anon, authenticated`에 필요한 함수만 명시적으로 부여한다. 기존 인자 개수의 RPC는 삭제해 우회 조회를 막는다.

- [ ] **Step 5: 마이그레이션 정적 테스트 통과 확인**

Run: `node --test test/service-scoped-feedback-reviews.test.mjs`

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations test/service-scoped-feedback-reviews.test.mjs
git commit -m "feat: scope feedback and reviews by service"
```

---

### Task 2: 공용 푸터·공개 리뷰·기능 개선 UI 연결

**Files:**
- Modify: `public/ps-footer.js`
- Modify: `public/feedback-board.js`
- Modify: `public/reviews.js`
- Modify: `src/pages/reviews.astro`
- Test: `test/service-scoped-feedback-reviews.test.mjs`
- Test: `test/component-design-reviews.test.mjs`

**Interfaces:**
- Consumes: Task 1의 서비스별 공개·제출·공감 RPC
- Produces: URL 쿼리 `service`, 브라우저별 리뷰 공감 ID, 10개 높이 스크롤 목록

- [ ] **Step 1: 실패 테스트 추가**

```js
assert.match(footer, /service=\\$\\{encodeURIComponent/);
assert.match(feedback, /list_feedback[^]*p_service_key/);
assert.match(reviews, /toggle_review_like/);
assert.match(reviews, /p_service_key/);
assert.match(page, /scrollbar-width:none/);
assert.match(page, /review-list-wrap\\.has-overflow::after/);
assert.match(reviews, /scrollHeight[^]*clientHeight/);
```

- [ ] **Step 2: 대상 테스트 실패 확인**

Run: `node --test test/service-scoped-feedback-reviews.test.mjs test/component-design-reviews.test.mjs`

Expected: 서비스 전달, 리뷰 공감, 스크롤 페이드 패턴이 없어 FAIL.

- [ ] **Step 3: 서비스 키 전달과 RPC 인자 구현**

```js
var SERVICE_KEYS = {
  home: 'home',
  atlas: 'atlas-gears',
  geoweb: 'geoweb',
  spell: 'spell-drill'
};
var reviewHref = '/reviews/?service=' + encodeURIComponent(SERVICE_KEYS[context] || 'other');
```

`feedback-board.js`는 푸터가 전달한 서비스 키로 제출·목록 조회하고, `reviews.js`는 URL의 허용된 서비스 키만 사용한다. 리뷰 전용 로컬 voter ID를 생성해 공감 토글에 전달하고 응답의 `liked`, `like_count`를 즉시 반영한 뒤 목록을 재정렬한다.

- [ ] **Step 4: 10개 높이와 페이드 구현**

```css
.review-list{max-height:var(--review-list-max-height);overflow-y:auto;scrollbar-width:none}
.review-list::-webkit-scrollbar{display:none}
.review-list-wrap.has-overflow{position:relative}
.review-list-wrap.has-overflow:not(.is-at-end)::after{
  content:"";position:absolute;left:0;right:0;bottom:0;height:96px;
  pointer-events:none;background:linear-gradient(transparent,var(--ps-bg,#0f0e0d))
}
```

렌더 후 첫 10개 카드의 실제 높이로 `--review-list-max-height`를 계산한다. 카드가 9개 이상이고 스크롤 여유가 있으면 `has-overflow`, 끝까지 스크롤하면 `is-at-end`를 토글한다.

- [ ] **Step 5: 대상 테스트 통과 확인**

Run: `node --test test/service-scoped-feedback-reviews.test.mjs test/component-design-reviews.test.mjs`

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add public/ps-footer.js public/feedback-board.js public/reviews.js src/pages/reviews.astro test
git commit -m "feat: add service-scoped public review experiences"
```

---

### Task 3: 관리자 태그·삭제·승인 상태 UI

**Files:**
- Modify: `src/lib/adminPw.ts`
- Modify: `src/components/ReviewAdmin.tsx`
- Modify: `src/components/FeedbackAdmin.tsx`
- Modify: `src/pages/admin/components.astro`
- Test: `test/service-scoped-feedback-reviews.test.mjs`

**Interfaces:**
- Consumes: Task 1의 관리자 태그·삭제 RPC
- Produces: `adminSetReviewService`, `adminSetFeedbackService`, `adminDeleteReview`, `adminDeleteFeedback`

- [ ] **Step 1: 실패 테스트 추가**

```js
assert.match(reviewAdmin, /태그 수정/);
assert.match(feedbackAdmin, /태그 수정/);
assert.match(reviewAdmin, /adminDeleteReview/);
assert.match(feedbackAdmin, /adminDeleteFeedback/);
assert.match(reviewAdmin, /item\\.status === 'pending'/);
assert.match(reviewAdmin, /published/);
assert.match(adminCss, /is-published[^}]*var\\(--a\\)/);
```

- [ ] **Step 2: 대상 테스트 실패 확인**

Run: `node --test test/service-scoped-feedback-reviews.test.mjs`

Expected: 관리자 태그·삭제 API와 UI가 없어 FAIL.

- [ ] **Step 3: 관리자 타입과 호출 함수 구현**

```ts
export type ServiceKey = 'home' | 'spell-drill' | 'atlas-gears' | 'geoweb' | 'other' | 'unclassified';
export async function adminSetReviewService(pw: string, id: number, serviceKey: ServiceKey) {
  await sbRpc('admin_set_review_service', { p_pw: pw, p_id: id, p_service_key: serviceKey });
}
export async function adminDeleteReview(pw: string, id: number) {
  await sbRpc('admin_delete_review', { p_pw: pw, p_id: id });
}
```

기능 개선 요청에도 동일한 `SetService`, `Delete` 래퍼를 추가한다.

- [ ] **Step 4: 카드 UI 구현**

각 카드에서 현재 태그를 배지로 표시하고 `태그 수정` 버튼으로 `<select>`를 열어 즉시 저장한다. 삭제는 `window.confirm` 후 실행한다. `pending`일 때만 승인 버튼을 렌더하고, `published`이면 버튼 영역에 `<span className="is-published">published</span>`를 표시한다.

- [ ] **Step 5: 대상 테스트와 타입 빌드 확인**

Run: `node --test test/service-scoped-feedback-reviews.test.mjs && npm run build`

Expected: 테스트 PASS, Astro build exit 0.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/adminPw.ts src/components/ReviewAdmin.tsx src/components/FeedbackAdmin.tsx src/pages/admin/components.astro test/service-scoped-feedback-reviews.test.mjs
git commit -m "feat: manage review and feedback tags"
```

---

### Task 4: Design Studio 문구 배포 안전성 회귀 검증과 전체 검증

**Files:**
- Modify: `src/components/ContentStudio.tsx`
- Modify: `test/studio-design.test.mjs`

**Interfaces:**
- Consumes: 기존 `site_content` 조회와 `admin_set_site_content`, `admin_delete_site_content`
- Produces: DB 콘텐츠 준비 전 저장 차단과 명시적 초기화 외 삭제 금지

- [ ] **Step 1: 배포 안전성 실패 테스트 추가**

```js
assert.match(runtime, /createDesignReadiness\\(\\['content', 'design'\\]\\)/);
assert.match(runtime, /function saveText[^]*designReadiness\\.promise\\.then/);
assert.doesNotMatch(runtime, /load[^]*admin_set_site_content/i);
assert.match(studio, /if \\(!selected \\|\\| !password \\|\\| !designReady\\) return/);
assert.match(studio, /문구 저장[^]*disabled=\\{!designReady/);
```

- [ ] **Step 2: 테스트 실행과 현재 동작 확인**

Run: `node --test test/studio-design.test.mjs`

Expected: `ContentStudio.saveText`의 readiness guard와 비활성 버튼이 없어 FAIL.

- [ ] **Step 3: 필요한 최소 수정**

기존 iframe 내부 공동 readiness barrier를 유지하고 `ContentStudio.saveText`에도 `!designReady` guard를 추가한다. 문구 저장 버튼은 준비 전 `disabled`로 표시한다. 로딩 경로는 조회와 DOM 적용만 수행하며 기존 고정 `data-ps-edit` 키는 변경하지 않는다.

- [ ] **Step 4: 전체 자동 검증**

Run: `node --test test/*.test.mjs && npm run build && git diff --check`

Expected: 모든 테스트 PASS, 11개 Astro 페이지 build exit 0, whitespace 오류 없음.

- [ ] **Step 5: Supabase 적용과 데이터 검증**

마이그레이션을 연결된 프로젝트에 적용하고 다음을 SQL/RPC로 검증한다.

```sql
select service_key, status, count(*) from public.reviews group by service_key, status;
select service_key, status, count(*) from public.feedback_posts group by service_key, status;
```

서비스 A/B 테스트 레코드를 트랜잭션 안에서 만들고 A 조회에 B가 없음을 확인한다. 공감 두 건의 정렬, 태그 변경, 삭제, cascade vote 삭제를 확인한 뒤 테스트 데이터를 롤백한다. Database Advisor도 실행한다.

- [ ] **Step 6: 브라우저 검증**

스펠드릴과 다른 서비스에서 리뷰·기능 개선 목록이 분리되는지, 리뷰 공감 정렬, 9개 이상 하단 페이드, 숨은 스크롤바, 관리자 태그 변경·삭제·published UI를 확인한다. Design Studio 문구를 저장하고 새로고침해 유지되는지 확인한 뒤 테스트 문구는 원래 값으로 복원한다.

- [ ] **Step 7: 최종 커밋**

```bash
git add src/components/ContentStudio.tsx test/studio-design.test.mjs
git commit -m "test: protect Design Studio content overrides"
```
