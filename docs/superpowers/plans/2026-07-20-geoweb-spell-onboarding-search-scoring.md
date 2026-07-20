# GeoWeb · Spell Drill Onboarding, Search, and Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve both services' first-visit guidance, make GeoWeb search understand aliases and typos, and make repeated Spell Drill mistakes progressively costlier with stronger visual feedback.

**Architecture:** Keep country data and aliases in the generated static GeoWeb module, returning search metadata to React. Keep onboarding state local to each service with versioned localStorage keys. Add pure Spell Drill scoring helpers and let the existing page consume them.

**Tech Stack:** Astro, React, static JavaScript, CSS, Node test runner

## Global Constraints

- No Supabase schema or RPC changes.
- GeoWeb country data remains fully static.
- Exact and alias matches sort ahead of fuzzy matches.
- Spell Drill does not explain the hidden scoring rules.
- Push only after localhost review and explicit user approval.

---

### Task 1: GeoWeb Search Ranking

**Files:**
- Modify: `scripts/build-country-data.mjs`
- Modify: `src/components/globeCountries.js`
- Modify: `test/geoweb-country-search.test.mjs`

**Interfaces:**
- Produces: `searchCountryMatches(query, lang)` returning `{ country, matchType }[]`
- Produces: `searchCountries(query, lang)` compatibility wrapper returning country records

- [ ] **Step 1: Write the failing test**

Add assertions that `북한` returns `KP` with `matchType: "alias"`, `대한민구` returns `KR` with `matchType: "fuzzy"`, and exact `대한민국` precedes fuzzy results.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/geoweb-country-search.test.mjs`
Expected: FAIL because `searchCountryMatches` is not exported.

- [ ] **Step 3: Implement static aliases and bounded fuzzy matching**

Add a country-code alias map, normalized Levenshtein distance, minimum query length, distance-ratio cutoff, match priority, and eight-result cap to the generator template. Regenerate `globeCountries.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/geoweb-country-search.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-country-data.mjs src/components/globeCountries.js test/geoweb-country-search.test.mjs
git commit -m "feat: add GeoWeb alias and fuzzy search"
```

### Task 2: GeoWeb Panels and Modal

**Files:**
- Modify: `src/components/GlobeLab.jsx`
- Modify: `test/geoweb-update-story.test.mjs`
- Modify: `test/geoweb-country-search.test.mjs`

**Interfaces:**
- Consumes: `searchCountryMatches(query, lang)`
- Produces: independent `.country-search-panel`, `.legend`, `.update-history`

- [ ] **Step 1: Write failing source-behavior tests**

Assert the four requested help lines, `시작하기`, update-history toggle, independent search panel, fuzzy badge, and an effect that closes `systemPopover` when `sel` changes.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/geoweb-update-story.test.mjs test/geoweb-country-search.test.mjs`
Expected: FAIL on missing copy and panel structure.

- [ ] **Step 3: Implement the modal, panel separation, and popover reset**

Use `showUpdateHistory` state for an animated in-modal history region. Render search as a sibling float panel in the right stack. Read `matchType` for the fuzzy badge. Close the system popover whenever `sel` changes or clears.

- [ ] **Step 4: Run tests and build**

Run: `node --test test/geoweb-update-story.test.mjs test/geoweb-country-search.test.mjs && npm run build`
Expected: PASS and successful Astro build.

- [ ] **Step 5: Commit**

```bash
git add src/components/GlobeLab.jsx test/geoweb-update-story.test.mjs test/geoweb-country-search.test.mjs
git commit -m "feat: refine GeoWeb onboarding and search panels"
```

### Task 3: Spell Drill Onboarding

**Files:**
- Modify: `public/korean-spell-drill-parcyun/index.html`
- Create: `test/spell-drill-onboarding.test.mjs`

**Interfaces:**
- Produces: `#spell-onboarding`, `#spell-update-history`, versioned localStorage key

- [ ] **Step 1: Write the failing test**

Assert the developer-voice modal, usage instructions, `시작하기`, update-history toggle, version entries, and localStorage persistence.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/spell-drill-onboarding.test.mjs`
Expected: FAIL because the onboarding elements do not exist.

- [ ] **Step 3: Implement modal markup, styles, and behavior**

Insert the modal before game screens, add the shared visual pattern, and wire close/history actions without starting a game or audio.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/spell-drill-onboarding.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/korean-spell-drill-parcyun/index.html test/spell-drill-onboarding.test.mjs
git commit -m "feat: add Spell Drill onboarding story"
```

### Task 4: Progressive Wrong-Answer Penalties and Effects

**Files:**
- Modify: `public/korean-spell-drill-parcyun/scoring.js`
- Modify: `public/korean-spell-drill-parcyun/index.html`
- Modify: `test/spell-drill-scoring.test.mjs`

**Interfaces:**
- Produces: `wrongAnswerPenalty(wrongCount): number`
- Consumes: `scoreEffect(amount, negative)` and `pointPop(text, negative, amount)`

- [ ] **Step 1: Write the failing tests**

Assert penalties `[10,20,30,40]`, `wrongCount` reset at game start, dynamic penalty use, centered point text, and larger magnitude-dependent effect values.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/spell-drill-scoring.test.mjs`
Expected: FAIL because `wrongAnswerPenalty` is absent.

- [ ] **Step 3: Implement scoring and effects**

Add the pure helper, increment `wrongCount` per game, use its penalty in the wrong branch, move point text to viewport center, and scale font/ring/particle radius from the absolute score delta.

- [ ] **Step 4: Run tests and build**

Run: `node --test test/spell-drill-scoring.test.mjs test/spell-drill-onboarding.test.mjs && npm run build`
Expected: PASS and successful Astro build.

- [ ] **Step 5: Commit**

```bash
git add public/korean-spell-drill-parcyun/scoring.js public/korean-spell-drill-parcyun/index.html test/spell-drill-scoring.test.mjs
git commit -m "feat: escalate Spell Drill mistake feedback"
```

### Task 5: Full Verification and Local Preview

**Files:**
- Verify only

- [ ] **Step 1: Run the full test suite**

Run: `node --test test/*.test.mjs`
Expected: all tests pass.

- [ ] **Step 2: Build production assets**

Run: `npm run build`
Expected: Astro build succeeds.

- [ ] **Step 3: Verify localhost**

Confirm HTTP 200 for `/world-map/` and `/korean-spell-drill-parcyun/index.html`, then open both local URLs for user review.

- [ ] **Step 4: Inspect repository state**

Run: `git status --short && git log --oneline -8`
Expected: clean `dev` worktree with all feature commits present.

- [ ] **Step 5: Wait for explicit push approval**

Do not push until the user confirms the localhost result.
