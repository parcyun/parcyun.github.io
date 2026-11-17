# satury · route and API operations

## Dictionary panel · release authorized 2026-11-16

- Scope: user approved production API connection and live release after verification.
- Intent: compare regional words with the standard dictionary in one view.
- Mobile order update: move the existing panel directly after the search form
  below 850px, using the actual DOM order (not CSS visual order only). Restore it
  to the desktop right column above that width. Mobile panel scrolls with the page
  so it cannot cover the regional results; desktop remains sticky. Panel height
  still reserves footer space. Existing focus survives responsive reparenting.
- Preserve: satury dark/amber brand, typography, search, regional streaming, footer.
- Desktop: right-hand rounded sticky panel; height follows visual viewport and
  current top position while reserving space for the shared floating footer.
- Mobile: dictionary immediately follows the search form, before regional results;
  the panel scrolls with the page and its list/detail scroll independently.
- Word click opens a bottom-up sheet contained in the panel, not a page-blocking modal.
- States: loading, exact-match homonyms, empty, provider error, stale/cancelled search;
  Escape/close restores list focus, reduced-motion disables sheet animation.
- Source: existing local stdict MCP, official API; no API key in browser/Git.
  Show source links; omit source-attributed literary examples and multimedia.
- Local server: `node scripts/satury-dictionary-local.mjs`, bound only to loopback
  with an OS-assigned free port (current preview port 62583).
- Local dependency: configured stdict MCP at `/Users/parcyun/Downloads/Codex/Tools/stdict-mcp/server.py`.
  Production does not depend on a local computer or MCP process.
- Existing production dialect API is read through a fixed upstream local proxy;
  no CORS or API production configuration was changed for this experiment.
- Mail release is in separate checkout `satury-integration`, remote commit 605ad181.
  Its changes were merged without conflict and retained before the dictionary release.
- Verified: 3 targeted tests and Astro build pass. Actual local API/UI: 갈퀴 returns
  21 regional groups plus dictionary definition; 가다 detail has 34 senses and
  independent inner scrolling. Empty/invalid queries and rapid re-search verified.
- At 1440x900, scrolled panel top=24/bottom=788; at 390x844, expanded mobile
  panel top≈16/bottom≈676 (660px tall), no horizontal overflow. Escape restores
  the clicked word, and reduced-motion removes the sheet animation. Mobile detail
  alignment is repeated after regional streaming settles to prevent layout drift.
- Existing root dependency audit reports 13 issues from the unchanged lockfile;
  no dependency upgrade or broad audit fix is part of this local UI experiment.

### Production dictionary API

- Source: `server/stdict/server.py`, Python standard library only. Search JSON,
  detail XML, normalized data matches the verified local UI contract.
- URL: `https://satury-dictionary-api-1093702239224.asia-northeast3.run.app`.
  GET `/api/stdict/search?q=갈퀴`, GET `/api/stdict/detail?code=387667`.
- Secret Manager: `studio-stdict-key:1`, exposed only to dedicated runtime service
  account `satury-dictionary-api@parcyun.iam.gserviceaccount.com`.
- CORS: studio origin only; unrelated origins rejected. Public read-only data.
- Seoul Cloud Run min 0/max 1, 256Mi, concurrency 8, upstream concurrency max 4.
- 24h bounded cache (128 entries, each at most 128KiB), browser cache 300 seconds,
  shared in-flight lookups; no automatic upstream retries. Response limit 2MB.
- Per-instance uncached budgets: 120/min and 20,000/UTC day. These reset on cold
  starts; they are not a durable global quota. The provider additionally enforces
  the shared key's daily limit. Cache and single maximum instance reduce pressure.
- Source-attributed literary examples and multimedia are not redistributed.
- Verify before release: 8 Python tests, targeted frontend/search regressions,
  Astro build, Cloud Run GET/detail/CORS, real desktop/mobile UI and Pages CI.
- Pre-release: 8 Python tests, 13 targeted frontend/shared regressions, Astro build
  and local desktop/mobile UI pass. Production search/detail/CORS verified;
  provider's empty `{}` response is normalized as zero results (regression test added).
- Revision `satury-dictionary-api-00002-fbb` serves 100% traffic. Deployed API
  search, detail and empty result all returned 200; unrelated Origin returned 403.
- Mobile panel height follows its visible position and reserves footer space.
  Initial result panel is top 186/bottom 676 at 390x844; desktop remains sticky.
- Original language update: search items preserve complete `origin`; details also
  expose every original-language component with its language label (including mixed
  scripts such as radio + 放送). List definitions are visually clamped to two lines;
  originals and full detail definitions are never truncated. v=2 bypasses older
  browser responses lacking origin fields.
- Only “이런 말은 어때요?” recommendations remain. Three known regional-data words
  are shuffled on entry and after completed searches, excluding current and previous
  suggestions; delegated click handling survives replacement. The former lower
  recommendation section and label were removed at the user's explicit request.
- Original-language API revision `satury-dictionary-api-00003-czz` is serving 100%
  traffic. Verified 학교→學校, 컴퓨터→computer and 라디오방송→radio + 放送
  in provider and deployed API data. Local list clamp measured two visible lines
  (50px of 74px for 컴퓨터); detail retains all text. 10 Python and 15 targeted
  Node tests pass, as does Astro build. No unrelated service was redeployed.
- Rollback: revert the dictionary frontend release only; keep the independent
  dictionary API/secret for diagnosis. Do not change mail, regional search or Battle.

