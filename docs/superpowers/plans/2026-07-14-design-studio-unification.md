# Design Studio Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate every administrator editing workflow into a rounded Design Studio workspace.

**Architecture:** `ContentStudio.tsx` becomes the Design Studio shell and switches between page editing, resource inventory, Works inventory, and feedback review. Existing data hooks and edit modals are rendered within the shell so their RPC behavior stays unchanged.

**Tech Stack:** Astro 7, React 19, existing Supabase RPC helpers, Node test runner.

## Global Constraints

- Keep existing password/RPC authorization unchanged.
- Preserve public routes and their current inline administrator controls.
- Use `--ds-radius-control:12px`, `--ds-radius-panel:16px`, and `--ds-radius-elevated:20px` for all Design Studio controls.

---

### Task 1: Assert the unified workspace contract

**Files:**
- Modify: `test/feedback-board.test.mjs`
- Modify: `src/components/ContentStudio.tsx`

- [ ] Write a failing test that requires `Design Studio`, `페이지 디자인`, `자료 관리`, `Works 관리`, `개선 요청`, and all three radius tokens.
- [ ] Run `NODE=…; "$NODE" --test test/feedback-board.test.mjs` and observe failure.
- [ ] Add mode navigation and Design Studio naming to the shell.
- [ ] Re-run the focused test and observe pass.

### Task 2: Embed all administrator managers

**Files:**
- Modify: `src/components/ContentStudio.tsx`, `src/components/AdminLogin.tsx`, `src/pages/feedback-admin.astro`

- [ ] Write a failing test requiring Design Studio links from admin and feedback redirect.
- [ ] Run the focused test and observe failure.
- [ ] Render resource, Works, and feedback managers in Design Studio; redirect the legacy feedback route to the Design Studio feedback mode.
- [ ] Re-run the focused test and observe pass.

### Task 3: Verify and publish

**Files:**
- Modify: `test/feedback-board.test.mjs`

- [ ] Run `NODE=…; "$NODE" --test test/*.test.mjs && "$NODE" node_modules/astro/bin/astro.mjs build`.
- [ ] Inspect Design Studio through Chrome, then commit and push the verified change.
