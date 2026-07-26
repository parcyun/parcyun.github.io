import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ATLAS GEARS exposes a dedicated AI and EdTech discovery category', async () => {
  const [resources, browser, modal, icons] = await Promise.all([
    read('src/data/resources.ts'),
    read('src/components/ActivityBrowser.tsx'),
    read('src/components/admin/ResourceEditModal.tsx'),
    read('src/lib/icons.ts'),
  ]);

  for (const source of [resources, browser, modal, icons]) {
    assert.match(source, /AI, 에듀테크 도구 찾아보기/);
  }
});

test('AI EdTech Notion list moves into the category and Edubeige is added', async () => {
  const [resources, migration] = await Promise.all([
    read('src/data/resources.ts'),
    read('supabase/migrations/0022_atlas_ai_edtech_tools.sql'),
  ]);

  assert.match(resources, /id: 'ai-edtech-tools'[\s\S]*?type: 'AI, 에듀테크 도구 찾아보기'/);
  assert.match(resources, /id: 'edubeige'[\s\S]*?url: 'https:\/\/www\.edubeige\.com\/'/);
  assert.match(migration, /where id = 'ai-edtech-tools'/);
  assert.match(migration, /'edubeige'[\s\S]*?'https:\/\/www\.edubeige\.com\/'/);
});
