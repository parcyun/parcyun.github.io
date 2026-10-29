# GeoWeb and Spell Drill Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete static 195-country exploration to GeoWeb and progressive combo, pass-penalty, and score effects to Spell Drill.

**Architecture:** Country facts live in one validated static data module and flags live as local WebP assets. GeoWeb consumes pure search and terminology helpers, while its existing renderer receives a small focus-country API. Spell Drill scoring rules move to a standalone browser-compatible pure module that the game and Node tests share.

**Tech Stack:** Astro, React, Three.js, D3 Geo, vanilla JavaScript, Node test runner, WebP assets.

## Global Constraints

- Country scope is exactly 195: 193 UN members plus Vatican City and Palestine.
- GeoWeb must remain usable without runtime country APIs.
- Political systems use `democratic_republic`, `constitutional_monarchy`, `absolute_monarchy`, `one_party`, `transitional_special`.
- Economic systems use `market`, `mixed`, `socialist_market`, `planned`.
- GeoWeb and Spell Drill preserve the existing parcyun studio cinematic visual language.
- Motion honors `prefers-reduced-motion`.
- Lightning and pass-penalty rules are not explained in UI copy.

---

### Task 1: Static country facts and local flags

**Files:**
- Create: `scripts/build-country-data.mjs`
- Create: `src/components/globeCountries.js`
- Create: `public/flags/*.webp`
- Create: `test/globe-country-data.test.mjs`

**Interfaces:**
- Produces: `COUNTRIES`, `COUNTRY_BY_ISO2`, `countryByBoundaryName(name)`, `searchCountries(query, lang)`, `SYSTEM_LABELS`, `SYSTEM_EXPLANATIONS`.

- [ ] Write a failing test asserting exactly 195 unique ISO codes and complete bilingual capital, population, coordinates, system, and local flag fields.
- [ ] Run `/opt/homebrew/bin/node --test test/globe-country-data.test.mjs` and confirm it fails because `globeCountries.js` is missing.
- [ ] Build the static module from a pinned source snapshot, add explicit UN-195 filtering and system classification sets, and download/convert all flags to ISO2-named WebP files.
- [ ] Run the country test and confirm all 195 records and 195 WebP assets pass.
- [ ] Commit with `feat: add complete GeoWeb country dataset`.

### Task 2: GeoWeb country search and focus behavior

**Files:**
- Modify: `src/components/GlobeLab.jsx`
- Modify: `src/components/globeCountryData.js`
- Create: `src/components/globeCountrySearch.js`
- Create: `test/geoweb-country-search.test.mjs`

**Interfaces:**
- Consumes: `searchCountries(query, lang)` and `countryByBoundaryName(name)`.
- Produces: search UI, expanded country detail card, `api.current.focusCountry(country)`.

- [ ] Write failing tests for bilingual search, empty results, capital/population rendering hooks, and focus-country invocation.
- [ ] Run the targeted test and confirm the new hooks are missing.
- [ ] Add the search field beneath continent/ocean selection, loading state, result list, detail expansion, and smooth projection-aware focus.
- [ ] Add interactive political/economic system labels with animated explanatory popovers and Escape handling.
- [ ] Run the targeted test and existing globe tests.
- [ ] Commit with `feat: add animated GeoWeb country search`.

### Task 3: GeoWeb panel motion and update story

**Files:**
- Modify: `src/components/GlobeLab.jsx`
- Create: `src/components/geoUpdateStory.js`
- Create: `test/geoweb-update-story.test.mjs`

**Interfaces:**
- Produces: versioned `shouldShowGeoUpdate(storage, version)` behavior and update modal.

- [ ] Write failing tests for first-visit display, version persistence, reduced motion, and shared panel transition tokens.
- [ ] Run the targeted test and confirm failure.
- [ ] Add a developer-to-classroom update story modal and unify panel open/close transitions with measured height, opacity, and the studio easing curve.
- [ ] Run targeted and globe tests.
- [ ] Commit with `feat: introduce GeoWeb country update`.

### Task 4: Spell Drill scoring rules

**Files:**
- Create: `public/korean-spell-drill-parcyun/scoring.js`
- Modify: `public/korean-spell-drill-parcyun/index.html`
- Create: `test/spell-drill-scoring.test.mjs`

**Interfaces:**
- Produces: `comboMultiplier(combo)`, `passPenalty(passCount)`, `effectIntensity(points)`.

- [ ] Write failing boundary tests for combo values 0, 3, 6, 9, 12, 15, 30 and pass counts 1 through 6.
- [ ] Run the targeted test and confirm the scoring module is missing.
- [ ] Implement pure scoring helpers, load them before the game script, reset `passCount` on game start, apply capped 5× combo and exponential pass deductions with a zero score floor.
- [ ] Run the targeted test and confirm all boundaries pass.
- [ ] Commit with `feat: rebalance Spell Drill scoring`.

