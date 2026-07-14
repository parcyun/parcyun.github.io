# Feedback Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a moderated feedback board with per-browser likes and align the spelling game footer with the shared floating footer.

**Architecture:** A static feedback widget serves Astro and standalone HTML pages. Supabase RPCs are the only access path to RLS-protected posts and votes. A small admin page reuses the existing password session for approval or rejection.

**Tech Stack:** Astro, React islands, vanilla browser JavaScript, Supabase PostgREST RPC, Node test runner.

## Global Constraints

- Published feedback only is public; every new submission is `pending`.
- Direct table access is blocked by RLS; all writes use validated RPCs.
- A voter can hold at most one like per post through `(post_id, voter_id)`.
- The static spelling game must use the same bottom-right pill geometry and branding as the main site.

---

### Task 1: Moderated feedback database API

**Files:**
- Create: `supabase/migrations/0009_feedback_board.sql`
- Test: `test/feedback-board.test.mjs`

- [ ] Write a failing contract test asserting the widget calls `submit_feedback`, `list_feedback`, and `toggle_feedback_like` with a persistent voter token.
- [ ] Apply tables, indexes, RLS, and RPCs for submission, published listing, like toggle, admin listing, and status change.
- [ ] Verify the contract test and SQL state transitions: pending posts are hidden, approved posts are returned, and a repeated like toggles off.

### Task 2: Shared feedback modal

**Files:**
- Create: `public/feedback-board.js`
- Modify: `src/components/PsFooter.astro`
- Modify: `src/components/WorldMapFooter.astro`
- Test: `test/feedback-board.test.mjs`

- [ ] Write failing DOM tests for opening the blurred modal, rendering published posts, submitting a pending post, and toggling a like.
- [ ] Implement the accessible modal, persistent voter token, loading/error states, and `data-feedback-open` trigger binding.
- [ ] Run the widget tests to green.

### Task 3: Footer parity and moderation screen

**Files:**
- Modify: `public/korean-spell-drill-parcyun/index.html`
- Create: `src/pages/feedback-admin.astro`
- Create: `src/components/FeedbackAdmin.tsx`
- Modify: `src/components/AdminLogin.tsx`
- Test: `test/feedback-admin.test.mjs`

- [ ] Write failing tests for matching spelling pill trigger markup and admin approval RPC calls.
- [ ] Align the spelling footer and load the shared widget; build the password-gated moderation list with approve/reject actions.
- [ ] Run all Node tests and Astro build, then check the compiled pages contain the trigger and widget.

### Task 4: Production verification

**Files:**
- Modify: none beyond the tasks above.

- [ ] Run `git diff --check`, all Node tests, and the bundled-Node Astro build.
- [ ] Query Supabase to verify only approved feedback is exposed by the public RPC.
- [ ] Commit scoped files, push `main`, wait for the Pages workflow, and fetch the three live pages to confirm the shared widget is present.
