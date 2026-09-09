import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('MDBF and Masterclass Works routes use the shared standard component', async () => {
  for (const slug of ['mdbf', 'masterclass']) {
    const page = await read(`src/pages/works/${slug}.astro`);
    assert.match(page, /BrandStandardPage/);
    assert.match(page, new RegExp(`brandStandards\\.${slug}`));
  }
});

test('portable manifests and token assets are available for both brands', async () => {
  const pairs = [
    ['mdbf', 'mdbf-standard-v1.css'],
    ['masterclass', 'masterclass-standard-v1.css'],
  ];
  for (const [slug, cssName] of pairs) {
    const manifest = JSON.parse(await read(`public/works/${slug}/assets/component-manifest-v1.json`));
    const css = await read(`public/works/${slug}/assets/${cssName}`);
    assert.ok(manifest.objects.length >= 6);
    assert.ok(manifest.sections.length >= 5);
    assert.match(css, /#3364d9/i);
  }
});

test('portfolio frame and brand canvases keep their accent colors separated', async () => {
  const component = await read('src/components/BrandStandardPage.astro');
  assert.match(component, /--ps:#ffb11a/i);
  assert.match(component, /--brand:#3364d9/i);
  assert.doesNotMatch(await read('public/works/mdbf/assets/mdbf-standard-v1.css'), /#ffb11a/i);
  assert.doesNotMatch(await read('public/works/masterclass/assets/masterclass-standard-v1.css'), /#ffb11a/i);
});

test('database Works remain authoritative while bundled standards fill missing cards', async () => {
  const source = await read('src/lib/useWorks.ts');
  assert.match(source, /databaseNums/);
  assert.match(source, /!databaseNums\.has\(work\.num\)/);
});

test('Works portfolio order is I am Serif, MDBF, then the Masterclass', async () => {
  const source = await read('src/data/works.ts');
  const serif = source.indexOf("'/works/002-i-am-serif/': 10");
  const mdbf = source.indexOf("'/works/mdbf/': 20");
  const masterclass = source.indexOf("'/works/masterclass/': 30");
  assert.ok(serif > -1 && serif < mdbf && mdbf < masterclass);
  assert.match(source, /sortWorksForPortfolio/);
});
