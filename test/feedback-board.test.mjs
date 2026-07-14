import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

test('feedback widget submits pending posts and toggles likes through RPCs', async () => {
  const widget = await read('public/feedback-board.js');

  assert.match(widget, /submit_feedback/);
  assert.match(widget, /list_feedback/);
  assert.match(widget, /toggle_feedback_like/);
  assert.match(widget, /ps_feedback_voter/);
  assert.match(widget, /backdrop-filter:blur/);
});

test('feedback database keeps posts private until an admin publishes them', async () => {
  const migration = await read('supabase/migrations/0009_feedback_board.sql');

  assert.match(migration, /create table if not exists public\.feedback_posts/i);
  assert.match(migration, /status\s+text\s+not null default 'pending'/i);
  assert.match(migration, /create or replace function public\.admin_set_feedback_status/i);
  assert.match(migration, /status = 'published'/i);
  assert.match(migration, /alter table public\.feedback_posts enable row level security/i);
});

test('spelling drill uses the shared floating footer trigger', async () => {
  const spelling = await read('public/korean-spell-drill-parcyun/index.html');

  assert.match(spelling, /class="ps-brand-fixed"/);
  assert.match(spelling, /id="ps-coffee"/);
  assert.match(spelling, /id="foot-coffee-label"/);
  assert.match(spelling, /class="ico"><svg width="13" height="13"/);
  assert.match(spelling, /--ps-brand-left/);
  assert.match(spelling, /src="\.\.\/visitor-counter\.js"/);
  assert.match(spelling, /src="\.\.\/share-widget\.js"/);
  assert.match(spelling, /data-feedback-open/);
  assert.match(spelling, /feedback-board\.js/);
});

test('homepage hides the feedback trigger without hiding it from other pages', async () => {
  const home = await read('src/pages/index.astro');
  const footer = await read('src/components/PsFooter.astro');

  assert.match(home, /showFeedback=\{false\}/);
  assert.match(footer, /showFeedback = true/);
  assert.match(footer, /showFeedback &&/);
});

test('feedback modal uses the idea-focused copy and full-width input', async () => {
  const widget = await read('public/feedback-board.js');

  assert.match(widget, /개선 아이디어/);
  assert.match(widget, /당신의 아이디어가 대한민국 교실에서 실현됩니다!/);
  assert.match(widget, /display:block/);
});

test('ATLAS and GeoWeb use the Spell Drill footer baseline', async () => {
  const atlas = await read('src/pages/atlas-gears.astro');
  const geo = await read('src/pages/world-map.astro');
  const footer = await read('src/components/PsFooter.astro');
  const worldFooter = await read('src/components/WorldMapFooter.astro');

  assert.match(atlas, /<PsFooter showLinks=\{false\} \/>/);
  assert.match(geo, /<PsFooter showLinks=\{false\} \/>/);
  assert.match(footer, /showLinks = true/);
  assert.match(worldFooter, /showLinks = true/);
  assert.match(footer, /--ps-footer-h'.*:\s*'0px'/);
  assert.match(worldFooter, /--ps-footer-h'.*:\s*'0px'/);
});
