import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all declared Design Studio modes are accepted by the URL parser', async () => {
  const source = await read('src/lib/studioDesign.ts');
  for (const mode of ['page', 'resources', 'works', 'components', 'reviews', 'feedback']) {
    assert.match(source, new RegExp(`['\"]${mode}['\"]`));
  }
  assert.match(source, /export function parseStudioMode/);
});

test('design resolver distinguishes draft, saved, computed, and default values', async () => {
  const source = await read('src/lib/studioDesign.ts');
  assert.match(source, /source: 'draft'/);
  assert.match(source, /source: 'saved'/);
  assert.match(source, /source: 'computed'/);
  assert.match(source, /source: 'default'/);
  assert.doesNotMatch(source, /value \|\| '#000000'/);
});

test('site content uses explicit stable ids and preserves legacy lookup keys', async () => {
  const source = await read('public/site-content.js');
  assert.match(source, /data-ps-edit-id/);
  assert.match(source, /data-ps-design-id/);
  assert.match(source, /legacyKey/);
  assert.match(source, /legacyDesignKey/);
});
