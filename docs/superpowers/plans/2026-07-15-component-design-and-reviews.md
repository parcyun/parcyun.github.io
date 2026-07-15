# Component Design and Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add shared footer component design controls to Design Studio and ship a no-login, server-filtered, admin-approved review experience.

**Architecture:** Supabase stores constrained component design values and review moderation state. The shared footer runtime reads one public component-design payload and applies safe values before rendering; the static review page and footer composer call review RPCs. Design Studio exposes component and review workspaces alongside the existing page/resource/works/feedback workspaces.

**Tech Stack:** Astro static pages, React/TypeScript Design Studio, vanilla browser modules, Supabase Postgres RPCs, Node test runner.

## Global Constraints

- No review login, name, email, or personal-information fields.
- Review rating is an integer from 1 to 5 and body length is 1–500 characters.
- Review HTML is stripped and prohibited abuse/attack/profanity content is rejected server-side before insertion.
- Only `published` reviews are public; accepted submissions begin as `pending`.
- Component styles use an explicit allowlist and fall back to compiled defaults if the public reader fails.
- Existing `admin_check(p_pw)` authorization and public-reader RPC patterns remain in use.

### Task 1: Lock regression tests and database contracts

**Files:**
- Modify: `test/feedback-board.test.mjs`
- Create: `test/reviews.test.mjs`
- Create: `supabase/migrations/0012_component_design_and_reviews.sql`

**Interfaces:**
- Produce `list_component_design(text)` returning safe component values.
- Produce `admin_save_component_design(text,text,jsonb)` and `admin_delete_component_design(text,text)`.
- Produce `submit_review(int,text)` returning a JSON status/error result.
- Produce `list_reviews()` for published rows and `admin_list_reviews(text)` for admins.
- Produce `admin_set_review_status(text,bigint,text)` with `pending|published|rejected` validation.

- [ ] Write tests asserting the migration has component-design tables/RPCs, review validation/status/RLS, and Design Studio/footer/review route markers.
- [ ] Run `node --test test/reviews.test.mjs test/feedback-board.test.mjs` and confirm the new assertions fail before implementation.
- [ ] Implement the migration with allowlisted component properties (`color`, `backgroundColor`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `padding`, `margin`, `borderRadius`, `borderColor`, `borderWidth`, `opacity`, `display`) and a normalized prohibited-term check.
- [ ] Apply the migration to project `myeouecgpjxcddemexcg` with Supabase MCP and verify valid, invalid, and prohibited RPC paths with SQL queries.
- [ ] Re-run the focused tests and commit the schema/test contract.

### Task 2: Add shared component design runtime and Design Studio workspace

**Files:**
- Modify: `public/ps-footer.js`
- Modify: `src/components/ContentStudio.tsx`
- Modify: `src/pages/admin/components.astro`
- Modify: `src/lib/adminPw.ts`
- Test: `test/reviews.test.mjs`

**Interfaces:**
- `public/ps-footer.js` reads `list_component_design('footer')`, applies safe CSS declarations, and retains compiled defaults on failure.
- `ContentStudio` gains `components` mode and renders `FooterComponentManager` with save/reset controls.
- `adminPw.ts` exposes typed component-design admin helpers.

- [ ] Add failing assertions for the component workspace label, footer component key, safe design-property allowlist, and public reader call.
- [ ] Run the focused tests and confirm failure.
- [ ] Implement typed helpers in `src/lib/adminPw.ts` and a component manager that edits the footer controls without exposing arbitrary CSS.
- [ ] Add the Design Studio sidebar mode and rounded responsive panels matching the existing Design Studio visual system.
- [ ] Fetch/apply component values in `ps-footer.js` before finalizing `setVars`, with a local default map and property validation.
- [ ] Run all tests and Astro build; verify the shared footer still renders when the RPC is unavailable.
- [ ] Commit the component-design implementation.

### Task 3: Build public review page and footer composer

**Files:**
- Create: `src/pages/reviews.astro`
- Create: `public/reviews.js`
- Modify: `public/ps-footer.js`
- Modify: `src/components/PsFooter.astro`
- Test: `test/reviews.test.mjs`

**Interfaces:**
- `/reviews/` renders a public review list and composer with rating buttons and body textarea.
- `public/reviews.js` calls `submit_review`, `list_reviews`, and exposes no personal-information fields.
- Footer action opens the composer or links to `/reviews/` using the shared component styling.

- [ ] Add failing tests for `/reviews/`, `리뷰 남기기`, rating controls, prohibited-content error handling, and public-only review listing.
- [ ] Run focused tests and confirm failure.
- [ ] Implement the page/module with accessible star controls, character count, empty state, loading state, and retry-safe error state.
- [ ] Add the footer floating review action and cache-bust the shared footer script on all loaders.
- [ ] Verify keyboard close/focus behavior and mobile layout with the existing shared footer style rules.
- [ ] Run all tests and Astro build; commit the public review feature.

### Task 4: Integrate admin review moderation and verify production

**Files:**
- Modify: `src/components/ContentStudio.tsx`
- Modify: `src/components/FeedbackAdmin.tsx` or create `src/components/ReviewAdmin.tsx`
- Modify: `src/pages/admin/components.astro`
- Modify: `test/reviews.test.mjs`

**Interfaces:**
- Design Studio `리뷰 관리` lists pending/published/rejected rows and calls `admin_set_review_status`.
- Admin status transitions refresh the list and show an explicit result message.

- [ ] Add failing tests for pending review listing, approve/reject actions, and workspace navigation.
- [ ] Implement the admin review manager with safe text rendering and confirm dialogs for rejection.
- [ ] Run full tests and Astro build.
- [ ] Apply/verify Supabase security advisors for the new tables/RPCs, documenting intentional public reader/writer functions.
- [ ] Push the verified commit to `main`, wait for GitHub Pages deployment, and curl `/reviews/` plus the production footer script to verify routes/assets.
