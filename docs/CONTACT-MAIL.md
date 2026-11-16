# Shared coffee contact composer — Gmail connected

## Intent

Open a centered, animated mail composer from the existing shared coffee dialog.
Preserve its dark/amber brand, email copying, footer layout and shared consumers.
Collect reply email, subject and message; show pending, confirmed success or failure.
Keep drafts on failure, support keyboard focus/Escape and reduced motion.

## Current status

- Frontend: centered responsive animated composer in `public/ps-footer.js`.
- Default endpoint: `https://studio-contact-api-1093702239224.asia-northeast3.run.app/api/contact`.
- Never reports success unless the server confirms a send; drafts survive errors.
- User authorized connecting Gmail, real receipt verification, then live release.
  Recipient is fixed to `pen.layered@gmail.com`; visitor email is Reply-To only.
- Gmail API enabled in GCP `parcyun`. Created separate web OAuth client named
  `parcyun studio contact mail`; existing Firebase login client is unchanged.
- Consent platform is already Production (not Testing); no audience setting changed.
- OAuth callback registered: `http://127.0.0.1:57931/oauth/callback`.
- `server/contact/authorize-local.mjs` uses state, PKCE and gmail.send-only scope.
  It is excluded from the Docker context. Private credential files are outside Git:
  `/Users/parcyun/Downloads/Codex/Artifacts/studio-contact-2026-11-16/private/`.
- Owner completed consent. Offline authorization stored in Secret Manager
  `studio-contact-gmail:1`, mounted only in dedicated Cloud Run `studio-contact-api`.
- Runtime service account `studio-contact-api@parcyun.iam.gserviceaccount.com` has
  accessor on that one secret and object-user on private bucket
  `parcyun-studio-contact-state`; no Gmail key is in public assets or Git.
- Revision `studio-contact-api-00002-fjp`, Seoul region, min 0/max 1, concurrency 4,
  memory 256Mi, 30-second request timeout. Battle and satury API unchanged.
- State is hashes/id/time/status only, with generation-conditional quota reservations:
  max 3/hour per email, 20/hour total, 50/UTC day; 7-day object lifecycle.
- Payload and Origin validated, fixed recipient, no arbitrary recipients, no retry
  after uncertain provider delivery. Same request or same content deduplicates.
- Mail A via authorized Gmail sender and mail B via deployed API both reached INBOX
  on 2026-11-16, confirmed through Gmail connector. Repeated B returned sent=true
  without a second inbox message; unrelated Origin returned 403.
- 30 targeted tests and Astro build passed. Browser verified composer fields,
  autofocus, no mailto link and hidden honeypot. Final live UI send remains release QA.

## Release gate / next action

Publish footer-3 and verify one live browser form send plus actual inbox receipt.
Gmail authorization can be revoked; in that case drafts remain and errors are shown.
Restore by running the local-only consent helper with private client credentials,
adding a new Secret Manager version and redeploying that version. Never print tokens.
Do not reuse or restart the stopped Battle service. Do not change satury search API.
