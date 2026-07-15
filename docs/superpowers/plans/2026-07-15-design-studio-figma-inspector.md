# Design Studio Figma-style Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reliable Figma-style Design Studio inspector with non-destructive shared-footer editing, a real live component preview, stable page-object identity, and verified local-development safety.

**Architecture:** Extract pure design-state and mode helpers so value provenance, draft history, and parsing can be tested outside React. Keep the existing three-column `ContentStudio` shell, use the real iframe/page runtime for page objects, and give the footer manager its own preview stage driven by the same `ps-footer.js` runtime and CSS tokens used in production. Add an additive Supabase migration for property-level component upserts and deletes rather than rewriting an already-applied migration.

**Tech Stack:** Astro 7, React 19, TypeScript, browser JavaScript, Supabase PostgreSQL/RPC, Node.js built-in test runner, CSS custom properties.

## Global Constraints

- Preserve the left workspace navigation, central preview, and right inspector structure.
- Use explicit stable `data-ps-edit-id` and `data-ps-design-id` values for new saves; index-derived keys are legacy read fallbacks only.
- Show default, computed, saved, and draft value provenance without treating an empty color as black.
- Disable component save until persisted values finish loading.
- Partial component edits and resets must preserve unrelated properties.
- Render shared-footer previews with the production `public/ps-footer.js` implementation, not a duplicate mock footer.
- All exposed footer properties must visibly affect descendants through CSS custom properties.
- Do not add canvas pan/zoom, arbitrary dragging, absolute-position controls, or general vector/layer tooling.
- Local hosts `localhost`, `127.0.0.1`, and `[::1]` must never call `bump_visit`.
- Follow RED-GREEN-REFACTOR: observe each focused test fail for the intended reason before production edits.
- Preserve unrelated worktree changes in `public/reviews.js` and `docs/USABILITY_REVIEW_2026-07-15.md`.

---

## File Map

- Create `src/lib/studioDesign.ts`: pure mode parsing, design-value resolution, draft history, and dimensional-value helpers.
- Create `src/components/design/DesignInspector.tsx`: grouped Figma-style page-object inspector controls.
- Create `src/components/design/DesignField.tsx`: color, numeric/unit, select, and opacity field primitives.
- Create `src/components/design/FooterPreview.tsx`: component stage controls and real footer preview iframe.
- Create `public/footer-preview.html`: controlled page-context host that loads `ps-footer.js`.
- Create `supabase/migrations/0013_component_design_property_updates.sql`: additive non-destructive component design RPCs.
- Create `test/studio-design.test.mjs`: pure helper and source-contract behavior tests.
- Modify `src/components/ContentStudio.tsx`: auth hydration, complete deep-link parsing, stable selection data, inspector integration, and accessible statuses.
- Modify `src/components/FooterComponentManager.tsx`: initial load, draft/saved state, preview, partial save/reset, and grouped inspector integration.
- Modify `src/lib/adminPw.ts`: public component load and property-delete wrappers.
- Modify `public/site-content.js`: stable identifiers, legacy fallback reads, selection metadata, computed/saved design payloads.
- Modify `public/ps-footer.js`: comprehensive CSS token consumption and preview configuration support.
- Modify `public/visitor-counter.js`: local-host mutation guard.
- Modify `src/pages/admin/components.astro`: three-column component workspace, inspector sections, controls, selection, viewport, and responsive styling.
- Modify `test/component-design-reviews.test.mjs`: RPC and footer-runtime behavior contracts.
- Modify `test/visitor-counter.test.mjs`: execute the script on local and production-like hosts.

---

### Task 1: Non-destructive data and platform reliability

**Files:**
- Create: `src/lib/studioDesign.ts`
- Create: `supabase/migrations/0013_component_design_property_updates.sql`
- Create: `test/studio-design.test.mjs`
- Modify: `src/lib/adminPw.ts`
- Modify: `src/components/ContentStudio.tsx`
- Modify: `public/site-content.js`
- Modify: `public/visitor-counter.js`
- Modify: `test/component-design-reviews.test.mjs`
- Modify: `test/visitor-counter.test.mjs`

