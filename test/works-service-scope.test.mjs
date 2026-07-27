import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('works is supported by the public UI, admin UI, and database migration', async () => {
  const [reviews, feedback, adminPw, reviewAdmin, feedbackAdmin, migration] = await Promise.all([
    read('public/reviews.js'),
    read('public/feedback-board.js'),
    read('src/lib/adminPw.ts'),
    read('src/components/ReviewAdmin.tsx'),
    read('src/components/FeedbackAdmin.tsx'),
    read('supabase/migrations/0025_add_works_service_scope.sql'),
  ]);

  for (const source of [reviews, feedback, adminPw, reviewAdmin, feedbackAdmin]) {
    assert.match(source, /works/);
  }
  assert.match(migration, /service_key in \([^)]*'works'/);
  assert.match(migration, /v_path = '\/works' or v_path like '\/works\/%'/);
  assert.match(migration, /submit_review/);
  assert.match(migration, /submit_feedback/);
  assert.match(migration, /list_reviews/);
  assert.match(migration, /list_feedback/);
});
