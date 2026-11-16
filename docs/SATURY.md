# satury · route and API operations

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
