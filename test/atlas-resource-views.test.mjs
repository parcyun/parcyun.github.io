import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ATLAS cards show cumulative resource views and identify one non-zero HOT item', async () => {
  const browser = await read('src/components/ActivityBrowser.tsx');
  assert.match(browser, /loadResourceViewTotals\(resources\)/);
  assert.match(browser, /recordResourceView\(resourceId\)/);
  assert.match(browser, /hotResourceId === r\.id/);
  assert.match(browser, /act-hot">HOT/);
  assert.match(browser, /\.act-hot\{[^}]*padding:2px 8px[^}]*background:#D96A6A[^}]*color:#fff[^}]*font-size:10px/);
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

test('cards for independent services prefer their own all-time visitor totals', async () => {
  const [resources, views, migration, resourceStore] = await Promise.all([
    read('src/data/resources.ts'),
    read('src/lib/resourceViews.ts'),
    read('supabase/migrations/0030_atlas_service_visit_totals.sql'),
    read('src/lib/useResources.ts'),
  ]);
  assert.match(resources, /id: 'spell-drill'[\s\S]*?visitPath: '\/spell-drill\/'/);
  assert.match(resources, /id: 'world-map'[\s\S]*?visitPath: '\/world-map\/'/);
  assert.match(views, /resource\.visitPath \? \(services\[resource\.visitPath\] \|\| 0\) : \(clicks\[resource\.id\] \|\| 0\)/);
  assert.match(migration, /create or replace function public\.list_page_visit_totals/);
  assert.match(migration, /sum\(visits\.count\)::bigint as total/);
  assert.match(resourceStore, /\{ \.\.\.override, visitPath: r\.visitPath \}/);
});
