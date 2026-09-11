import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ATLAS cards show cumulative resource views and identify one non-zero HOT item', async () => {
  const browser = await read('src/components/ActivityBrowser.tsx');
  assert.match(browser, /loadResourceViewTotals\(resources\.map\(\(resource\) => resource\.id\)\)/);
  assert.match(browser, /recordResourceView\(resourceId\)/);
  assert.match(browser, /hotResourceId === r\.id/);
  assert.match(browser, /act-hot">HOT/);
  assert.doesNotMatch(browser, /누적 조회/);
  assert.match(browser, /aria-label=\{`전체 기간 조회수 \$\{new Intl\.NumberFormat/);
});

test('resource view totals reuse the existing click counter and expose only a constrained aggregate RPC', async () => {
  const [views, migration] = await Promise.all([
    read('src/lib/resourceViews.ts'),
    read('supabase/migrations/0029_reuse_resource_hit_totals.sql'),
  ]);
  assert.match(views, /list_resource_click_totals/);
  assert.match(views, /bump_resource/);
  assert.match(migration, /drop table if exists public\.resource_view_totals/);
  assert.match(migration, /create or replace function public\.list_resource_click_totals/);
  assert.match(migration, /where hits\.resource_id = any\(coalesce\(p_resource_ids/);
  assert.match(migration, /hits\.kind = 'click'/);
  assert.match(migration, /sum\(hits\.count\)::bigint as total/);
});
