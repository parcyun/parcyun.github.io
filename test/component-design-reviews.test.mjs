import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

test('component design and review RPCs are server-owned and constrained', async () => {
  const migration = await read('supabase/migrations/0012_component_design_and_reviews.sql');

  assert.match(migration, /create table if not exists public\.component_design/i);
  assert.match(migration, /create table if not exists public\.reviews/i);
  assert.match(migration, /list_component_design/i);
  assert.match(migration, /admin_save_component_design/i);
  assert.match(migration, /submit_review/i);
  assert.match(migration, /admin_set_review_status/i);
  assert.match(migration, /status\s+text\s+not null default 'pending'/i);
  assert.match(migration, /500/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /regexp_replace/i);
});

test('reviews page has anonymous star-rated submission and moderation copy', async () => {
  const page = await read('src/pages/reviews.astro');
  const runtime = await read('public/reviews.js');

  assert.match(page, /reviews-app/);
  assert.match(page, /reviews\.js/);
  assert.match(runtime, /submit_review/);
  assert.match(runtime, /list_reviews/);
  assert.match(page, /maxlength="500"/);
  assert.match(runtime, /리뷰 남기기/);
  assert.match(runtime, /검토 후 공개/);
  assert.doesNotMatch(runtime, /email|이메일|name=\"name\"/i);
  assert.match(page, /\.review-star\{[^}]*border:0/);
  assert.match(page, /appearance:none/);
  assert.match(page, /\.review-star\.active/);
  assert.match(page, /color:var\(--ps-primary\)/);
});

test('shared footer exposes review action and applies component design values', async () => {
  const footer = await read('public/ps-footer.js');
  const studio = await read('src/components/ContentStudio.tsx');
  const componentManager = await read('src/components/FooterComponentManager.tsx');
  const admin = await read('src/lib/adminPw.ts');

  assert.match(footer, /list_component_design/);
  assert.match(footer, /리뷰 남기기/);
  assert.match(footer, /reviews\//);
  assert.match(studio, /컴포넌트 디자인/);
  assert.match(componentManager, /adminSaveComponentDesign/);
  assert.match(studio, /리뷰 관리/);
  assert.match(admin, /adminSetReviewStatus/);
});

test('component design migration upserts properties without deleting siblings', async () => {
  const migration = await read('supabase/migrations/0013_component_design_property_updates.sql');
  const saveBody = migration.match(/create or replace function public\.admin_save_component_design[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(saveBody, /on conflict\s*\(component_key,\s*property\)\s*do update/i);
  assert.doesNotMatch(saveBody, /delete from public\.component_design/i);
  assert.match(migration, /admin_delete_component_design_property/i);
});

test('component design migration validates CSS values by property', async () => {
  const migration = await read('supabase/migrations/0013_component_design_property_updates.sql');
  assert.match(migration, /item\.key in \('color',\s*'backgroundColor',\s*'borderColor'\)/i);
  assert.match(migration, /#\[0-9a-fA-F\]\{3\}/);
  assert.match(migration, /item\.key = 'fontSize'/i);
  assert.match(migration, /item\.key in \('padding',\s*'borderRadius',\s*'borderWidth'\)/i);
  assert.match(migration, /item\.key = 'margin'/i);
  assert.match(migration, /item\.key = 'letterSpacing'/i);
  assert.match(migration, /item\.key = 'lineHeight'/i);
  assert.match(migration, /item\.key = 'opacity'/i);
  assert.match(migration, /item\.key = 'fontWeight'/i);
  assert.match(migration, /item\.key = 'display'/i);
  assert.match(migration, /잘못된 CSS 값/);
});

test('component dimensions reject negative sizes while signed spacing remains valid', async () => {
  const migration = await read('supabase/migrations/0013_component_design_property_updates.sql');
  const patternFor = (condition) => migration.match(new RegExp(`${condition}[\\s\\S]*?value_text !~\\* '([^']+)'`, 'i'))?.[1];
  const fontSize = new RegExp(patternFor("item\\.key = 'fontSize'") || 'never', 'i');
  const boxSize = new RegExp(patternFor("item\\.key in \\('padding',\\s*'borderRadius',\\s*'borderWidth'\\)") || 'never', 'i');
  const margin = new RegExp(patternFor("item\\.key = 'margin'") || 'never', 'i');
  const letterSpacing = new RegExp(patternFor("item\\.key = 'letterSpacing'") || 'never', 'i');
  for (const accepted of ['0', '16px', '1.25rem']) assert.equal(fontSize.test(accepted), true, accepted);
  for (const rejected of ['-1px', '8px 12px']) assert.equal(fontSize.test(rejected), false, rejected);
  for (const accepted of ['0', '16px', '8px 12px']) assert.equal(boxSize.test(accepted), true, accepted);
  for (const rejected of ['-1px', '8px -2px']) assert.equal(boxSize.test(rejected), false, rejected);
  for (const accepted of ['-1px', '0', '12px -4px']) assert.equal(margin.test(accepted), true, accepted);
  for (const rejected of ['calc(100% - 1px)', '12']) assert.equal(margin.test(rejected), false, rejected);
  for (const accepted of ['-0.05em', '0', '1px']) assert.equal(letterSpacing.test(accepted), true, accepted);
  for (const rejected of ['1px 2px', '12']) assert.equal(letterSpacing.test(rejected), false, rejected);
});

test('font family accepts quoted fallback lists and rejects CSS injection delimiters', async () => {
  const migration = await read('supabase/migrations/0013_component_design_property_updates.sql');
  const literal = migration.match(/item\.key = 'fontFamily'[\s\S]*?value_text !~ '((?:''|[^'])+)'/i)?.[1];
  assert.ok(literal);
  const fontFamily = new RegExp(literal.replaceAll("''", "'"));
  for (const accepted of ["'Montserrat','Pretendard Variable',sans-serif", 'Montserrat, Pretendard Variable, sans-serif', 'Noto Sans KR']) {
    assert.equal(fontFamily.test(accepted), true, accepted);
  }
  for (const rejected of ['Montserrat; color:red', 'Arial){}', 'url(javascript:x)', 'Arial\\evil']) {
    assert.equal(fontFamily.test(rejected), false, rejected);
  }
});

test('every exposed footer property is consumed through CSS variables', async () => {
  const footer = await read('public/ps-footer.js');
  for (const token of [
    '--ps-footer-primary', '--ps-footer-color', '--ps-footer-bg',
    '--ps-footer-font-family', '--ps-footer-font-size', '--ps-footer-font-weight',
    '--ps-footer-line-height', '--ps-footer-letter-spacing', '--ps-footer-padding',
    '--ps-footer-radius', '--ps-footer-opacity',
  ]) assert.match(footer, new RegExp(`var\\(${token}`));
  assert.doesNotMatch(footer, /color:\s*#FFB11A/);
});

test('component preview loads the production footer runtime', async () => {
  const preview = await read('public/footer-preview.html');
  assert.match(preview, /src="\/ps-footer\.js"/);
  assert.match(preview, /ps-footer-preview-design/);
});
