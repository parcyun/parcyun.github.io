# Content Studio design

## Goal

Authenticated administrators can edit the visible text and visual tokens of the current public page, while the home-page career timeline is rendered from database records that can be added, edited, reordered, and deleted.

## Boundaries

- Public pages keep their static HTML as an offline-safe baseline. Runtime records override that baseline after loading.
- `/admin/components/` is the single control surface. It lists supported public pages and opens each page in an editing preview.
- The public page edit mode remains useful for quick text changes, but its toolbar opens the same Content Studio for structural edits.
- Navigation, footer controls, dynamic React resource/work cards, form controls, media, and script-generated UI are not converted to arbitrary rich-text editing. Their editable text/settings are exposed as named components in Content Studio instead. This prevents a text edit from changing routes, actions, or shared behavior.
- Career data is the exception to static page structure: categories and entries are real database records, with explicit CRUD and ordering.

## Data model and authorization

- `career_sections(id, title, sort)` and `career_items(id, section_id, year, role, org, sort)` store the home timeline. Public reads are allowed; direct writes are denied by RLS.
- `site_design(key, value jsonb)` stores a constrained visual-token override for a page/component. Values are CSS custom-property maps, not arbitrary CSS.
- `admin_*` RPCs reuse `admin_check(p_pw)` before any mutation. The public key never receives a direct write policy.
- Initial migration seeds the existing home-page timeline exactly once with stable text identifiers, then public rendering replaces the static fallback only when records load successfully.

## Client architecture

- `public/site-content.js` remains the runtime entrypoint. It expands the editable text selector to safe text-bearing elements, loads content/style overrides, and exposes a small `window.psContentStudio` bridge for the administrator UI.
- `public/career-timeline.js` fetches and renders career sections/items into `#career-list`, preserving the existing responsive CSS and fallback markup.
- `src/components/ContentStudio.tsx` is a React administrator workspace at `/admin/components/`. It has a page/component navigator, property inspector, live iframe preview, and a Figma-like right inspector for typography, colors, spacing, border radius, and opacity.
- `src/pages/admin/components.astro` hosts the workspace. `AdminLogin` links to it after successful login.

## Interaction design

- The left rail selects a public page, the center displays a live preview, and the right inspector edits the selected text/component.
- The inspector offers only validated token controls: text color, background color, font family, font size, font weight, line height, letter spacing, padding, margin, border radius, border color, border width, and opacity.
- Saving is explicit. The preview reflects draft styles locally first; save persists only the selected component token map through the administrator RPC.
- Career sections and items use a structured panel with add, edit, delete, and move controls. Deleting a section deletes its entries after confirmation.

## Failure handling

- A missing/failed database request keeps the static public page intact and shows an error in the administrator workspace.
- Unauthorized or expired password calls show an authentication error and never optimistically mark a change saved.
- User-entered rich text is sanitized using the existing allowlist before it is stored or rendered.

## Verification

- Static regression tests cover every new database/RPC contract, the Content Studio route, safe selector exclusions, and career CRUD controls.
- Build validates the Astro/React integration.
- Chrome verifies the real administrator page, edit-mode preview, persisted style override, and career item CRUD against the deployed Supabase project.
