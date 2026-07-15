import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

test('component design and review RPCs are server-owned and constrained', async () => {
  const migration = await read('supabase/migrations/0012_component_design_and_reviews.sql');

  assert.match(migration, /create table if not exists public\.component_design/i);
  assert.match(migration, /create table if not exists public\.reviews/i);
  assert.match(migration, /list_component_design/i);
  assert.match(migration, /admin_save_component_design/i);
  assert.match(migration, /submit_review/i);
  assert.match(migration, /admin_set_review_status/i);
  assert.match(migration, /status\s+text\s+not null default 'pending'/i);
  assert.match(migration, /500/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /regexp_replace/i);
});

test('reviews page has anonymous star-rated submission and moderation copy', async () => {
  const page = await read('src/pages/reviews.astro');
  const runtime = await read('public/reviews.js');

  assert.match(page, /reviews-app/);
  assert.match(page, /reviews\.js/);
  assert.match(runtime, /submit_review/);
  assert.match(runtime, /list_reviews/);
  assert.match(page, /maxlength="500"/);
  assert.match(runtime, /리뷰 남기기/);
  assert.match(runtime, /검토 후 공개/);
  assert.doesNotMatch(runtime, /email|이메일|name=\"name\"/i);
  assert.match(page, /\.review-star\{[^}]*border:0/);
  assert.match(page, /appearance:none/);
  assert.match(page, /\.review-star\.active/);
  assert.match(page, /color:var\(--ps-primary\)/);
});

test('shared footer exposes review action and applies component design values', async () => {
  const footer = await read('public/ps-footer.js');
  const studio = await read('src/components/ContentStudio.tsx');
  const componentManager = await read('src/components/FooterComponentManager.tsx');
  const admin = await read('src/lib/adminPw.ts');

  assert.match(footer, /list_component_design/);
  assert.match(footer, /리뷰 남기기/);
  assert.match(footer, /reviews\//);
  assert.match(studio, /컴포넌트 디자인/);
  assert.match(componentManager, /adminSaveComponentDesign/);
  assert.match(studio, /리뷰 관리/);
  assert.match(admin, /adminSetReviewStatus/);
});
