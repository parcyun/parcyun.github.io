import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('shared footer passes its service to the review route and feedback widget', async () => {
  const footer = await read('public/ps-footer.js');

  assert.match(footer, /PSServiceContext\.resolveServiceKey/);
  assert.match(footer, /service=\$\{encodeURIComponent/);
  assert.match(footer, /__psFeedbackServiceKey/);
  assert.match(footer, /feedback-board\.js[^]*ASSET_VERSION/);
});

test('feedback requests stay scoped to the current service', async () => {
  const feedback = await read('public/feedback-board.js');

  assert.match(feedback, /list_feedback[^]*p_service_key/);
  assert.match(feedback, /submit_feedback[^]*p_service_key/);
});

test('reviews submit, load, like, and sort within the requested service', async () => {
  const reviews = await read('public/reviews.js');

  assert.match(reviews, /ps_review_voter/);
  assert.match(reviews, /submit_review[^]*p_service_key/);
  assert.match(reviews, /submit_review[^]*p_voter_id/);
  assert.match(reviews, /list_reviews[^]*p_service_key[^]*p_voter_id/);
  assert.match(reviews, /toggle_review_like/);
  assert.match(reviews, /p_voter_id/);
  assert.match(reviews, /like_count/);
  assert.match(reviews, /sort\(function/);
});

test('reviews list provides a hidden-scrollbar ten-card viewport and removes the fade at its end', async () => {
  const page = await read('src/pages/reviews.astro');
  const reviews = await read('public/reviews.js');

  assert.match(page, /scrollbar-width:none/);
  assert.match(page, /\.review-list::-webkit-scrollbar\{display:none\}/);
  assert.match(page, /\.review-list-wrap\.has-overflow:not\(\.is-at-end\)::after/);
  assert.match(reviews, /PSReviewViewport\.maxHeight/);
  assert.match(reviews, /PSReviewViewport\.fadeState/);
  assert.match(reviews, /--review-list-max-height/);
  assert.match(reviews, /is-at-end/);
});

test('all public feedback and review scripts use the same cache-busting release', async () => {
  const [component, spell, reviewsPage, preview, footer] = await Promise.all([
    read('src/components/PsFooter.astro'),
    read('public/korean-spell-drill-parcyun/index.html'),
    read('src/pages/reviews.astro'),
    read('public/footer-preview.html'),
    read('public/ps-footer.js'),
  ]);
  const expected = '20260720.3';
  for (const source of [component, spell, preview]) {
    assert.match(source, new RegExp(`service-context\\.js\\?v=${expected}`));
    assert.match(source, new RegExp(`ps-footer\\.js\\?v=${expected}`));
  }
  assert.match(reviewsPage, new RegExp(`review-viewport\\.js\\?v=${expected}`));
  assert.match(reviewsPage, new RegExp(`reviews\\.js\\?v=${expected}`));
  assert.match(footer, new RegExp(`ASSET_VERSION = '${expected}'`));
});
