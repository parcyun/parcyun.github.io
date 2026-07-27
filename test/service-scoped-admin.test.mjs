import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin RPC helpers expose service tagging and permanent deletion', async () => {
  const source = await read('src/lib/adminPw.ts');
  assert.match(source, /export type ServiceKey = 'home' \| 'spell-drill' \| 'atlas-gears' \| 'geoweb' \| 'works' \| 'other' \| 'unclassified'/);
  for (const name of ['adminSetReviewService', 'adminSetFeedbackService', 'adminDeleteReview', 'adminDeleteFeedback']) {
    assert.match(source, new RegExp(`export async function ${name}`));
  }
  assert.match(source, /admin_set_review_service/);
  assert.match(source, /admin_set_feedback_service/);
  assert.match(source, /admin_delete_review/);
  assert.match(source, /admin_delete_feedback/);
  assert.match(source, /service_key: ServiceKey/);
  assert.match(source, /like_count: number/);
});

test('review and feedback cards allow service changes and guarded deletion', async () => {
  const [review, feedback, adminCss] = await Promise.all([
    read('src/components/ReviewAdmin.tsx'),
    read('src/components/FeedbackAdmin.tsx'),
    read('src/pages/admin/components.astro'),
  ]);
  for (const source of [review, feedback]) {
    assert.match(source, /태그 수정/);
    assert.match(source, /<select/);
    assert.match(source, /window\.confirm/);
    assert.match(source, /service_key/);
    assert.match(source, /item\.status === 'pending'|post\.status === 'pending'/);
    assert.match(source, /is-published|review-status/);
  }
  assert.match(review, /adminSetReviewService/);
  assert.match(review, /adminDeleteReview/);
  assert.match(review, /공감 \{item\.like_count\}/);
  assert.match(feedback, /adminSetFeedbackService/);
  assert.match(feedback, /adminDeleteFeedback/);
  assert.match(adminCss, /\.is-published[^}]*color:var\(--a\)/);
});

test('review status is colored at the top and published reviews keep a disabled approval button', async () => {
  const [review, adminCss] = await Promise.all([
    read('src/components/ReviewAdmin.tsx'),
    read('src/pages/admin/components.astro'),
  ]);

  assert.match(review, /review-status is-\$\{item\.status\}/);
  assert.match(review, />\{item\.status\}</);
  assert.match(review, /className="approve-review"[^]*disabled=\{busyId === item\.id \|\| item\.status === 'published'\}/);
  assert.match(review, /review\(item, 'published'\)/);
  assert.match(review, /item\.status !== 'pending'[^]*review\(item, 'pending'\)[^]*보류/);
  assert.match(adminCss, /\.review-status\.is-pending[^}]*color:#8f8a82/);
  assert.match(adminCss, /\.review-status\.is-published[^}]*color:var\(--a\)/);
  assert.match(adminCss, /\.approve-review:disabled[^}]*grayscale\(1\)/);
});