### Task 5: Spell Drill scalable score effects

**Files:**
- Modify: `public/korean-spell-drill-parcyun/index.html`
- Modify: `test/spell-drill-scoring.test.mjs`

**Interfaces:**
- Consumes: `effectIntensity(points)`.
- Produces: `scoreEffect(points, kind)` with scale-dependent label, glow, particles, and reduced-motion fallback.

- [ ] Add failing source assertions for bonus and penalty effects, scale tiers, particle cleanup, and reduced-motion CSS.
- [ ] Run the targeted test and confirm failure.
- [ ] Implement amber bonus and red penalty effects whose visual intensity grows with the absolute score delta.
- [ ] Run targeted tests, all Node tests, and `npm run build`.
- [ ] Commit with `feat: add dynamic Spell Drill score effects`.

### Task 6: Integrated visual verification

**Files:**
- Modify only files required by defects found during verification.

- [ ] Start the Astro development server and verify GeoWeb search, country focus, bilingual facts, system popovers, panel motion, update story, and mobile layout.
- [ ] Verify Spell Drill combo thresholds, repeated pass penalties, bonus/penalty effects, and game reset behavior.
- [ ] Run `/opt/homebrew/bin/node --test test/*.test.mjs`, `npm run build`, and `git diff --check`.
- [ ] Commit any verification fixes with `fix: polish GeoWeb and Spell Drill upgrade`.

### 2026-10-29 follow-up: browser profiles, school identity, motion

- Browser profiles remain in localStorage; anonymous Firebase Auth provides ranking ownership only. No anonymous `/profiles` writes. Meaningful edits rotate the profile version; submitted identity snapshots stay separate. Ordinary cache edits restore from frozen in-memory state within 100ms. Full browser/developer-tools control cannot be prevented by client code.
- Verified locally with actual flag-game play: submit, rename via profile UI, submit again, two independent rows, no server profile, immutable prior identity enforced by Firestore. Both verification rows deleted. Google login was not exercised with a real account.
- School source: official NEIS dataset `OPEN17020190531110010104913`, 17 regional exports, 12,561 valid school codes. Local directory search includes road addresses. `scripts/fetch-school-directory.mjs` refreshes raw rows; `scripts/collect-school-marks.mjs <raw rows>` collects official homepage logos/emblems into WebP, tracks source URL/status in `public/school-marks/manifest.json`, resumes by default; `RETRY_MISSING=1` retries unresolved schools. Missing marks show a generic icon, never a favicon/third-party search image. Nationwide collection verification is pending until scan completes; inspect manifest statuses and representative images before claiming all marks.
- Map overlays, grid lines/labels, satellite/day-night, selection cards, true-size ghost appearance/removal and game choices use fades/motion with reduced-motion support. Preserve unrelated Vatican/zoom-label work in the working tree.
- Checks: 29 targeted game/map/profile tests passed; 10 profile/server-ranking tests passed; Astro build passed. Real mobile school search 390px and desktop 1280px verified. Isolated release build and all 183 tests passed; fresh browser origin ranking → profile creation → school selection/server WebP verified. Live verification pending.

- Source audit follow-up: broad official-homepage extraction selected a decorative illustration for `F10:7392178` during a local probe (not included in released 5d831c9). Collector stopped; additional local assets/manifest are unverified and MUST NOT be published as confirmed marks. Tightened explicit image-label/logo-filename gate locally. Official authority sources discovered: Sejong Education Office school symbols dataset 15150785; Gyeongnam Education Information Institute detailed school symbols 15152959; Daegu Future Education Research Institute detailed symbols 15152154. These provide symbol metadata/image IDs; direct original image URL mapping remains unverified. Next: use authority metadata to identify 교표 only, map image IDs to official image files, then visual audit before further mark publication. Earlier release includes 2,767 automatically collected images; these are collected candidates, not a claim that every mark was manually verified. Nationwide completion remains pending.

- User authorized screenshot fallback. `scripts/capture-school-mark.mjs` downloads first, then captures only one loaded image explicitly labelled 교표/학교마크/심볼마크 on a school-symbol page whose title matches the school. Broken images, ambiguous marks and wrong-school pages are rejected. Captures convert to WebP and retain source/page/acquisition metadata. Real-browser verification: 고진중학교 `J10:7751396`, blocked original download → captured WebP 3,442 bytes; wrong-school title rejected. Collector writes a capture queue next to the raw directory input; setting `SCHOOL_MARK_PLAYWRIGHT_MODULE` to an installed Playwright index.mjs runs the queued browser fallback after scanning. No authentication or access-control bypass is used. This verifies the fallback method, not nationwide mark completion.

