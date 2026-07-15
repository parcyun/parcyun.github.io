import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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
  assert.match(source, /legacy: !/);
  assert.match(source, /semanticIdentity/);
  const semanticBody = source.match(/function semanticIdentity\([\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(semanticBody, /index|sibling|nth/i);
  assert.doesNotMatch(semanticBody, /staticText|textContent|innerHTML/);
});

test('semantic ids are stable when an unrelated preceding sibling is inserted', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  assert.notEqual(block, '');
  const input = { explicit: 'about-purpose', durableParent: 'about', tag: 'p', immutableSemantic: '' };
  const context = { inputs: [{ ...input, legacyId: '/::P::4' }], result: [] };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  const before = context.result[0];
  context.inputs = [
    { explicit: 'unrelated-banner', durableParent: 'about', tag: 'p', immutableSemantic: '', legacyId: '/::P::4' },
    { ...input, legacyId: '/::P::5' },
  ];
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.equal(context.result[1].id, before.id);
  assert.equal(context.result[1].legacy, false);
});

test('duplicate semantic elements retain distinct legacy keys and resolve the second element', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  const base = { explicit: '', durableParent: '', tag: 'p', immutableSemantic: '' };
  const context = {
    inputs: [
      { ...base, legacyId: '/::P::4' },
      { ...base, legacyId: '/::P::5' },
    ],
    result: [],
  };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.equal(context.result[0].legacy, true);
  assert.equal(context.result[1].legacy, true);
  assert.equal(context.result[0].id, '/::P::4');
  assert.equal(context.result[1].id, '/::P::5');
  assert.notEqual(context.result[0].id, context.result[1].id);
  assert.match(source, /findByTextKey[\s\S]*data-ps-legacy-edit/);
});

test('changing source text never changes identity and un-authored text remains legacy', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  const context = { inputs: [{ explicit: '', durableParent: '', tag: 'p', immutableSemantic: '', staticText: '이전 문구', legacyId: '/::P::7' }], result: [] };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  const before = context.result[0];
  context.inputs = [{ ...context.inputs[0], staticText: '수정된 문구' }];
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.deepEqual(context.result[0], before);
  assert.equal(before.legacy, true);
  assert.equal(before.id, '/::P::7');
});

test('page element discovery waits for delayed design loading before exposing savedStyle', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-design-ready-start \*\/[\s\S]*?\/\* ps-design-ready-end \*\//)?.[0] || '';
  assert.notEqual(block, '');
  const context = { Promise, setTimeout, state: null };
  vm.runInNewContext(`${block}; state = createDesignReadiness();`, context);
  let settled = false;
  const pending = context.state.promise.then(() => { settled = true; });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(settled, false);
  context.state.markReady();
  await pending;
  assert.equal(settled, true);
  assert.match(source, /getElements:[\s\S]*designReadiness\.promise\.then/);
  assert.match(source, /loadedDesign[\s\S]*markReady/);
  assert.match(source, /catch[\s\S]*designReadiness\.markFailed/);
  const studio = await read('src/components/ContentStudio.tsx');
  assert.doesNotMatch(studio, /setTimeout\(refreshElements,\s*350\)/);
  assert.match(studio, /await studio\.getElements\(\)/);
  assert.match(studio, /disabled=\{!designReady\}/);
});

test('design reset and migrating save cover stable and legacy keys transactionally', async () => {
  const migration = await read('supabase/migrations/0014_site_design_key_migration.sql');
  const studio = await read('src/components/ContentStudio.tsx');
  assert.match(migration, /admin_delete_site_design_keys/i);
  assert.match(migration, /key = any\(p_keys\)/i);
  assert.match(migration, /admin_save_site_design_migrating/i);
  assert.match(migration, /p_legacy_key/i);
  assert.match(studio, /selected\.designKey,\s*selected\.legacyDesignKey/);
  assert.match(studio, /adminSaveSiteDesignMigrating/);
});
