import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all declared Design Studio modes are accepted by the URL parser', async () => {
  const source = await read('src/lib/studioDesign.ts');
  for (const mode of ['page', 'resources', 'works', 'components', 'reviews', 'feedback']) {
    assert.match(source, new RegExp(`['\"]${mode}['\"]`));
  }
  assert.match(source, /export function parseStudioMode/);
});

test('design resolver distinguishes draft, saved, computed, and default values', async () => {
  const source = await read('src/lib/studioDesign.ts');
  assert.match(source, /source: 'draft'/);
  assert.match(source, /source: 'saved'/);
  assert.match(source, /source: 'computed'/);
  assert.match(source, /source: 'default'/);
  assert.doesNotMatch(source, /value \|\| '#000000'/);
});

test('site content uses explicit stable ids and preserves legacy lookup keys', async () => {
  const source = await read('public/site-content.js');
  assert.match(source, /data-ps-edit-id/);
  assert.match(source, /data-ps-design-id/);
  assert.match(source, /legacyKey/);
  assert.match(source, /legacyDesignKey/);
  assert.match(source, /legacy: !/);
  assert.match(source, /semanticIdentity/);
  const semanticBody = source.match(/function semanticIdentity\([\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(semanticBody, /index|sibling|nth/i);
  assert.doesNotMatch(semanticBody, /staticText|textContent|innerHTML/);
});

test('semantic ids are stable when an unrelated preceding sibling is inserted', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  assert.notEqual(block, '');
  const input = { explicit: 'about-purpose', durableParent: 'about', tag: 'p', immutableSemantic: '' };
  const context = { inputs: [{ ...input, legacyId: '/::P::4' }], result: [] };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  const before = context.result[0];
  context.inputs = [
    { explicit: 'unrelated-banner', durableParent: 'about', tag: 'p', immutableSemantic: '', legacyId: '/::P::4' },
    { ...input, legacyId: '/::P::5' },
  ];
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.equal(context.result[1].id, before.id);
  assert.equal(context.result[1].legacy, false);
});

test('duplicate semantic elements retain distinct legacy keys and resolve the second element', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  const base = { explicit: '', durableParent: '', tag: 'p', immutableSemantic: '' };
  const context = {
    inputs: [
      { ...base, legacyId: '/::P::4' },
      { ...base, legacyId: '/::P::5' },
    ],
    result: [],
  };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.equal(context.result[0].legacy, true);
  assert.equal(context.result[1].legacy, true);
  assert.equal(context.result[0].id, '/::P::4');
  assert.equal(context.result[1].id, '/::P::5');
  assert.notEqual(context.result[0].id, context.result[1].id);
  assert.match(source, /findByTextKey[\s\S]*data-ps-legacy-edit/);
});

test('changing source text never changes identity and un-authored text remains legacy', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  const context = { inputs: [{ explicit: '', durableParent: '', tag: 'p', immutableSemantic: '', staticText: '이전 문구', legacyId: '/::P::7' }], result: [] };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  const before = context.result[0];
  context.inputs = [{ ...context.inputs[0], staticText: '수정된 문구' }];
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.deepEqual(context.result[0], before);
  assert.equal(before.legacy, true);
  assert.equal(before.id, '/::P::7');
});

test('page element discovery waits for delayed design loading before exposing savedStyle', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-design-ready-start \*\/[\s\S]*?\/\* ps-design-ready-end \*\//)?.[0] || '';
  assert.notEqual(block, '');
  const context = { Promise, setTimeout, state: null };
  vm.runInNewContext(`${block}; state = createDesignReadiness();`, context);
  let settled = false;
  const pending = context.state.promise.then(() => { settled = true; });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(settled, false);
  context.state.markReady();
  await pending;
  assert.equal(settled, true);
  assert.match(source, /getElements:[\s\S]*designReadiness\.promise\.then/);
  assert.match(source, /loadedDesign[\s\S]*markReady/);
  assert.match(source, /catch[\s\S]*designReadiness\.markFailed/);
  const studio = await read('src/components/ContentStudio.tsx');
  assert.doesNotMatch(studio, /setTimeout\(refreshElements,\s*350\)/);
  assert.match(studio, /await studio\.getElements\(\)/);
  assert.match(studio, /busy=\{designBusy \|\| !designReady\}/);
});

test('design reset and migrating save cover stable and legacy keys transactionally', async () => {
  const migration = await read('supabase/migrations/0014_site_design_key_migration.sql');
  const studio = await read('src/components/ContentStudio.tsx');
  assert.match(migration, /admin_delete_site_design_keys/i);
  assert.match(migration, /key = any\(p_keys\)/i);
  assert.match(migration, /admin_save_site_design_migrating/i);
  assert.match(migration, /p_legacy_key/i);
  assert.match(studio, /selected\.designKey,\s*selected\.legacyDesignKey/);
  assert.match(studio, /adminSaveSiteDesignMigrating/);
});

