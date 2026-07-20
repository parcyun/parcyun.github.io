import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function readMigration(name) {
  const migrations = new URL('supabase/migrations/', root);
  const file = (await readdir(migrations)).find((entry) => entry.endsWith(`_${name}.sql`));
  return file ? readFile(new URL(`supabase/migrations/${file}`, root), 'utf8') : '';
}

test('service-scoped RPCs validate keys and filter published lists server-side', async () => {
  const sql = await readMigration('service_scoped_feedback_reviews');

  for (const table of ['reviews', 'feedback_posts']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} add column if not exists service_key text not null default 'unclassified'`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  for (const key of ['home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified']) assert.match(sql, new RegExp(`'${key}'`));
  assert.match(sql, /create table if not exists public\.review_votes/i);
  assert.match(sql, /alter table public\.review_votes enable row level security/i);
  assert.match(sql, /revoke all on table public\.review_votes from public, anon, authenticated/i);
  assert.match(sql, /create or replace function public\.list_reviews\(p_service_key text, p_voter_id text\)/i);
  assert.match(sql, /where r\.status = 'published'\s+and r\.service_key = p_service_key/i);
  assert.match(sql, /order by count\(v\.review_id\) desc, r\.created_at desc/i);
  assert.match(sql, /coalesce\(bool_or\(v\.voter_id = p_voter_id\), false\) as liked/i);
  assert.match(sql, /create or replace function public\.list_feedback\(p_service_key text\)/i);
  assert.match(sql, /where p\.status = 'published'\s+and p\.service_key = p_service_key/i);
  assert.match(sql, /create or replace function public\.list_reviews\(p_service_key text\)[\s\S]*?p_service_key is null or p_service_key not in \('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified'\)/i);
  assert.match(sql, /create or replace function public\.list_feedback\(p_service_key text\)[\s\S]*?p_service_key is null or p_service_key not in \('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified'\)/i);
  assert.match(sql, /and p_service_key <> 'unclassified'/i);
  assert.match(sql, /update public\.feedback_posts\s+set service_key = 'geoweb'[\s\S]*?source_path[^;]*world-map/i);
  assert.match(sql, /update public\.feedback_posts\s+set service_key = 'spell-drill'[\s\S]*?source_path[^;]*korean-spell-drill-parcyun/i);
  assert.doesNotMatch(sql, /source_path\)\s+like\s+'%[^']+%'/i);
});

test('review likes and submissions only operate on validated public data', async () => {
  const sql = await readMigration('service_scoped_feedback_reviews');

  assert.match(sql, /create or replace function public\.submit_review\(p_rating integer, p_body text, p_service_key text, p_voter_id text\)/i);
  assert.match(sql, /create or replace function public\.submit_feedback\(p_body text, p_source_path text, p_author_id text, p_service_key text\)/i);
  assert.match(sql, /create or replace function public\.toggle_review_like\(p_review_id bigint, p_voter_id text\)/i);
  assert.match(sql, /char_length\(coalesce\(p_voter_id, ''\)\) not between 16 and 128/i);
  assert.match(sql, /from public\.reviews where id = p_review_id and status = 'published'/i);
  assert.match(sql, /delete from public\.review_votes where review_id = p_review_id and voter_id = p_voter_id/i);
  assert.match(sql, /insert into public\.review_votes \(review_id, voter_id\) values \(p_review_id, p_voter_id\)/i);
  assert.match(sql, /jsonb_build_object\('liked', v_liked, 'like_count', v_like_count\)/i);
  assert.match(sql, /submit_review[\s\S]*p_service_key = 'unclassified'[\s\S]*raise exception/i);
  assert.match(sql, /submit_feedback[\s\S]*p_service_key = 'unclassified'[\s\S]*raise exception/i);
  assert.match(sql, /create or replace function public\.service_key_for_source_path\(p_source_path text\)/i);
  assert.match(sql, /when '\/atlas-gears' then 'atlas-gears'/i);
  assert.match(sql, /when '\/world-map' then 'geoweb'/i);
  assert.match(sql, /when '\/korean-spell-drill-parcyun' then 'spell-drill'/i);
  assert.match(sql, /when '\/reviews' then/i);
  assert.match(sql, /v_derived_service := public\.service_key_for_source_path\(p_source_path\)/i);
  assert.match(sql, /if p_service_key is distinct from v_derived_service then[\s\S]*raise exception/i);
});

test('admin RPCs expose tags and reject missing rows', async () => {
  const sql = await readMigration('service_scoped_feedback_reviews');

  for (const name of ['admin_set_review_service', 'admin_set_feedback_service', 'admin_delete_review', 'admin_delete_feedback']) {
    assert.match(sql, new RegExp(`create or replace function public\\.${name}`, 'i'));
  }
  assert.match(sql, /create or replace function public\.admin_list_reviews\(p_pw text\)/i);
  assert.match(sql, /returns table\(id bigint, rating smallint, body text, status text, moderation_reason text, service_key text,[\s\S]*like_count bigint\)/i);
  assert.match(sql, /create or replace function public\.admin_list_feedback\(p_pw text\)/i);
  assert.match(sql, /returns table\(id bigint, body text, source_path text, status text, service_key text,[\s\S]*like_count bigint\)/i);
  assert.match(sql, /if not found then raise exception '리뷰를 찾을 수 없습니다\.'/i);
  assert.match(sql, /if not found then raise exception '요청을 찾을 수 없습니다\.'/i);
});

test('security-definer RPCs use a pinned search path, explicit grants, and retain safe legacy wrappers', async () => {
  const sql = await readMigration('service_scoped_feedback_reviews');

  for (const name of ['submit_review', 'list_reviews', 'toggle_review_like', 'submit_feedback', 'list_feedback', 'admin_set_review_service', 'admin_set_feedback_service', 'admin_delete_review', 'admin_delete_feedback']) {
    assert.match(sql, new RegExp(`create or replace function public\\.${name}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, 'i'));
  }
  assert.doesNotMatch(sql, /drop function if exists public\.(?:submit_review\(integer, text\)|list_reviews\(\)|submit_feedback\(text, text, text\)|list_feedback\(\))/i);
  assert.match(sql, /create or replace function public\.submit_review\(p_rating integer, p_body text\)/i);
  assert.match(sql, /create or replace function public\.list_reviews\(\)/i);
  assert.match(sql, /where false/i);
  assert.match(sql, /create or replace function public\.submit_feedback\(p_body text, p_source_path text, p_author_id text\)/i);
  assert.match(sql, /public\.service_key_for_source_path\(p_source_path\)/i);
  assert.match(sql, /create or replace function public\.list_feedback\(\)/i);
  assert.match(sql, /grant execute on function public\.submit_feedback\(text, text, text\) to anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.list_reviews\(\) to anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.submit_review\(integer, text, text, text\) from public/i);
  assert.match(sql, /grant execute on function public\.submit_review\(integer, text, text, text\) to anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.list_reviews\(text, text\) to anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.admin_delete_feedback\(text, bigint\) to anon, authenticated/i);
  assert.match(sql, /revoke all on function public\.admin_set_review_status\(text, bigint, text\) from public/i);
  assert.match(sql, /revoke all on function public\.admin_set_feedback_status\(text, bigint, text\) from public/i);
});