```sh
gcloud run deploy satury-dictionary-api --project=parcyun --region=asia-northeast3 --source=server/stdict --service-account=satury-dictionary-api@parcyun.iam.gserviceaccount.com --min=0 --max=1 --min-instances=0 --max-instances=1 --concurrency=8 --cpu=1 --memory=256Mi --timeout=30 --allow-unauthenticated --set-secrets=STDICT_API_KEY=studio-stdict-key:1 --quiet
```

## Source ownership

- Frontend: public/satury/index.html, public/satury/about/index.html.
- Shared studio menu: public/studio-menu.js. Reused by the existing game-account module without adding Firebase to satury.
- ATLAS GEARS catalog: src/data/resources.ts, id satury, visitPath /satury/.
- API: server/satury. Original regional search behavior is retained in search.cjs; server.mjs adapts it to HTTP, CORS, bounded caching and shared in-flight requests.
- Production frontend: https://parcyun.github.io/satury/.
- Production API: https://satury-api-1093702239224.asia-northeast3.run.app/api/search?q=갈퀴.

## Google Cloud boundary

- Project parcyun, region asia-northeast3, service satury-api.
- Dedicated runtime identity: satury-api@parcyun.iam.gserviceaccount.com.
- Secret: satury-urimalsaem-key, version 1, mounted as URIMALSAEM_API_KEY.
- The runtime identity has secretAccessor on this secret only. No private key or API key belongs in Git, frontend code, logs, images or this document.
- Automatic scaling, minimum 0, maximum 2, revision concurrency 20, 256 MiB, request timeout 60 seconds.
- Only the new satury service is deployed. The geoweb-conquest-dev Battle service remains manually stopped with internal ingress.
- GET /api/search and OPTIONS are exposed. CORS allows https://parcyun.github.io without credential cookies. Requests with other Origin headers receive 403; CORS is not an authentication or bot-prevention mechanism.
- Cache: successful public responses only, up to 64 entries, 250 KB per response, one-day server TTL; browser max-age 300. Matching concurrent searches share one request. At most 8 distinct active queries per instance. Errors are not cached.
- There is no new user database, authentication system or paid minimum-instance reservation. Compute, builds, container storage, secrets and traffic are subject to Google Cloud billing.

## Original symptom and fix

The API and DOM contained 21 regions, but article h2 used grid-row:1 / span 100. Empty grid tracks made a one-word region about 869px high and pushed the rest far below the viewport. grid-row:1 keeps normal row flow: the same region is about 79px. A live-result geometry check verifies every region's actual height rather than asserting only that the DOM contains many articles.

## Release checks

1. node --test test/satury-api.test.mjs test/satury-page.test.mjs test/studio-menu.test.mjs.
2. npm run build and git diff --check.
3. Run scripts/verify-satury-ui.mjs through the existing ego-browser Page at desktop and mobile widths. Test both real API and UI fixtures for spinner, partial Korean text, rapid re-search and reduced motion.
4. Verify ATLAS GEARS card opens /satury/, recommendations re-search, source links resolve, and common menu/about/QR siblings remain operational.
5. Confirm production GET/OPTIONS CORS and rejection of an unrelated origin, visit count scope, source SHA, Pages workflow, Cloud Run traffic and error logs.
6. After Pages is healthy, the user approved deleting the old Vercel project and ending its former address, including its temporary redirect. Verify no frontend request depends on Vercel before deletion.

## Manual API deployment

From the repository root, use the authenticated Google Cloud account:

```sh
gcloud run deploy satury-api --project=parcyun --region=asia-northeast3 --source=server/satury --service-account=satury-api@parcyun.iam.gserviceaccount.com --min=0 --max=2 --min-instances=0 --max-instances=2 --concurrency=20 --cpu=1 --memory=256Mi --timeout=60 --allow-unauthenticated --set-secrets=URIMALSAEM_API_KEY=satury-urimalsaem-key:1 --quiet
```

This changes only satury-api. Do not run a similar command against Battle.

## Rollback

- Pages: revert only the satury release commit, preserving other users' changes.
- Cloud Run: route satury-api to its previous known-good revision. Keep secret version 1 available.
- Deleting the Vercel project removes its deployments and aliases. Do not rely on the original deployment for rollback after deletion. Original source is archived locally; the API key remains in Google Secret Manager. Recovery uses Git and Cloud Run revisions.
- Do not rotate or destroy the source key during the initial cutover. Review its retirement separately after stability is established.

## Existing unrelated test failure

The main baseline 53c4a81 already has a dexterity home link without data-ps-edit-id; studio-design.test.mjs reports that invariant failure. This release does not change that unrelated home link.

## ATLAS GEARS catalog identity · 2026-11-17

- GeoWeb, Spell Drill and satury cards use the published Tuilders titles and descriptions, verified against `/api/v1/apps/{slug}` on 2026-11-17.
- Official full-bleed icons are stored locally in `public/images/service-logos/`; the catalog does not depend on Tuilders availability at runtime.
- The same catalog description supplies the hover tooltip, including Spell Drill's English grammar and satury's standard Korean dictionary and regional dialect search.
- `useResources` preserves static logo and visitor-route metadata when loading administrator content.
- Verification: Astro production build, five existing ATLAS tests, desktop rendered cards, loaded logo assets and 390px mobile layout without horizontal overflow.
- Follow-up: the three hover thumbnails also use the current Tuilders representative scenes (GeoWeb flag quiz, Spell Drill score feedback, satury standard/dialect results). Local WebP assets use contain fitting so key information is not cropped. Production build and visible desktop hover verified.
