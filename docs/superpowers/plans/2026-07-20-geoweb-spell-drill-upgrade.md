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
