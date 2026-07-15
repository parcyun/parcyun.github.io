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
  assert.match(semanticBody, /staticText/);
});

test('semantic ids are stable when an unrelated preceding sibling is inserted', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  assert.notEqual(block, '');
  const input = { explicit: '', page: '/', section: 'about', tag: 'p', role: '', staticText: '교육 현장에 도움' };
  const context = { inputs: [{ ...input, legacyId: '/::P::4' }], result: [] };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  const before = context.result[0];
  context.inputs = [
    { ...input, staticText: '관련 없는 배너', legacyId: '/::P::4' },
    { ...input, legacyId: '/::P::5' },
  ];
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.equal(context.result[1].id, before.id);
  assert.equal(context.result[1].legacy, false);
});

test('duplicate semantic elements retain distinct legacy keys and resolve the second element', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  const base = { explicit: '', page: '/', section: 'about', tag: 'p', role: '', staticText: '같은 문장' };
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
