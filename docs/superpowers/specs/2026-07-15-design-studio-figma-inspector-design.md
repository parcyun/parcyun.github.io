# Design Studio Figma-style Inspector Design

**Date:** 2026-07-15
**Status:** Approved direction (Approach A)

## 1. Goal

Keep Design Studio's existing three-column structure while making page-object and shared-component design editing behave like a focused Figma inspector: the user selects a real object in the preview, sees trustworthy current and saved values, changes them with precise controls, previews the result immediately, and saves or resets without losing unrelated properties.

This iteration also closes the reliability defects found during the live usability review: destructive component saves, footer tokens that do not affect child elements, unstable object IDs, ignored workspace deep links, hydration mismatch, and production visitor counting from localhost.

## 2. Scope

### Included

- Preserve the left workspace navigation, central page preview, and right inspector.
- Add visible selection state and object identity in the preview.
- Reorganize the inspector into Text, Typography, Fill, Stroke, Layout, and Opacity sections.
- Show the difference between browser-computed, product-default, persisted, and currently edited values.
- Add field-appropriate controls: number steppers, unit selectors, color swatches with HEX input, visibility toggles, and reset actions.
- Apply edits to the preview immediately, with undo before persistence and explicit Save and Reset actions.
- Add a dedicated shared-footer component preview with page-context and desktop/mobile viewport switches.
- Load all persisted component values before enabling save and preserve untouched values on partial edits.
- Make every exposed footer token drive the actual rendered footer.
- Introduce stable explicit IDs for editable text and design targets, with compatibility fallback for existing index-based records.
- Fix `resources` and `works` deep links, server/client authentication hydration, and localhost visitor counting.
- Add accessible live status and empty-state messaging where affected.

### Not included

- Freeform canvas pan and zoom.
- Arbitrary drag placement or absolute positioning.
- General-purpose vector, layer, or component-authoring tools.
- Expanding component design beyond the current shared footer.
- Migrating development to a separate Supabase project in this iteration; localhost visitor writes are blocked as the minimum safety fix.

## 3. Information Architecture

The Design Studio keeps one shell:

1. **Workspace navigation** — page, resources, works, component design, reviews, and feedback.
2. **Preview workspace** — the actual page or a purpose-built component stage.
3. **Property inspector** — selection metadata, grouped controls, save state, and history actions.

Page design and component design share interaction patterns but use separate adapters. The page adapter targets an element inside the page preview. The component adapter targets a known component key (`footer`) and renders it in a controlled preview stage.

## 4. Page-object Editing

### Selection

- Hovering an editable object draws a subtle amber outline.
- Clicking selects the object and leaves a persistent outline with a compact object-name badge.
- Selection is keyed by an explicit `data-ps-edit-id` and/or `data-ps-design-id`.
- A generated tag/index key is accepted only as a legacy lookup fallback. New saves use the stable ID.
- If an element has no stable ID, the editor may derive a deterministic path from an explicitly identified parent, but it must flag the target as legacy rather than silently writing a new index key.

### Inspector header

The header shows:

- Human-readable name.
- Stable ID.
- Element type.
- Whether changes are unsaved.
- Undo, Reset, and Save actions.

Save remains disabled until authentication is ready, data loading is complete, and the draft differs from the persisted state.

### Property sections

- **Text:** editable text content where supported and text visibility.
- **Typography:** family, size, weight, line height, letter spacing, alignment, and text color.
- **Fill:** background color and fill visibility.
- **Stroke:** border color, width, and style.
- **Layout:** padding, margin where safe, dimensions where supported, and corner radius.
- **Opacity:** numeric value and slider using the same normalized value.

Sections with no applicable properties are hidden rather than disabled en masse.

### Value provenance

Each field resolves four layers:

1. **Default** — the product's declared design token or stylesheet default when available.
2. **Computed** — the actual browser value currently applied to the selected element.
3. **Saved** — the persisted override returned by Supabase.
4. **Draft** — the unsaved value currently being edited.

The control displays the draft if present, then saved, then computed. Secondary labels expose the applicable saved/default or computed value so a blank input never masquerades as `#000000` or another browser fallback.

### Live preview, undo, reset, save

- Editing a field updates a draft map and applies the result to the preview immediately.
- Undo restores the previous draft snapshot without writing to Supabase.
- Reset removes the selected object's persisted overrides after confirmation and restores computed/default rendering.
- Save sends the complete selected-object override map, then replaces the saved snapshot only after success.
- Network or validation failures keep the draft intact and announce the error with `aria-live`.

## 5. Shared-footer Component Editing

### Loading and data safety

