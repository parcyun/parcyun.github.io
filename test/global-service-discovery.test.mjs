import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

await import('../public/service-context.js');
const { resolveViewServiceKey, resolveSubmissionServiceKey } = globalThis.PSServiceContext || {};

test('service pages stay scoped while discovery pages show every service', () => {
  assert.equal(resolveViewServiceKey('/spell-drill/', ''), 'spell-drill');
  assert.equal(resolveViewServiceKey('/korean-spell-drill-parcyun/', ''), 'spell-drill');
  assert.equal(resolveViewServiceKey('/atlas-gears/', ''), 'atlas-gears');
  assert.equal(resolveViewServiceKey('/world-map/', ''), 'geoweb');
  assert.equal(resolveViewServiceKey('/works/', ''), 'works');

  for (const path of ['/', '/academica/']) {
    assert.equal(resolveViewServiceKey(path, ''), 'all', path);
  }
});

test('global review views preserve the page service used for new submissions', () => {
  assert.equal(resolveViewServiceKey('/reviews/', '?service=all&source=home'), 'all');
  assert.equal(resolveSubmissionServiceKey('/reviews/', '?service=all&source=home'), 'home');
  assert.equal(resolveSubmissionServiceKey('/reviews/', '?service=all&source=other'), 'other');
  assert.equal(resolveSubmissionServiceKey('/reviews/', '?service=spell-drill&source=spell-drill'), 'spell-drill');
});

test('global public lists expose service tags', async () => {
  const [reviews, feedback, migration] = await Promise.all([
    read('public/reviews.js'),
    read('public/feedback-board.js'),
    read('supabase/migrations/0021_global_service_discovery.sql'),
  ]);

  assert.match(reviews, /list_all_reviews/);
  assert.match(reviews, /review-service-tag/);
  assert.match(feedback, /list_all_feedback/);
  assert.match(feedback, /ps-feedback-service-tag/);
  assert.match(migration, /returns table\([^)]*service_key text/i);
});

test('Spell Drill has a short canonical URL and keeps the old URL as a redirect', async () => {
  const [page, redirect, resources, sitemap] = await Promise.all([
    read('public/spell-drill/index.html'),
    read('public/korean-spell-drill-parcyun/index.html'),
    read('src/data/resources.ts'),
    read('public/sitemap.xml'),
  ]);

  assert.match(page, /https:\/\/parcyun\.github\.io\/spell-drill\//);
  assert.match(redirect, /url=\/spell-drill\//i);
  assert.match(redirect, /location\.replace\(['"]\/spell-drill\/['"]\)/);
  assert.match(resources, /url: '\/spell-drill\/'/);
  assert.match(sitemap, /https:\/\/parcyun\.github\.io\/spell-drill\//);
  assert.doesNotMatch(sitemap, /korean-spell-drill-parcyun/);
});
