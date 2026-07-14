import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const sourceUrl = new URL('../public/visitor-counter.js', import.meta.url);
const resetMigrationUrl = new URL('../supabase/migrations/0011_visit_counter_day_boundary.sql', import.meta.url);

test('visitor day boundary uses 06:00 Asia/Seoul for writes and totals', async () => {
  const migration = await readFile(resetMigrationUrl, 'utf8');
  const visitorDay = "timezone('Asia/Seoul', now() - interval '6 hours')::date";

  assert.match(migration, /create or replace function public\.bump_visit/);
  assert.match(migration, /create or replace function public\.get_visit_totals/);
  assert.equal(migration.split(visitorDay).length - 1, 2);
});

test('ATLAS GEARS renders the total for its configured internal pages', async () => {
  const elements = new Map();
  const document = {
    readyState: 'complete',
    createElement() { return {}; },
    getElementById(id) { return elements.get(id) ?? null; },
    head: { appendChild(node) { if (node.id) elements.set(node.id, node); } },
    body: { appendChild(node) { if (node.id) elements.set(node.id, node); } },
  };
  const calls = [];
  const context = {
    window: {
      __psVisitorScopePaths: [
        '/atlas-gears/',
        '/korean-spell-drill-parcyun/',
        '/math-solid-volume/',
        '/world-map/',
      ],
    },
    document,
    location: { pathname: '/atlas-gears/' },
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      if (url.endsWith('/bump_visit')) {
        return { ok: true, json: async () => ({ page_today: 1, page_total: 1 }) };
      }
      if (url.endsWith('/get_visit_totals')) {
        return { ok: true, json: async () => ({ today: 7, total: 42 }) };
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  };

  vm.runInNewContext(await readFile(sourceUrl, 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].body, { p_paths: context.window.__psVisitorScopePaths });
  assert.match(elements.get('visitor-stats').innerHTML, /오늘 <b>7<\/b>/);
  assert.match(elements.get('visitor-stats').innerHTML, /전체 <b>42<\/b>/);
});