- Entering component design calls `list_component_design('footer')` before rendering editable controls.
- The editor distinguishes loading, loaded-empty, loaded-with-values, save-in-progress, and error states.
- Save is impossible before loading completes.
- The client merges changed properties into the loaded complete map.
- The server RPC updates supplied properties without deleting unrelated rows. Explicit resets use a property-level delete or a deliberate full-component reset operation.
- Property validation remains server-side and only approved design keys can be persisted.

### Preview stage

The central column becomes a dedicated footer stage with:

- Page-context selector: Home, ATLAS Gears, GeoWeb, and Spell Drill.
- Viewport selector: desktop and mobile.
- A real `ps-footer.js` render, not a parallel mock implementation.
- Enough surrounding page background to verify contrast and spacing.
- A selected-component outline and `Shared footer` badge.

Context switching changes only the preview environment and feature visibility expected for that page. The shared component styles remain one source of truth.

### Footer design tokens

All exposed settings must map to CSS custom properties consumed by footer descendants. At minimum:

- foreground and muted text colors;
- primary/amber action color;
- background and border colors;
- font family, size, weight, line height, and letter spacing;
- horizontal/vertical padding and gaps;
- border radius;
- opacity and visibility for supported actions.

Hard-coded descendant values that bypass these properties are removed. A property that cannot visibly affect the real footer is not shown in the inspector.

## 6. Control Design

- Numeric controls pair a text-safe number input with small increment/decrement affordances.
- Dimensional controls provide an explicit unit selector limited to supported units; values are normalized before save.
- Color controls combine a swatch, browser color picker, and uppercase HEX field. Empty means no override, not black.
- Weight and alignment use compact segmented controls or selects with visible selected states.
- Visibility uses a labeled switch and is persisted as an approved boolean-like value.
- Focus rings use the product amber and remain visible against the near-black studio surface.
- Spacing follows the existing 4/8px system, with rounded but restrained panels and controls.

## 7. Reliability Fixes

### Deep links

The mode parser accepts every declared `StudioMode`, including `resources` and `works`. Invalid values fall back to page design.

### Hydration

Server render and first client render show the same authentication-loading shell. Session storage is read only after mount, after which the UI transitions to login or studio. This removes the tree mismatch and initial flash.

### Visitor counting

`localhost`, `127.0.0.1`, and IPv6 loopback do not call the production visitor increment RPC. They may render a clearly local placeholder or perform a read-only fetch if needed, but must never mutate the production counter.

## 8. Accessibility

- All inspector inputs have programmatic labels.
- Selection outlines are supplemented by text, not color alone.
- Save, error, and reset states use a polite or assertive live region as appropriate.
- Keyboard users can move into the preview, select an editable target, and return to the inspector.
- Collapsible inspector sections expose `aria-expanded` and preserve a logical focus order.
- Empty review/component states contain explanatory text and a next action where applicable.

## 9. Testing Strategy

Implementation follows test-driven development. Each behavior starts with a failing test observed for the intended reason.

### Data behavior

- Existing footer properties load into the editor.
- Changing one footer property preserves all other persisted properties.
- Resetting one property does not delete siblings.
- Saving is disabled before the initial load finishes.
- Server validation rejects unsupported keys or malformed values.

### Runtime behavior

- Every exposed footer property reaches a descendant CSS declaration through a token.
- Switching page context and viewport preserves the draft.
- Stable IDs survive insertion of unrelated preceding DOM nodes.
- Legacy keys still load where no stable record exists, while new saves use stable IDs.
- Localhost never invokes the visitor increment RPC.

### Studio behavior

- Direct `?mode=resources` and `?mode=works` navigation selects the requested workspace.
- Server and initial client output share the authentication-loading shell.
- Computed styles populate the inspector when no inline or persisted value exists.
- Empty color overrides do not display black as the current value.
- Draft edits apply live, undo reverts them, save persists them, and failed save retains them.

### Verification

- Existing Node test suite passes.
- Astro production build passes.
- Browser verification covers login, page selection, live edit/undo/save/reset, footer component editing across all page contexts, mobile/desktop switching, refresh persistence, and console errors.
- Supabase records are inspected after partial save and reset to prove unrelated values remain.
- Production-like pages are checked for visual parity and shared-footer consistency.

## 10. Implementation Sequence

Work is performed by fresh sequential subagents, with a review pass after each implementation task:

1. **Data safety and platform reliability** — component loading/non-destructive persistence, stable IDs, deep links, hydration, and localhost counter guard.
2. **Footer runtime and component preview** — token wiring, real component stage, context and viewport switching.
3. **Figma-style inspector** — grouped controls, computed/saved/default/draft provenance, live preview, undo, reset, save, and accessibility.
4. **Integration verification** — full tests, build, authenticated browser workflows, Supabase record checks, and final code/design review.

Each implementation task is accepted only after its focused tests and reviewer findings are resolved. Existing unrelated worktree changes remain outside these commits.
