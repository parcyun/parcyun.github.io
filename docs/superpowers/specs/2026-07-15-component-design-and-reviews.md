# Component Design and Reviews

## Goal

Extend Design Studio with shared-component design controls and add a no-login, server-filtered, admin-approved review flow exposed from the shared footer.

## Decisions

- The first shared component surface is the public floating footer: visitor counter, collaboration/coffee action, feature-request action, review action, and footer identity text.
- Component design values are stored by component key and applied by the shared footer runtime on every page that loads it. The component layer is the single source of truth; page-specific overrides do not replace component values.
- Review submissions contain only a 1–5 star rating and review body. No account, name, email, or other personal information is collected or stored.
- A server-side Supabase RPC normalizes and validates content, rejects prohibited harassment/abuse/profanity patterns before insertion, and stores accepted reviews as `pending`.
- Administrators approve or reject pending reviews from the existing Design Studio review workspace. Only approved reviews are public.
- The public review page and footer modal show rating and body only. The footer uses a compact floating `리뷰 남기기` action that opens the review composer.
- Review body limits are 1–500 characters. Ratings must be integers from 1 to 5. HTML is stripped server-side before filtering and storage.

## Architecture

### Shared component design

Add a `component_design` table keyed by `component_key` and `property`, with JSON values for constrained CSS/component settings. Public reads use a narrowly scoped security-definer reader RPC; writes and deletes use the existing password-gated admin RPC pattern. `public/ps-footer.js` fetches the footer design record once, applies safe CSS variables/properties, then renders the same footer markup across Astro and static pages. Design Studio gains a `컴포넌트 디자인` workspace with footer controls and live preview.

### Review flow

The review table stores `id`, `rating`, `body`, `status`, timestamps, and a moderation reason when rejected. `submit_review` performs normalization, length/rating validation, prohibited-term matching, and inserts only clean content as pending. `list_reviews` exposes published rows only. Admin RPCs list pending/all rows and transition status. The existing Design Studio admin shell gets a `리뷰 관리` workspace; the old feedback workspace remains separate.

### Error handling

- Empty, oversized, invalid-rating, or prohibited submissions return a clear Korean error without inserting a row.
- Network failures leave the composer open and show a retry-safe message.
- Public review reads fail closed to an empty state and never expose pending/rejected content.
- Component-design fetch failures use the current compiled footer defaults.

## Acceptance criteria

1. Changing a footer component setting in Design Studio affects Atlas, GeoWeb, Spell Drill, ACADEMICA, Works, and the home page after reload.
2. Component settings are constrained to an allowlist and cannot inject arbitrary CSS or HTML.
3. A visitor can submit a 1–5 star review without login or personal information.
4. Server-side filtering blocks prohibited abuse/attack/profanity content before storage.
5. Submitted reviews are invisible publicly until an admin approves them.
6. Approved reviews display rating and body on the review page and review composer/list surface.
7. Existing feedback, footer, visitor counter, and content-studio workflows continue to pass their tests.
