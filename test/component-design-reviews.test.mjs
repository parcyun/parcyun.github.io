import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

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
  assert.match(componentManager, /adminApplyComponentDesign/);
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

test('footer exposes independent primary, foreground, and muted color controls and tokens', async () => {
  const footer = await read('public/ps-footer.js');
  const manager = await read('src/components/FooterComponentManager.tsx');
  for (const property of ['color', 'foregroundColor', 'mutedColor']) {
    assert.match(manager, new RegExp(`['"]${property}['"]`));
    assert.match(footer, new RegExp(`['"]${property}['"]`));
  }
  assert.match(footer, /'foregroundColor':'--ps-footer-color'/);
  assert.match(footer, /'mutedColor':'--ps-footer-muted'/);
  assert.match(footer, /var\(--ps-footer-primary\)/);
  assert.match(footer, /var\(--ps-footer-color\)/);
  assert.match(footer, /var\(--ps-footer-muted\)/);
});

test('0017 validates and persists the two new footer text colors across all write RPCs', async () => {
  const migration = await read('supabase/migrations/0017_footer_text_colors.sql');
  for (const property of ['foregroundColor', 'mutedColor']) {
    assert.ok((migration.match(new RegExp(property, 'g')) || []).length >= 4, property);
  }
  assert.match(migration, /item\.key in \('color',\s*'foregroundColor',\s*'mutedColor',\s*'backgroundColor',\s*'borderColor'\)/);
  assert.match(migration, /admin_delete_component_design_property/);
  assert.match(migration, /admin_apply_component_design/);
  assert.match(migration, /on conflict\s*\(component_key,\s*property\)\s*do update/i);
  const literal = migration.match(/item\.key in \('color',[\s\S]*?value_text !~\* '([^']+)'/)?.[1];
  assert.ok(literal);
  const color = new RegExp(literal, 'i');
  for (const accepted of ['#8C8C8C', '#fff', 'rgba(140,140,140,.8)', 'transparent']) assert.equal(color.test(accepted), true, accepted);
  for (const rejected of ['#12', 'red;display:none', 'url(javascript:x)', 'rgb(foo)']) assert.equal(color.test(rejected), false, rejected);
});

test('component preview loads the production footer runtime', async () => {
  const preview = await read('public/footer-preview.html');
  assert.match(preview, /src="\/ps-footer\.js"/);
  assert.match(preview, /ps-footer-preview-design/);
});

test('footer preview contexts mirror the real page footer hosts', async () => {
  const footer = await read('public/ps-footer.js');
  for (const [context, links, feedback, review] of [
    ['home', true, false, true],
    ['atlas', false, true, true],
    ['geoweb', false, true, true],
    ['spell', false, true, true],
  ]) {
    assert.match(footer, new RegExp(`${context}:\\s*\\{\\s*showLinks:\\s*${links},\\s*showFeedback:\\s*${feedback},\\s*showReview:\\s*${review}`));
  }
});

test('mobile footer keeps editable sizing tokens and preview switches preserve the draft', async () => {
  const footer = await read('public/ps-footer.js');
  const preview = await read('src/components/design/FooterPreview.tsx');
  const mobile = footer.match(/@media\(max-width:480px\)\{[\s\S]*?\n\s*\}/)?.[0] || '';
  assert.doesNotMatch(mobile, /font-size:\s*10px|padding:\s*3px 10px|gap:\s*6px/);
  assert.match(mobile, /var\(--ps-footer-font-size\)/);
  assert.match(mobile, /var\(--ps-footer-padding\)/);
  assert.match(mobile, /var\(--ps-footer-gap\)/);
  assert.match(preview, /postMessage\(\{ type: 'ps-footer-preview-design', values \}/);
  assert.match(preview, /useEffect\(sendValues, \[values, context\]\)/);
  assert.doesNotMatch(preview, /setValues|setDraft/);
});

test('preview design messages are rejected outside the trusted parent preview channel', async () => {
  const footer = await read('public/ps-footer.js');
  assert.match(footer, /if\s*\(previewConfig\s*&&\s*previewConfig\.enabled\)\s*window\.addEventListener\('message'/);
  assert.match(footer, /event\.source\s*===\s*window\.parent/);
  assert.match(footer, /event\.origin\s*===\s*location\.origin/);
  const guard = footer.match(/function isTrustedPreviewMessage\(event\)\s*\{[\s\S]*?\n\s*\}/)?.[0] || '';
  assert.ok(guard);
  const parent = {};
  const context = { parent, window: { parent }, event: null, result: null, location: { origin: 'https://studio.test' } };
  vm.createContext(context);
  vm.runInContext(`${guard}; result = [
    isTrustedPreviewMessage({ source: parent, origin: 'https://studio.test', data: { type: 'ps-footer-preview-design' } }),
    isTrustedPreviewMessage({ source: {}, origin: 'https://studio.test', data: { type: 'ps-footer-preview-design' } }),
    isTrustedPreviewMessage({ source: parent, origin: 'https://evil.test', data: { type: 'ps-footer-preview-design' } })
  ]`, context);
  assert.deepEqual(Array.from(context.result), [true, false, false]);
});

test('footer visibility token hides both shared footer surfaces', async () => {
  const footer = await read('public/ps-footer.js');
  assert.match(footer, /\.ps-footer\{[^}]*display:var\(--ps-footer-display\)/);
  assert.match(footer, /\.ps-brand-fixed\{[^}]*display:var\(--ps-footer-display\)/);
});

test('preview iframe is sandboxed and preview links cannot navigate it', async () => {
  const preview = await read('src/components/design/FooterPreview.tsx');
  const footer = await read('public/ps-footer.js');
  assert.match(preview, /sandbox="allow-scripts allow-same-origin"/);
  assert.match(footer, /previewConfig[\s\S]*addEventListener\('click'[\s\S]*preventDefault\(\)/);
});