### 2026-10-29 compact ranking and continued mark audit

- Profile save closes the account modal only after local storage or Google profile write succeeds; invalid input leaves it open. Real-browser local profile success/invalid-name branches verified.
- GeoWeb: ranking explanation beside English heading, difficulty beside Korean title (including 390px), disclosure/submission controls at upper right, fixed compact MY BEST area last, list flexes into remaining height. Spell Drill shares compact rows and heading-adjacent disclosure; both sheets remain 90dvh. 80-row local fixtures (no server writes): Geo list 622px desktop / 506px mobile; Spell 569px / 504px; rows about 50px / 45px; MY BEST stayed fixed during scrolling. All 184 Node tests and build passed. Live verification pending.
- Nationwide mark verification is running into separate HTTP/browser audit manifests under `verification/geoweb-true-size/`, not directly publishing broad candidates. The HTTP collector strict mode requires a school-name match and explicit 교표 label on a school-symbol page. Browser verifier also accepts an image uniquely associated with a 교표-only section; ambiguous composite images stay unresolved. Browser fallback captures only displayed confirmed marks when original retrieval fails. Only audited ready entries may be merged into the live manifest after image checks. Full national completion is not yet verified.

### 2026-10-29 community school-mark requests

- Added a collapsible form at the bottom of school search: explicit school selection from results, PNG/JPG/WebP file (8MB input cap), aspect-preserving 256px WebP preview, confirmation and submit. Images strip original metadata and must fit the existing 90KB data-URL cap.
- Stored as private, create-only pending `schoolMarkRequests/{authUid}_{schoolId}` documents. Anonymous authentication supplies ownership without creating or linking a server profile. Request fields contain school identity, image, owner ID and server submission time only. A school/user pair cannot overwrite an earlier request; only the owner can withdraw a pending request. Approval/publication is reserved for operator review.
- Deployed Firestore rules and verified with a real browser submission of the official 고진중학교 emblem: server pending row exists; list/other-owner reads denied; client approval denied; SVG payload denied; no server profile created; test request deleted. The unsaved browser profile draft survived anonymous sign-in. Client optimization/duplicate-validation tests passed. Final release build/live checks pending.

### 2026-10-29 mobile object review

- Preserve the existing amber/dark design and desktop layout. Mobile map tools and legend start collapsed; projection, zoom/game entry and panels use separate lanes. Panel contents remain scrollable. Geo practice toggle stays above the HUD, with separate finish/input areas in landscape.
- Spell Drill moves home utility actions into a top row, hides floating utilities during play, fits core ranking columns to mobile width, and starts a round at the top without focus-induced scrolling. Profile/school inputs retain 16px text to avoid iOS focus zoom.
- Isolated release build and 185 Node tests passed. Chrome mobile emulation: 320x740, 360x740, 390x844, 844x390; map/menu/difficulty/play, both ranking dialogs and school search reviewed. All six Geo modes additionally reviewed at 320px. Evidence: `~/Downloads/Codex/verification/mobile-games/`.
- Physical iPhone/Android keyboard and Safari toolbar behavior not verified; next check is device testing with the on-screen keyboard open. Existing unrelated map/data and school-collection work remains outside this release.

### 2026-10-29 compact mobile reconstruction

- Replaced the first mobile patch with a compact layout: inline Spell Drill setup rows, one-row question/time/score/combo dashboard, four touch actions, side-by-side landscape question/input, compact result grid. English difficulty controls use Easy/Medium/Hard/Mix. Play/result scroll inside footer-safe boundaries and reset on screen changes.
- GeoWeb uses a two-column game menu, condensed score strip, top round-finish/practice actions and one bottom answer dock measured against both footer and brand heights. Map tools/legend occupy small expandable headers; country search, day/night and comparison help remain usable in narrow/landscape layouts. Mobile ranking reduces game-column/table widths; all nickname/school text remains in the table.
- School search keeps its heading/close button outside the scroll area and reduces result height while the image-request form is open. No profile/ranking/server data model changes. Unrelated map/data and school collection edits remain excluded.
- Isolated build and 185 Node tests passed. Browser checks include 320x568, 360x640, 390x844, 844x390 plus 320x400 short viewport; actual game actions, three-answer combo, timer, hint, results/restart, all six Geo modes, both rankings with local fixtures, English/custom setup, country search/day-night/size help and school search/request form. Physical device keyboard remains unverified. Evidence: `~/Downloads/Codex/verification/mobile-compact/`.
