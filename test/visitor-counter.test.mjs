import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const sourceUrl = new URL('../public/visitor-counter.js', import.meta.url);
const resetMigrationUrl = new URL('../supabase/migrations/0011_visit_counter_day_boundary.sql', import.meta.url);
const spellMergeMigrationUrl = new URL('../supabase/migrations/0024_merge_spell_drill_visit_history.sql', import.meta.url);

async function executeCounter({ hostname, pathname = '/', storage }) {
  const calls = [];
  const document = {
    readyState: 'complete',
    createElement() { return {}; },
    getElementById() { return null; },
    head: { appendChild() {} },
    body: { appendChild() {} },
  };
  const context = {
    window: {},
    document,
    location: { hostname, pathname },
    localStorage: storage,
    fetch: async (url) => {
      calls.push(url);
      return { ok: true, json: async () => ({ page_today: 1, page_total: 1 }) };
    },
  };
  vm.runInNewContext(await readFile(sourceUrl, 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  return calls;
}

test('a browser counts each page only once per visitor day', async () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  const first = await executeCounter({ hostname: 'parcyun.github.io', pathname: '/works/', storage });
  const second = await executeCounter({ hostname: 'parcyun.github.io', pathname: '/works/', storage });
  assert.equal(first.filter((url) => url.endsWith('/bump_visit')).length, 1);
  assert.equal(second.filter((url) => url.endsWith('/bump_visit')).length, 0);
  assert.equal(second.filter((url) => url.endsWith('/get_visit_totals')).length, 1);
});

test('homepage total is the exact sum of current canonical page counters', async () => {
  const home = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(home, /window\.__psVisitorScopePaths/);
  for (const path of ['/', '/academica/', '/atlas-gears/', '/works/', '/world-map/', '/reviews/', '/spell-drill/']) {
    assert.match(home, new RegExp(`['"]${path.replaceAll('/', '\\/')}['"]`));
  }
  assert.doesNotMatch(home, /korean-spell-drill-parcyun|__probe__|__share__/);
});

test('visitor day boundary uses 06:00 Asia/Seoul for writes and totals', async () => {
  const migration = await readFile(resetMigrationUrl, 'utf8');
  const visitorDay = "timezone('Asia/Seoul', now() - interval '6 hours')::date";

  assert.match(migration, /create or replace function public\.bump_visit/);
  assert.match(migration, /create or replace function public\.get_visit_totals/);
  assert.equal(migration.split(visitorDay).length - 1, 2);
});

test('Spell Drill visit history is merged into the canonical short path without double counting', async () => {
  const migration = await readFile(spellMergeMigrationUrl, 'utf8');

  assert.match(migration, /insert into public\.page_visits/i);
  assert.match(migration, /\/korean-spell-drill-parcyun\//);
  assert.match(migration, /\/spell-drill\//);
  assert.match(migration, /group by day/i);
  assert.match(migration, /on conflict \(day, path\) do update/i);
  assert.match(migration, /delete from public\.page_visits/i);
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
        '/spell-drill/',
        '/math-solid-volume/',
        '/world-map/',
      ],
    },
    document,
    location: { hostname: 'parcyun.github.io', pathname: '/atlas-gears/' },
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

test('localhost and loopback hosts never increment production visits', async () => {
  for (const hostname of ['localhost', '127.0.0.1', '::1', '[::1]']) {
    const calls = await executeCounter({ hostname, pathname: '/admin/' });
    assert.equal(calls.some((url) => url.endsWith('/bump_visit')), false);
  }
});
