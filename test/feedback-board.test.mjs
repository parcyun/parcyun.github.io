import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

test('feedback widget submits pending posts and toggles likes through RPCs', async () => {
  const widget = await read('public/feedback-board.js');

  assert.match(widget, /submit_feedback/);
  assert.match(widget, /list_feedback/);
  assert.match(widget, /toggle_feedback_like/);
  assert.match(widget, /ps_feedback_voter/);
  assert.match(widget, /backdrop-filter:blur/);
});

test('feedback database keeps posts private until an admin publishes them', async () => {
  const migration = await read('supabase/migrations/0009_feedback_board.sql');

  assert.match(migration, /create table if not exists public\.feedback_posts/i);
  assert.match(migration, /status\s+text\s+not null default 'pending'/i);
  assert.match(migration, /create or replace function public\.admin_set_feedback_status/i);
  assert.match(migration, /status = 'published'/i);
  assert.match(migration, /alter table public\.feedback_posts enable row level security/i);
});

test('spelling drill uses the shared floating footer trigger', async () => {
  const spelling = await read('public/korean-spell-drill-parcyun/index.html');

  assert.match(spelling, /class="ps-brand-fixed"/);
  assert.match(spelling, /data-feedback-open/);
  assert.match(spelling, /feedback-board\.js/);
});