**Interfaces:**
- Produces: `parseStudioMode(search: string): StudioMode`.
- Produces: `resolveDesignValue(property, draft, saved, computed, defaults): ResolvedDesignValue`.
- Produces: `pushDraftHistory(history, next, limit?): DesignValue[]` and `undoDraft(history): { history; value }`.
- Produces: `listComponentDesign(componentKey): Promise<Record<string,string>>`.
- Produces: `adminDeleteComponentDesignProperty(pw, componentKey, property): Promise<void>`.
- Produces: RPC `admin_save_component_design` with property-level upsert semantics and RPC `admin_delete_component_design_property`.
- Produces: preview element payload `{ key, legacyKey, designKey, legacyDesignKey, label, html, computedStyle, savedStyle }`.
- Consumes: existing `sbRpc`, administrator password RPC validation, `site_content`, and `site_design` data.

- [ ] **Step 1: Write failing pure-helper and deep-link tests**

Create `test/studio-design.test.mjs` using the repository's source-contract pattern:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
});
```

- [ ] **Step 2: Write failing database non-destructive-save tests**

Append to `test/component-design-reviews.test.mjs`:

```js
test('component design migration upserts properties without deleting siblings', async () => {
  const migration = await read('supabase/migrations/0013_component_design_property_updates.sql');
  const saveBody = migration.match(/create or replace function public\.admin_save_component_design[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(saveBody, /on conflict\s*\(component_key,\s*property\)\s*do update/i);
  assert.doesNotMatch(saveBody, /delete from public\.component_design/i);
  assert.match(migration, /admin_delete_component_design_property/i);
});
```

- [ ] **Step 3: Write a failing localhost visitor test and observe RED**

Extend the existing VM/fetch harness in `test/visitor-counter.test.mjs` so it records requested URLs, then add:

```js
test('localhost and loopback hosts never increment production visits', async () => {
  for (const hostname of ['localhost', '127.0.0.1', '::1']) {
    const calls = await executeCounter({ hostname, pathname: '/admin/' });
    assert.equal(calls.some((url) => url.endsWith('/bump_visit')), false);
  }
});
```

Run:

```bash
node --test test/studio-design.test.mjs test/component-design-reviews.test.mjs test/visitor-counter.test.mjs
```

Expected: FAIL because `studioDesign.ts` and migration `0013` do not exist and localhost currently calls `bump_visit`.

- [ ] **Step 4: Implement pure studio helpers**

Create `src/lib/studioDesign.ts` with these exact public types and functions:

```ts
export type StudioMode = 'page' | 'resources' | 'works' | 'components' | 'reviews' | 'feedback';
export type DesignValue = Record<string, string>;
export type ValueSource = 'draft' | 'saved' | 'computed' | 'default' | 'empty';
export type ResolvedDesignValue = { value: string; source: ValueSource };

const MODES = new Set<StudioMode>(['page', 'resources', 'works', 'components', 'reviews', 'feedback']);

export function parseStudioMode(search: string): StudioMode {
  const value = new URLSearchParams(search).get('mode') as StudioMode | null;
  return value && MODES.has(value) ? value : 'page';
}

export function resolveDesignValue(
  property: string,
  draft: DesignValue,
  saved: DesignValue,
  computed: DesignValue,
  defaults: DesignValue,
): ResolvedDesignValue {
  if (Object.hasOwn(draft, property)) return { value: draft[property], source: 'draft' };
  if (Object.hasOwn(saved, property)) return { value: saved[property], source: 'saved' };
  if (Object.hasOwn(computed, property)) return { value: computed[property], source: 'computed' };
  if (Object.hasOwn(defaults, property)) return { value: defaults[property], source: 'default' };
  return { value: '', source: 'empty' };
}

export function pushDraftHistory(history: DesignValue[], next: DesignValue, limit = 30): DesignValue[] {
  return [...history, { ...next }].slice(-limit);
}

export function undoDraft(history: DesignValue[]): { history: DesignValue[]; value: DesignValue } {
  if (history.length <= 1) return { history, value: { ...(history[0] || {}) } };
  return { history: history.slice(0, -1), value: { ...history[history.length - 2] } };
}
```

- [ ] **Step 5: Implement additive property-level component RPCs**

Create migration `0013_component_design_property_updates.sql`. Retain the existing allowed-property whitelist, validate values as text, and replace the save body with an upsert over `jsonb_each_text(p_values)`:

```sql
insert into public.component_design(component_key, property, value)
select p_component_key, entry.key, to_jsonb(entry.value)
from jsonb_each_text(coalesce(p_values, '{}'::jsonb)) as entry
on conflict (component_key, property)
do update set value = excluded.value, updated_at = now();
```

Add:

```sql
create or replace function public.admin_delete_component_design_property(
  p_pw text,
  p_component_key text,
  p_property text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception 'unauthorized'; end if;
  delete from public.component_design
  where component_key = p_component_key and property = p_property;
end;
$$;

revoke all on function public.admin_delete_component_design_property(text, text, text) from public;
grant execute on function public.admin_delete_component_design_property(text, text, text) to anon, authenticated;
```

- [ ] **Step 6: Add component load/delete wrappers**

In `src/lib/adminPw.ts`, add:

```ts
export async function listComponentDesign(componentKey: string): Promise<ComponentDesignValues> {
  const rows = (await sbRpc<Array<{ property: string; value: string }>>('list_component_design', {
    p_component_key: componentKey,
  })) || [];
  return Object.fromEntries(rows.map(({ property, value }) => [property, value]));
}

export async function adminDeleteComponentDesignProperty(
  pw: string,
  componentKey: string,
  property: string,
) {
  await sbRpc('admin_delete_component_design_property', {
    p_pw: pw,
    p_component_key: componentKey,
    p_property: property,
  });
}
```

- [ ] **Step 7: Fix auth hydration and mode parsing**

In `ContentStudio.tsx`, replace render-time `getAdminPw()` with `password` and `authReady` state initialized identically on server and client:

```tsx
const [authReady, setAuthReady] = useState(false);
const [password, setPassword] = useState<string | null>(null);
const [mode, setMode] = useState<StudioMode>('page');

useEffect(() => {
  setPassword(getAdminPw());
  setMode(parseStudioMode(window.location.search));
  setAuthReady(true);
}, []);

if (!authReady) return <main className="cs-lock" aria-busy="true">Design Studio 불러오는 중…</main>;
if (!password) return <main className="cs-lock"><strong>관리자 로그인이 필요합니다.</strong><a href="/admin/">관리자 로그인으로 이동 →</a></main>;
```

Import `StudioMode` and `parseStudioMode` from `studioDesign.ts` and remove the local `StudioMode` declaration.

- [ ] **Step 8: Add stable page-object IDs with legacy fallback**

In `public/site-content.js`:

- Prefer authored `data-ps-edit-id`/`data-ps-design-id` values.
- Generate deterministic stable IDs only from an authored ancestor plus semantic tag/role/name; keep old tag/index keys as `legacyKey` and `legacyDesignKey`.
- When loading content/design, look up the stable key first and the legacy key second.
- Return both keys plus computed styles in `getElements()`.
- Include stable keys and computed/saved style maps in `ps-content-studio-selected`.
- New `saveText`, `previewStyle`, and design saves use the stable key.

Use the payload contract:

```js
{
  key: stableContentKey,
  legacyKey: oldContentKey,
  designKey: path() + '::' + stableDesignId,
  legacyDesignKey: path() + '::' + oldDesignId,
  label: labelOf(el),
  html: el.innerHTML,
  computedStyle: pickComputedStyle(getComputedStyle(el)),
  savedStyle: loadedDesign[stableDesignKey] || loadedDesign[legacyDesignKey] || {}
}
```

Do not assign a DOM-index value to `data-ps-edit-id` or `data-ps-design-id`.

- [ ] **Step 9: Block production visit mutations on local hosts**

In `public/visitor-counter.js`, after the singleton guard and before `run()` can be registered, add:

```js
var LOCAL_HOSTS = { localhost: true, '127.0.0.1': true, '::1': true };
if (LOCAL_HOSTS[location.hostname]) return;
```

The script should not perform either counter mutation or scoped-total fetch locally.

- [ ] **Step 10: Run focused tests, refactor, and commit**

Run:

```bash
node --test test/studio-design.test.mjs test/component-design-reviews.test.mjs test/visitor-counter.test.mjs
npm run build
```

Expected: all focused tests PASS; Astro builds 11 pages without TypeScript errors. Existing chunk-size warnings are acceptable.

Commit only Task 1 files:

```bash
git add src/lib/studioDesign.ts src/lib/adminPw.ts src/components/ContentStudio.tsx public/site-content.js public/visitor-counter.js supabase/migrations/0013_component_design_property_updates.sql test/studio-design.test.mjs test/component-design-reviews.test.mjs test/visitor-counter.test.mjs
git commit -m "fix: make Design Studio persistence non-destructive"
```

---

### Task 2: Footer runtime tokens and real component preview

**Files:**
- Create: `src/components/design/FooterPreview.tsx`
- Create: `public/footer-preview.html`
- Modify: `public/ps-footer.js`
- Modify: `src/components/FooterComponentManager.tsx`
- Modify: `src/pages/admin/components.astro`
- Modify: `test/component-design-reviews.test.mjs`

**Interfaces:**
- Consumes: `listComponentDesign`, `adminSaveComponentDesign`, and `adminDeleteComponentDesignProperty` from Task 1.
- Produces: `FooterPreview({ values, context, viewport })` with `values: Record<string,string>`, `context: FooterContext`, `viewport: 'desktop'|'mobile'`.
- Produces: preview messaging `{ type: 'ps-footer-preview-design', values }`.
- Produces: CSS properties `--ps-footer-primary`, `--ps-footer-color`, `--ps-footer-muted`, `--ps-footer-bg`, `--ps-footer-border`, `--ps-footer-font-family`, `--ps-footer-font-size`, `--ps-footer-font-weight`, `--ps-footer-line-height`, `--ps-footer-letter-spacing`, `--ps-footer-padding`, `--ps-footer-gap`, `--ps-footer-radius`, and `--ps-footer-opacity`.

- [ ] **Step 1: Write failing footer-token and preview-runtime tests**

Append to `test/component-design-reviews.test.mjs`:

```js
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
```

Run:

```bash
node --test test/component-design-reviews.test.mjs
```

Expected: FAIL because the preview host is missing and hard-coded descendant colors remain.

- [ ] **Step 2: Normalize the footer runtime to tokens**

In `public/ps-footer.js`:

- Define defaults on the footer host once.
- Replace descendant hard-coded colors, font metrics, spacing, radius, border, and opacity with the corresponding `var(--ps-footer-..., fallback)` token.
- Map database properties to the token list above.
- Use separate `color` and `primaryColor` mapping if both are exposed; label them clearly in the manager.
- Listen for preview updates:

```js
window.addEventListener('message', function (event) {
  if (event.origin !== location.origin || event.data?.type !== 'ps-footer-preview-design') return;
  applyComponentDesign(Object.entries(event.data.values || {}).map(function (entry) {
    return { property: entry[0], value: entry[1] };
  }));
});
```

In preview mode, use `window.__psFooterPreviewConfig` to control page path, feature visibility, and avoid unrelated production writes.

- [ ] **Step 3: Build the real preview host**

Create `public/footer-preview.html` with a restrained near-black/paper context stage, a `#ps-footer` host expected by the runtime, the production footer script, and a same-origin message listener. Initialize from query parameters:

```html
<script>
  const params = new URLSearchParams(location.search);
  window.__psFooterPreviewConfig = {
    enabled: true,
    context: params.get('context') || 'home',
  };
  addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.data?.type !== 'ps-footer-preview-design') return;
    window.dispatchEvent(new MessageEvent('message', { data: event.data, origin: event.origin }));
  });
</script>
<script src="/ps-footer.js"></script>
```

Ensure the forwarding design does not recursively redispatch the same message; either let `ps-footer.js` listen directly or mark forwarded events. The final implementation must have exactly one application per parent message.

- [ ] **Step 4: Create the React preview stage**

Create `FooterPreview.tsx`:

```tsx
export type FooterContext = 'home' | 'atlas' | 'geoweb' | 'spell';
export type FooterViewport = 'desktop' | 'mobile';

export default function FooterPreview({ values }: { values: Record<string, string> }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [context, setContext] = useState<FooterContext>('home');
  const [viewport, setViewport] = useState<FooterViewport>('desktop');

  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      { type: 'ps-footer-preview-design', values },
      location.origin,
    );
  }, [values, context]);

  return /* labeled context buttons, viewport buttons, and same-origin iframe */;
}
```

The iframe `src` is `/footer-preview.html?context=${context}` and its wrapper switches between full width and a 390px mobile width. On iframe load, resend current values.

- [ ] **Step 5: Load values and preserve drafts in FooterComponentManager**

Refactor `FooterComponentManager.tsx` to maintain:

```ts
const [saved, setSaved] = useState<DesignValue>({});
const [draft, setDraft] = useState<DesignValue>({});
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState('');
```

On mount, call `listComponentDesign('footer')`, set both snapshots, and only then enable Save. Updating a control merges into `draft`. Saving passes the changed-property delta to the property-upsert RPC, then promotes the merged draft to `saved`. Property reset calls `adminDeleteComponentDesignProperty` and removes only that key. Full reset continues to use `adminDeleteComponentDesign` after confirmation.

Render `<FooterPreview values={draft} />` beside the manager inspector. Status uses `role="status" aria-live="polite"`; load errors use `role="alert"`.

- [ ] **Step 6: Add component-workspace styling**

In `components.astro`, add named classes for:

- `.cs-component-workspace`: two-column preview/inspector inside the manager region.
- `.cs-footer-stage`: flexible centered preview surface.
- `.cs-viewport-switch` and `.cs-context-switch`: compact segmented controls.
- `.cs-footer-frame.mobile`: fixed 390px width with max-width 100%.
- Responsive collapse to preview above inspector below 900px.

Reuse existing color variables, 4/8px spacing, rounded panels, and visible amber focus states.

- [ ] **Step 7: Run focused tests, build, and commit**

Run:

```bash
node --test test/component-design-reviews.test.mjs test/studio-design.test.mjs
npm run build
```

Expected: all tests PASS and `/footer-preview.html` is copied to `dist`.

Commit:

```bash
git add public/ps-footer.js public/footer-preview.html src/components/design/FooterPreview.tsx src/components/FooterComponentManager.tsx src/pages/admin/components.astro test/component-design-reviews.test.mjs
git commit -m "feat: add live shared-footer design preview"
```

---

### Task 3: Figma-style grouped inspector and precise interaction states

**Files:**
- Create: `src/components/design/DesignField.tsx`
- Create: `src/components/design/DesignInspector.tsx`
- Modify: `src/components/ContentStudio.tsx`
- Modify: `src/components/FooterComponentManager.tsx`
- Modify: `public/site-content.js`
- Modify: `src/pages/admin/components.astro`
- Modify: `test/studio-design.test.mjs`

**Interfaces:**
- Consumes: Task 1's `resolveDesignValue`, `pushDraftHistory`, `undoDraft`, `DesignValue`, and enriched `StudioElement` payload.
- Produces: `DesignField({ definition, resolved, computedValue, savedValue, onChange, onReset })`.
- Produces: `DesignInspector({ selected, draft, saved, computed, defaults, history, busy, onChange, onUndo, onReset, onSave })`.
- Produces: grouped field definition with sections `text`, `typography`, `fill`, `stroke`, `layout`, and `opacity`.

- [ ] **Step 1: Write failing grouped-inspector and interaction tests**

Append to `test/studio-design.test.mjs`:

```js
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
});

test('color fields keep an empty override empty and expose a separate swatch', async () => {
  const field = await read('src/components/design/DesignField.tsx');
  assert.match(field, /type="color"/);
  assert.match(field, /type="text"/);
  assert.match(field, /HEX/i);
  assert.doesNotMatch(field, /placeholder=['"]#000000/);
});
```

Run:

```bash
node --test test/studio-design.test.mjs
```

Expected: FAIL because the inspector and field components do not exist.

- [ ] **Step 2: Implement field definitions and DesignField**

Create `DesignField.tsx` with discriminated definitions:

```ts
export type DesignFieldDefinition = {
  key: string;
  label: string;
  kind: 'text' | 'number-unit' | 'color' | 'select' | 'opacity' | 'toggle';
  units?: readonly string[];
  options?: readonly { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
};
```

For colors, render a visual swatch/color input only when the resolved value is a valid six-digit HEX; always render a separate labeled HEX text input. Use a neutral checker/empty swatch when no override exists. Normalize accepted HEX to uppercase on blur but preserve in-progress typing.

For dimensions, parse `number + unit`, show a number input and explicit supported-unit select, and recombine them through `onChange`. For opacity, synchronize number and range inputs from `0` to `1` with step `0.05`.

Below each control, show provenance text such as `저장됨 16px · 현재 18px`; never use placeholder text as provenance.

- [ ] **Step 3: Implement grouped DesignInspector**

Create `DesignInspector.tsx` with explicit section definitions:

```ts
const SECTIONS = [
  { id: 'text', label: 'Text', fields: ['textVisible'] },
  { id: 'typography', label: 'Typography', fields: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'color'] },
  { id: 'fill', label: 'Fill', fields: ['backgroundColor'] },
  { id: 'stroke', label: 'Stroke', fields: ['borderColor', 'borderWidth', 'borderStyle'] },
  { id: 'layout', label: 'Layout', fields: ['padding', 'margin', 'borderRadius'] },
  { id: 'opacity', label: 'Opacity', fields: ['opacity'] },
] as const;
```

Render only fields applicable to the selected element. Section buttons expose `aria-expanded`; action buttons have text labels/tooltips. The header displays object label, stable design ID, element type, and an `변경됨` badge when dirty. Save is disabled when `busy` or not dirty. Undo is disabled when history contains fewer than two snapshots.

- [ ] **Step 4: Wire live preview and history into ContentStudio**

Expand `StudioElement` to include stable/legacy keys and computed/saved styles. On selection:

```ts
setSavedStyle(element.savedStyle || {});
setComputedStyle(element.computedStyle || {});
setDraftStyle(element.savedStyle || {});
setStyleHistory([element.savedStyle || {}]);
```

On update, push a history snapshot, update the draft, and call `previewStyle`. Undo uses `undoDraft`, restores the previous map, and applies it to the preview. A failed save leaves all snapshots and draft values untouched. A successful save promotes `draftStyle` to `savedStyle` and resets history to one snapshot.

Replace the flat `STYLE_FIELDS` markup with `DesignInspector`. Keep the text-content editor but place it in the Text section or immediately above the design sections with the same header/action language.

Set `role="status" aria-live="polite"` on normal status and `role="alert"` when the current status represents an error.

- [ ] **Step 5: Add selection affordances inside the iframe**

In `site-content.js`, give hovered targets a temporary class and selected targets a persistent class. Inject editor-only CSS:

```css
[data-ps-studio-hovered] { outline: 1px dashed rgba(255,177,26,.75) !important; outline-offset: 3px; }
[data-ps-studio-selected] { outline: 2px solid #FFB11A !important; outline-offset: 3px; }
.ps-studio-object-badge { position: fixed; z-index: 2147483647; /* compact amber label */ }
```

The badge text comes from the element label and stable ID. Remove hover state on pointer leave and selection/badge when inspection is disabled or the page changes. Selection must still work by keyboard (`tabindex` only during inspect mode, Enter/Space selects).

- [ ] **Step 6: Reuse the inspector controls for the footer manager**

Adapt `FooterComponentManager` to pass footer-specific applicable fields and defaults into `DesignInspector`. Component changes update the real preview immediately. Preserve component-specific property reset through `adminDeleteComponentDesignProperty` and full reset through the existing explicit action.

Do not expose page-only margin/text-content fields if the footer runtime cannot consume them.

- [ ] **Step 7: Implement polished inspector CSS**

In `components.astro`:

- Use 8px section rhythm and 4px internal control gaps.
- Add restrained 10–14px panel radii and 6–8px control radii.
- Make section headers sticky only within the inspector if they do not cover controls.
- Style provenance labels at readable contrast, not lower than the existing muted-text contrast.
- Add precise hover, focus-visible, selected, disabled, dirty, saving, and error states.
- Keep desktop inspector width usable for paired number/unit controls; stack fields on narrow screens.
- Do not introduce gradients or decorative effects unrelated to control hierarchy.

- [ ] **Step 8: Run focused tests, build, and commit**

Run:

```bash
node --test test/studio-design.test.mjs test/component-design-reviews.test.mjs
npm run build
```

Expected: all tests PASS and Astro compiles the new React components without hydration warnings in the generated output.

Commit:

```bash
git add src/lib/studioDesign.ts src/components/design/DesignField.tsx src/components/design/DesignInspector.tsx src/components/ContentStudio.tsx src/components/FooterComponentManager.tsx public/site-content.js src/pages/admin/components.astro test/studio-design.test.mjs
git commit -m "feat: add Figma-style Design Studio inspector"
```

---

### Task 4: Authenticated integration verification and release readiness

**Files:**
- Modify if required by verified defects: files owned by Tasks 1–3 only.
- Test: `test/*.test.mjs`
- Verify: `docs/superpowers/specs/2026-07-15-design-studio-figma-inspector-design.md`

**Interfaces:**
- Consumes: all Task 1–3 UI, RPC, runtime, and test interfaces.
- Produces: verified commit series ready to merge/push; no new feature surface.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
node --test test/*.test.mjs
npm run build
```

Expected: every Node test PASS; Astro reports 11 pages built successfully. Record but do not expand scope for the known >500 kB chunk warning.

- [ ] **Step 2: Start an isolated local preview and check console health**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 4322
```

Open `/admin/components/?mode=components`, reload while already authenticated, and verify:

- no React hydration mismatch;
- component values show a loading state before controls enable;
- no request to `/rpc/bump_visit` appears on localhost;
- no unhandled console error appears.

If the chosen port is occupied, reuse the existing verified server only after confirming it serves the current worktree commit.

- [ ] **Step 3: Verify page inspector behavior**

On `/admin/components/`:

1. Select a page object in the iframe and confirm outline, badge, stable ID, and applicable grouped sections.
2. Confirm a stylesheet-derived font/color appears as computed, not blank or false black.
3. Change one dimensional value and one color; verify immediate preview.
4. Undo once and verify only the last draft snapshot reverts.
5. Save, reload, and verify persistence under the stable key.
6. Reset and verify default/computed rendering returns.
7. Insert no permanent test content; restore any existing row changed during verification.

- [ ] **Step 4: Verify component editing and Supabase preservation**

On `?mode=components`:

1. Confirm current component values load before Save enables.
2. Record two existing properties or create two reversible test properties.
3. Change only one property and save.
4. Query `list_component_design('footer')`; verify the unchanged property still exists.
5. Switch Home/ATLAS/GeoWeb/Spell contexts and desktop/mobile viewports; verify the draft persists and visible styling follows it.
6. Reset one property and query again; verify sibling properties remain.
7. Restore the initial component-design record set exactly.

⚠ The `0013` migration must be applied to the connected Supabase project before this live RPC verification. If the CLI/project link is unavailable, report this single external step instead of claiming the live save passed.

- [ ] **Step 5: Verify navigation and accessibility basics**

- Directly load `?mode=resources` and `?mode=works`; confirm the correct workspace opens.
- Navigate selectable preview objects by keyboard and select with Enter/Space.
- Confirm inspector sections announce expanded/collapsed state.
- Trigger a reversible save and confirm live status announcement is present.
- Check component/review empty states for explanatory text.

- [ ] **Step 6: Fix only defects found by verification and rerun evidence**

For every defect, add or strengthen a failing automated test first, observe RED, make the minimal fix, then rerun:

```bash
node --test test/*.test.mjs
npm run build
```

Expected: all PASS. Do not fold unrelated review-page or usability-document changes into fixes.

- [ ] **Step 7: Commit verification fixes, if any**

If code changed:

Review `git diff --name-only`, then stage only the affected paths from this fixed set:

```bash
git add src/lib/studioDesign.ts src/lib/adminPw.ts src/components/ContentStudio.tsx src/components/FooterComponentManager.tsx src/components/design/DesignField.tsx src/components/design/DesignInspector.tsx src/components/design/FooterPreview.tsx public/site-content.js public/ps-footer.js public/footer-preview.html public/visitor-counter.js src/pages/admin/components.astro test/studio-design.test.mjs test/component-design-reviews.test.mjs test/visitor-counter.test.mjs
git commit -m "fix: resolve Design Studio integration defects"
```

If no code changed, do not create an empty commit.

- [ ] **Step 8: Final review gate**

Request a fresh code review against the design spec. Resolve all correctness, data-loss, accessibility, and visual-consistency findings. Re-run the complete test/build commands after the last change and record the exact commit SHA used for browser verification.
