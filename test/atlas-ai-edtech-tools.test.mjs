import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ATLAS GEARS groups AI and EdTech discovery under lesson preparation', async () => {
  const [resources, browser, modal, icons] = await Promise.all([
    read('src/data/resources.ts'),
    read('src/components/ActivityBrowser.tsx'),
    read('src/components/admin/ResourceEditModal.tsx'),
    read('src/lib/icons.ts'),
  ]);

  for (const source of [resources, browser, modal, icons]) {
    assert.match(source, /수업준비/);
  }
});

test('lesson preparation includes AI EdTech tools and the yearly-life archive', async () => {
  const [resources, migration, update] = await Promise.all([
    read('src/data/resources.ts'),
    read('supabase/migrations/0022_atlas_ai_edtech_tools.sql'),
    read('supabase/migrations/0028_atlas_lesson_preparation_archive.sql'),
  ]);

  assert.match(resources, /id: 'ai-edtech-tools'[\s\S]*?type: '수업준비'/);
  assert.match(resources, /id: 'edubeige'[\s\S]*?url: 'https:\/\/www\.edubeige\.com\/'/);
  assert.match(resources, /id: 'yearly-life-archive'[\s\S]*?한 해 살이 아카이브/);
  assert.match(resources, /id: 'yearly-life-archive'[\s\S]*?parcyun\.notion\.site\/3133f99a82238159a0b3e9eba02d462c/);
  assert.match(migration, /where id = 'ai-edtech-tools'/);
  assert.match(migration, /'edubeige'[\s\S]*?'https:\/\/www\.edubeige\.com\/'/);
  assert.match(update, /set type = '수업준비'/);
  assert.match(update, /'yearly-life-archive'[\s\S]*?'한 해 살이 아카이브'/);
});
