import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('legacy reviews collected before service scoping are restored to Spell Drill', async () => {
  const sql = await readFile(new URL('../supabase/migrations/0020_backfill_legacy_spell_drill_reviews.sql', import.meta.url), 'utf8');

  assert.match(sql, /update public\.reviews/i);
  assert.match(sql, /set service_key = 'spell-drill'/i);
  assert.match(sql, /where service_key = 'unclassified'/i);
  assert.match(sql, /created_at < timestamptz '2026-07-20 10:05:09\+00'/i);
  assert.doesNotMatch(sql, /update public\.reviews\s+set service_key = 'spell-drill'\s*;/i);
});
