# Design Studio unification

## Decision

Rename Content Studio to **Design Studio** and make `/admin/components/` the only administrator workspace. It contains four modes: Page Design, Resources, Works, and Feedback. Existing public-page quick edit affordances remain compatible, but `/admin/` exposes only the Design Studio entrypoint for editing.

## UI system

- Use a warm near-black surface (`#0F0E0D`) and amber accent already established by parcyun studio.
- Apply a consistent 12px control radius, 16px panel radius, and 20px elevated-surface radius. Pills remain fully rounded only for compact filters and status badges.
- The workspace keeps page navigation left, working canvas center, and inspector right. Content modes replace the canvas/inspector pair with practical tables/forms, not nested cards.
- Resources and Works reuse their existing secure data hooks and edit modals within the same React route. Feedback reuses the existing approval RPCs in a Design Studio panel.

## Boundaries

- No authentication or database contract changes.
- No public resource/Works routes are removed; they retain their editing affordances for backwards compatibility.
- `/feedback-admin/` redirects into the Feedback mode of Design Studio so there is no second administrator workflow.

## Verification

- Static tests assert one Design Studio route/name, available four modes, feedback redirect, and shared rounded-token classes.
- Astro build validates React route integration.
- Chrome verifies the deployed Design Studio login route and public routes still load.
