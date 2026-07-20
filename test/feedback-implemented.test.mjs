import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('feedback implementation state is persisted and exposed through constrained RPCs', async () => {
  const sql = await read('supabase/migrations/0019_feedback_implemented.sql');

  assert.match(sql, /add column if not exists implemented_at timestamptz/i);
  assert.match(sql, /create or replace function public\.admin_mark_feedback_implemented\(p_pw text, p_id bigint\)/i);
  assert.match(sql, /if not public\.admin_check\(p_pw\)/i);
  assert.match(sql, /status = 'published'/i);
  assert.match(sql, /implemented_at = now\(\)/i);
  assert.match(sql, /returns table\(id bigint, body text, created_at timestamptz, like_count bigint, implemented_at timestamptz\)/i);
  assert.match(sql, /revoke all on function public\.admin_mark_feedback_implemented\(text, bigint\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.admin_mark_feedback_implemented\(text, bigint\) to anon, authenticated/i);
});

test('admin can mark published feedback implemented and public cards show the result', async () => {
  const [admin, client, helper] = await Promise.all([
    read('src/components/FeedbackAdmin.tsx'),
    read('public/feedback-board.js'),
    read('src/lib/adminPw.ts'),
  ]);

  assert.match(helper, /implemented_at: string \| null/);
  assert.match(helper, /adminMarkFeedbackImplemented/);
  assert.match(helper, /admin_mark_feedback_implemented/);
  assert.match(admin, /업데이트 반영/);
  assert.match(admin, /반영 완료/);
  assert.match(admin, /post\.status === 'published'/);
  assert.match(client, /post\.implemented_at/);
  assert.match(client, /업데이트에 반영됨/);
  assert.match(client, /ps-feedback-implemented/);
});
