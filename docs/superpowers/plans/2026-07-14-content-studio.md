# Content Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated Content Studio that edits public-page text and constrained design tokens, and migrates the home career timeline to database-backed CRUD records.

**Architecture:** Existing static markup remains the fallback. Supabase stores public-read content/style/career overrides and exposes password-gated RPC writes. The public runtime loads overrides, while `/admin/components/` provides a React editing workspace with a live preview and Figma-style inspector.

**Tech Stack:** Astro 7, React 19, browser Fetch API, Supabase Postgres RPC, Node built-in test runner.

## Global Constraints

- Reuse `admin_check(p_pw)` and the published Supabase API key; never expose a service-role key.
- Enable RLS for every new public-schema table; public reads only, all writes via validated administrator RPCs.
- Allow only a CSS custom-property allowlist in design overrides; do not persist arbitrary CSS.
- Preserve static public HTML as a functional fallback for failed or offline API calls.
- Add a failing regression test before each production behavior change.

---

### Task 1: Database-backed career and design contracts

**Files:**
- Create: `supabase/migrations/0010_content_studio.sql`
- Modify: `test/feedback-board.test.mjs`

**Interfaces:**
- Produces public readers `list_career_timeline()` and `list_site_design(p_path text)`.
- Produces administrator writers `admin_save_career_section`, `admin_delete_career_section`, `admin_save_career_item`, `admin_delete_career_item`, `admin_save_site_design`, and `admin_delete_site_design`.

- [ ] **Step 1: Write failing contract tests**

```js
test('content studio migration keeps career and design writes behind administrator RPCs', async () => {
  const migration = await read('supabase/migrations/0010_content_studio.sql');
  assert.match(migration, /create table if not exists public\.career_sections/i);
  assert.match(migration, /create table if not exists public\.career_items/i);
  assert.match(migration, /alter table public\.career_sections enable row level security/i);
  assert.match(migration, /admin_save_career_item/i);
  assert.match(migration, /admin_save_site_design/i);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `NODE=…; "$NODE" --test test/feedback-board.test.mjs`

Expected: FAIL because migration `0010_content_studio.sql` does not exist.

- [ ] **Step 3: Implement idempotent schema, policies, seed data, and RPCs**

Use `uuid` record identifiers, `sort` integers, `jsonb` design values, `security definer set search_path = public`, password checks, input validation, revoked default grants, then specific anon/authenticated function grants.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `NODE=…; "$NODE" --test test/feedback-board.test.mjs`

Expected: PASS.

### Task 2: Public runtime renderers

**Files:**
- Create: `public/career-timeline.js`
- Modify: `public/site-content.js`, `src/pages/index.astro`, `src/layouts/CinematicLayout.astro`, `test/feedback-board.test.mjs`

**Interfaces:**
- `window.psContentStudio` exposes `listEditable()`, `applyStyle(key, value)`, and `open(key)` to an administrator page.
- `#career-list` is hydrated from `list_career_timeline()` while static children remain the fallback.

- [ ] **Step 1: Write failing runtime tests**

```js
test('public runtime loads career records and only applies allowed design tokens', async () => {
  const runtime = await read('public/site-content.js');
  const careers = await read('public/career-timeline.js');
  assert.match(runtime, /DESIGN_PROPERTIES/);
  assert.match(runtime, /list_site_design/);
  assert.match(careers, /list_career_timeline/);
  assert.match(careers, /career-category-header/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `NODE=…; "$NODE" --test test/feedback-board.test.mjs`

Expected: FAIL because `career-timeline.js` does not exist.

- [ ] **Step 3: Implement safe public hydration and editing bridge**

Extend the text target selector without selecting links, controls, footer, navigation, media, React islands, or descendants marked `data-noedit`. Require stable data attributes for components that need design settings. Load only validated design properties and set them as inline custom properties.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `NODE=…; "$NODE" --test test/feedback-board.test.mjs`

Expected: PASS.

### Task 3: Administrator Content Studio

**Files:**
- Create: `src/components/ContentStudio.tsx`, `src/pages/admin/components.astro`
- Modify: `src/components/AdminLogin.tsx`, `test/feedback-board.test.mjs`

**Interfaces:**
- Route `/admin/components/` requires an existing `ps_admin_pw` session value and offers page selection, iframe preview, editable text list, style inspector, and career editor.
- Browser RPC calls use `p_pw` plus a typed row/value payload and display server failure text.

- [ ] **Step 1: Write failing page/component tests**

```js
test('administrator exposes the Content Studio with design inspector and career CRUD controls', async () => {
  const page = await read('src/pages/admin/components.astro');
  const studio = await read('src/components/ContentStudio.tsx');
  assert.match(page, /ContentStudio/);
  assert.match(studio, /디자인/);
  assert.match(studio, /경력 추가/);
  assert.match(studio, /admin_save_career_item/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `NODE=…; "$NODE" --test test/feedback-board.test.mjs`

Expected: FAIL because the route and component do not exist.

- [ ] **Step 3: Implement the workspace**

Create a three-column, responsive React workspace: page rail, same-origin iframe preview, and right inspector. Use click-to-select messages from the preview, explicit Save/Reset actions, color/number/select controls for the design allowlist, and structured career section/item controls on the home page.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `NODE=…; "$NODE" --test test/feedback-board.test.mjs`

Expected: PASS.

### Task 4: Remote migration, verification, and delivery

**Files:**
- Modify: `test/feedback-board.test.mjs`

- [ ] **Step 1: Execute and verify migration against project `myeouecgpjxcddemexcg`**

Run administrator-approved DDL through Supabase, then query the career reader and confirm seeded records return.

- [ ] **Step 2: Run complete verification**

Run: `NODE=…; "$NODE" --test test/*.test.mjs && "$NODE" node_modules/astro/bin/astro.mjs build`

Expected: all tests pass and Astro exits 0.

- [ ] **Step 3: Verify in Chrome**

Log into `/admin/`, open `/admin/components/`, edit a text value and design token, save it, refresh the public page, add/edit/delete a test career item, and restore it before delivery.

- [ ] **Step 4: Commit and push**

Run: `git add … && git commit -m "feat: add content studio" && git push origin main`