test('deferred page A result cannot commit after page B becomes current', async () => {
  const { isCurrentPreviewRequest } = await import('../src/lib/studioDesign.ts');
  const deferred = () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
  };
  let generation = 1;
  let currentWindow = { page: 'A' };
  const a = deferred();
  const b = deferred();
  const committed = [];
  let saveEnabled = false;
  const load = async (request, pending) => {
    const result = await pending.promise;
    if (!isCurrentPreviewRequest(request, generation, currentWindow)) return;
    committed.push(result);
    saveEnabled = true;
  };
  const loadA = load({ generation, frameWindow: currentWindow }, a);
  generation = 2;
  currentWindow = { page: 'B' };
  saveEnabled = false;
  const loadB = load({ generation, frameWindow: currentWindow }, b);
  b.resolve('B');
  await loadB;
  a.resolve('A');
  await loadA;
  assert.deepEqual(committed, ['B']);
  assert.equal(saveEnabled, true);
  const studio = await read('src/components/ContentStudio.tsx');
  assert.match(studio, /loadGeneration/);
  assert.match(studio, /isCurrentPreviewRequest/);
  assert.match(studio, /frame\.current\?\.contentWindow/);
});

test('aria-label changes never create a stable identity or orphan an existing key', async () => {
  const source = await read('public/site-content.js');
  const block = source.match(/\/\* ps-identity-start \*\/[\s\S]*?\/\* ps-identity-end \*\//)?.[0] || '';
  const context = {
    inputs: [{ explicit: '', durableParent: '/about', tag: 'button', immutableSemantic: '', ariaLabel: '저장', legacyId: '/::BUTTON::8' }],
    result: [],
  };
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  const before = { ...context.result[0] };
  context.inputs = [{ ...context.inputs[0], ariaLabel: 'Save' }];
  vm.runInNewContext(`${block}; result = assignStableIdentities(inputs);`, context);
  assert.equal(context.result[0].id, before.id);
  assert.equal(context.result[0].legacy, true);
  const inputBody = source.match(/function elementIdentityInput\([\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(inputBody, /aria-label/);
});

test('inspector groups fields and exposes provenance, undo, reset, and save', async () => {
  const inspector = await read('src/components/design/DesignInspector.tsx');
  for (const label of ['Text', 'Typography', 'Fill', 'Stroke', 'Layout', 'Opacity']) {
    assert.match(inspector, new RegExp(label));
  }
  assert.match(inspector, /onUndo/);
  assert.match(inspector, /onReset/);
  assert.match(inspector, /onSave/);
  assert.match(inspector, /computedValue/);
  assert.match(inspector, /savedValue/);
  assert.match(inspector, /aria-expanded/);
});

test('color fields keep an empty override empty and expose a separate swatch', async () => {
  const field = await read('src/components/design/DesignField.tsx');
  assert.match(field, /type="color"/);
  assert.match(field, /type="text"/);
  assert.match(field, /HEX/i);
  assert.doesNotMatch(field, /placeholder=['"]#000000/);
});

test('page design keeps saved, computed, draft and history snapshots separate', async () => {
  const studio = await read('src/components/ContentStudio.tsx');
  for (const state of ['savedStyle', 'computedStyle', 'styleHistory']) assert.match(studio, new RegExp(`set${state[0].toUpperCase()}${state.slice(1)}`));
  assert.match(studio, /pushDraftHistory/);
  assert.match(studio, /undoDraft/);
  assert.match(studio, /<DesignInspector/);
});

test('iframe inspection exposes hover, persistent selection, badge, and keyboard activation', async () => {
  const source = await read('public/site-content.js');
  assert.match(source, /data-ps-studio-hovered/);
  assert.match(source, /data-ps-studio-selected/);
  assert.match(source, /ps-studio-object-badge/);
  assert.match(source, /keydown/);
  assert.match(source, /Enter/);
  assert.match(source, /['"] ['"]/);
});

test('reset tombstones bypass saved values and materialize a baseline preview', async () => {
  const { DESIGN_RESET, resolveDesignValue, materializeDesignValue } = await import('../src/lib/studioDesign.ts');
  const draft = { color: DESIGN_RESET, fontSize: '18px' };
  assert.deepEqual(resolveDesignValue('color', draft, { color: '#111111' }, { color: '#222222' }, { color: '#333333' }), { value: '#222222', source: 'computed' });
  assert.deepEqual(materializeDesignValue(draft), { fontSize: '18px' });
});

test('inspector uses runtime-supported visibility, alignment, and stroke style keys', async () => {
  const inspector = await read('src/components/design/DesignInspector.tsx');
  const studio = await read('src/components/ContentStudio.tsx');
  const footer = await read('src/components/FooterComponentManager.tsx');
  assert.doesNotMatch(inspector, /textVisible/);
  assert.match(inspector, /visibility/);
  assert.match(inspector, /textAlign/);
  assert.match(inspector, /borderStyle/);
  for (const key of ['visibility', 'textAlign', 'borderStyle']) assert.match(studio, new RegExp(key));
  assert.match(footer, /display/);
});

test('inspector provenance visibly names draft, saved, computed, and default layers', async () => {
  const field = await read('src/components/design/DesignField.tsx');
  for (const label of ['편집', '저장', '계산', '기본']) assert.match(field, new RegExp(label));
  assert.match(field, /defaultValue/);
  const footer = await read('src/components/FooterComponentManager.tsx');
  assert.match(footer, /computed=\{\{\}\}/);
});

test('footer operation failures are alerts while progress and success are statuses', async () => {
  const footer = await read('src/components/FooterComponentManager.tsx');
  assert.match(footer, /statusKind/);
  assert.match(footer, /role=\{statusKind === 'error' \? 'alert' : 'status'\}/);
  assert.match(footer, /setStatusKind\('error'\)/);
  assert.match(footer, /setStatusKind\('success'\)/);
});

test('additive migration allows page visibility, text alignment, and border style values', async () => {
  const migration = await read('supabase/migrations/0015_site_design_extended_properties.sql');
  for (const key of ['visibility', 'textAlign', 'borderStyle']) assert.match(migration, new RegExp(key));
  assert.match(migration, /visible\|hidden/);
  assert.match(migration, /left\|center\|right/);
  assert.match(migration, /solid\|dashed\|dotted\|none/);
});

test('component reset keys and changed values are applied by one atomic RPC', async () => {
  const migration = await read('supabase/migrations/0016_atomic_component_design_apply.sql');
  assert.match(migration, /admin_apply_component_design/);
  assert.match(migration, /p_reset_properties text\[\]/);
  assert.match(migration, /p_values jsonb/);
  assert.match(migration, /delete from public\.component_design[\s\S]*perform public\.admin_save_component_design/);
  assert.doesNotMatch(migration, /exception\s+when/i);
  assert.match(migration, /delete from public\.component_design as cd/);
  assert.match(migration, /cd\.component_key = p_component_key/);
  assert.match(migration, /cd\.property = any/);
  assert.match(migration, /foreach v_property in array/);
  assert.doesNotMatch(migration, /foreach property in array/);
  const manager = await read('src/components/FooterComponentManager.tsx');
  assert.match(manager, /adminApplyComponentDesign/);
  assert.doesNotMatch(manager, /Promise\.all\(resetKeys/);
});

test('site design validator accepts safe values and rejects malformed CSS', async () => {
  const { validateSiteDesignValue } = await import('../src/lib/studioDesign.ts');
  const accepted = [
    ['color', '#FFB11A'], ['backgroundColor', 'rgba(0,0,0,.82)'], ['fontFamily', "'Montserrat','Pretendard Variable',sans-serif"],
    ['fontSize', '16px'], ['margin', '-4px 8px'], ['padding', '4px 12px'], ['opacity', '.65'], ['fontWeight', '600'],
    ['visibility', 'hidden'], ['textAlign', 'center'], ['borderStyle', 'dashed'],
  ];
  const rejected = [
    ['color', 'red;display:none'], ['fontFamily', 'Arial;url(x)'], ['fontSize', '-2px'], ['padding', '-1px'],
    ['opacity', '1.5'], ['fontWeight', '950'], ['visibility', 'collapse'], ['textAlign', 'justify'], ['borderStyle', 'double'],
  ];
  for (const [key, value] of accepted) assert.equal(validateSiteDesignValue(key, value), true, `${key}: ${value}`);
  for (const [key, value] of rejected) assert.equal(validateSiteDesignValue(key, value), false, `${key}: ${value}`);
  const migration = await read('supabase/migrations/0015_site_design_extended_properties.sql');
  for (const property of ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'margin', 'borderRadius', 'borderColor', 'borderWidth', 'opacity']) assert.match(migration, new RegExp(`v_property[^\\n]*${property}|${property}[^\\n]*v_property`));
});

test('footer draft history uses a pure reducer without nested state updates', async () => {
  const manager = await read('src/components/FooterComponentManager.tsx');
  assert.match(manager, /useReducer/);
  assert.match(manager, /function designStateReducer/);
  assert.doesNotMatch(manager, /setDraft\([\s\S]{0,220}setHistory/);
});

test('visibility toggles use explicit on and off values while reset stays separate', async () => {
  const { isDesignToggleChecked } = await import('../src/lib/studioDesign.ts');
  const inspector = await read('src/components/design/DesignInspector.tsx');
  const field = await read('src/components/design/DesignField.tsx');
  assert.match(inspector, /onValue: 'visible'/);
  assert.match(inspector, /offValue: 'hidden'/);
  assert.match(inspector, /onValue: 'flex'/);
  assert.match(inspector, /offValue: 'none'/);
  assert.match(field, /definition\.onValue/);
  assert.match(field, /isDesignToggleChecked\(resolved\.value, definition\.offValue/);
  assert.equal(isDesignToggleChecked('hidden', 'hidden'), false);
  assert.equal(isDesignToggleChecked('visible', 'hidden'), true);
  assert.equal(isDesignToggleChecked('flex', 'none'), true);
});

test('invalid HEX input reports an inline error and reverts to the resolved value', async () => {
  const field = await read('src/components/design/DesignField.tsx');
  assert.match(field, /setColorError/);
  assert.match(field, /올바른 6자리 HEX/);
  assert.match(field, /setColorDraft\(resolved\.value\)/);
  assert.match(field, /aria-invalid/);
  assert.match(field, /role="alert"/);
});
