# GeoWeb Conquest DEV — handoff / 2026-10-30

## Status

- Implemented and deployed to the dedicated cloud development service: isolated `/world-map/dev/` route and Node server. Original `/world-map/`, GlobeLab, GeoGame, shared account/ranking code and existing Firestore rules were not edited for this work. Pre-existing dirty files remain in the checkout.
- Validated by 32 focused Node tests and 218 tests in the clean release copy, plus a production Astro build. The isolated copy excludes unrelated dirty map/school-mark files.
- verified in real local UI: classroom creation + six-digit numeric code; a separate browser context entering by code; browser guest identity; game answers contributing server points; founding completed from a 971-point campaign with 1,135 contributed points; country leave; founding/rebellion condition panels; exactly two equal-width existing-country buttons, `국가 참여` and `반란`, in one row; three projection modes; narrow viewport without horizontal overflow; no visible scrollbars.
- Verified against actual Firestore / Cloud Run with ten independent browser profiles in an isolated classroom. Not verified: physical devices, full browser-engine coverage, large public cohorts, or learning outcomes with actual students.

## Run and review

From this repository:

```sh
npm ci --prefix server/conquest
npm run build
node server/conquest/server.mjs
```

Open `http://127.0.0.1:47585/world-map/dev/`. Browser identity credentials remain local; world data is stored in server SQLite under `server/conquest/.data/conquest.sqlite` (ignored by Git). The server binds loopback by default. Local verification artifacts are in the sibling `geoweb-conquest-verification/` directory. Keep existing user servers at port 47583 untouched.

## Product contract

- Global servers: exactly `뉴 월드` (`new-world`) and `컨티넨탈` (`continental`). Each has independent world state.
- Classroom server: creator sets a name, the server generates a collision-checked six-digit numeric code. Profiles must join the classroom by code before accessing its world. Codes are returned to the creator and visible to members for invitation.
- Global timing: battle/founding/rebellion 3 days, proposal 2 days, water movement 12 hours per hex. Classroom timing: 5 minutes, 1 minute, 10 seconds per hex respectively. Global ordinary battles use 1,000 points. Classroom battle target is `1,000 * ceil(attacking nation members / 2)` (minimum 1,000): five members get 3,000, ten get 5,000. The goal is fixed when the plan is created.
- Joining an existing nation is immediate. Founding an empty land block requires a scored campaign. Target is `round(200 + 1800 / (1 + nearestNationHexDistance / 3))`, so farther from existing territory costs less. No adjacent countries means 200 points.
- Nation leave preserves land, contribution history and previous vote electorates, removes current membership and battle participation. The nation panel fades away; the independent block panel then permits founding or rebellion.
- Rebellion targets a nation-owned land block. Target is `500 + 100 * nationLandBlockCount`. The nation can defend; successful rebels form a new nation on the chosen block. Only one active operation may occupy a block. Changed ownership cancels an obsolete campaign.
- Independent selection condition panel shows eligibility, nearest-nation distance or defending nation's land-block count, required score and time window. An existing nation selection ends with exactly `국가 참여` / `반란` in one row. The nation chooser selects a block first rather than joining immediately.
- One-ring sea claims derive only from owned land; sea claims do not recursively extend the coast. Overlap is contestable. Sea victory changes disputed-water control without converting water into land.
- Sea routes use water-only A* with date-line wrapping. Arrival is server-timed. Fleets unlock attacks only on adjacent blocks after arrival. Routes can reach defended coasts but cannot traverse land. The route search is bounded; very long routes may require an intermediate destination.
- A participant chooses one operation for game contribution. Server-issued question nonces, server answer matching, server time and shared scoring determine the credited points. Successful answers consume their nonce. A bounded receipt history makes retries return the original acknowledgement without adding points twice. The next question waits for acknowledgement; commands for a profile are serialized. Server scoring uses request arrival time, excluding transaction-lock wait. Quiz combo state is reset for a new round or wrong answer/skip. This is not bot-proof anti-cheat: question pools and accepted answers remain client-visible educational content.
- Proposal electorate is snapshotted when submitted. One active proposal per nation; one vote per eligible person. At deadline at least 70% of the whole electorate must agree. Abstentions count against approval. Names, text-symbol flags and territory colors are supported.

## Capital declaration (latest steering)

- A nation needs at least seven land blocks. Selecting one of its own blocks enables `수도 선포 투표` if the one active proposal slot is free.
- Capital vote uses the current room's proposal duration and a snapshotted electorate. At least **80%** of the whole electorate must agree; ordinary identity proposals still require 70%.
- On approval the block becomes the nation's capital, receives a star marker on the map, and is linked from nation information. No bonuses, special attack mechanics or other capital powers were added. Local browser verification confirmed the seven-block eligibility button and the displayed 80% proposal requirement; virtual-clock tests verified 70% rejection, 80% approval, and cancellation when ownership changes.
- If the selected block is lost or the nation falls below seven land blocks before the vote closes, the capital proposal is cancelled. If an existing capital is lost, its current capital marker is cleared; vote history stays.

## Rendering and grid

- Clone keeps the original WebGL projection and pointer behavior for flat, Focus Lens and globe modes.
- The underlying map illustration, geographic border meshes and labels are hidden. Land and sea are classified at each hex center and shown as solid cell colors, with thicker dark boundaries. Ownership, territorial seas and disputed seas tint those cells.
- Cells are regular hexagons in the flat Mercator plane. Globe and stereographic projections necessarily distort them. The grid covers ±84° and has **1,228,920** possible cells; high-latitude cell area differs from Korea's area.
- The original equal-area estimate was land ~190,643 and whole Earth ~652,892 cells using Korea ≈100,000 km² and world land 148.94 million km² / surface 510.072 million km². This is an estimate under equal real-area cells, not the implemented Mercator grid count. Exact Korea = 128 and polar-cap coverage remain unimplemented. Area source: https://www.cia.gov/the-world-factbook/static/6c4d9b9a41b27707b6720720df7161d6/Physical_World.pdf
- Game background retains server territory. Question overlays tint hex cells when a geographic cue is required. Flag mode shows the globe without the old blur.
- 72 missiles use varied short colored heads, long colored fading trails, great-circle paths, atmospheric elevation and small landing flashes. Reduced motion suppresses the missiles. Routes are generated randomly at scene initialization.
- Country panel stays at the right on desktop and collapses without losing its state. Narrow layout uses a bottom panel with internal scrolling. Scrollbars are visually hidden while scrolling remains available. The shared share widget is omitted on this dev route to keep zoom/home controls unobstructed.

## Server architecture and limitations

- `server/conquest/server.mjs`: HTTP API, room creation/code admission, anonymous browser profile credentials, server-authoritative world transitions, question/answer contribution validation, static review hosting.
- `storage.mjs`: synchronous SQLite transactions locally; Firebase Admin Firestore transactions for cloud. Firestore uses the independent `geowebConquestDev` collection, with hashed-token profile documents and one world document per room. Client-facing Firebase rules are unchanged.
- Do not deploy Cloud Run with SQLite. The server refuses that combination; cloud must set `CONQUEST_STORAGE=firestore` and use ADC. Official setup: https://firebase.google.com/docs/admin/setup
- Simplification: one world document per room, with an 850 KB Firestore guard. Transactions retry up to 12 times and skip unchanged documents. Monotonic world revisions prevent a late polling response from replacing newer action state. Shard territory and operation records before large populations or document size make this unstable. No scalability claim has been made.
- Simplification: visible classrooms poll at ~1 second, global rooms at ~3 seconds. Upgrade to authenticated streaming before large public cohorts. Server time, not client time, controls outcomes.
- Browser credentials identify the same participant through local profile nickname edits; no signup is required. Clearing credentials loses the recovery link. No email, school name, photo or Google real name is sent by this API.
- Local SQLite verification data and test browser nations are development data, not public production state. Leave them recoverable.

## Cloud deployment and ten-player results — 2026-10-30

The user explicitly authorized cloud deployment, ten-player classroom testing, improvements and redeployment.

- Cloud service: `geoweb-conquest-dev`, project `parcyun`, region `asia-northeast3`, dedicated runtime service account `geoweb-conquest@parcyun.iam.gserviceaccount.com`.
- Live cloud app: https://geoweb-conquest-dev-1093702239224.asia-northeast3.run.app/world-map/dev/
- GitHub Pages route: https://parcyun.github.io/world-map/dev/ . The scoped workflow build passes `PUBLIC_CONQUEST_API` to the verified cloud API. The original `/world-map/` source and shared account/ranking/rules remain unchanged.
- Cloud storage: actual Firestore, independent `geowebConquestDev` collection. No local SQLite data was uploaded. Cloud Run runs 1 CPU / 1 GiB, request concurrency 40, min instances 0, max instances 3.
- Test classroom: `검증용 10인 교실 · 10월 30일`, code **467000**. It is intentionally marked as test data, with ten simulated browser profiles; no real students were used.
- All ten profiles joined the classroom and nation. Initial entry latency ranged from 180 to 2,167 ms. The first live concurrent quiz exposed a nonce race: next questions could supersede pending answers. The fix waits for acknowledgements, serializes commands and supports idempotent retries.
- After the fix, a simultaneous ten-browser round returned ten HTTP 200 acknowledgements, totaling 1,275 contributed points. Contribution sums matched persisted world counters.
- Cooperative battle: ten contributors, target 5,000, final attack 5,160, captured territory. Successful completion is announced with a direct return-to-map action.
- 5-v-5: target 3,000; attack 3,130, defense 550, attacker captured the block. A submission arriving after completion was acknowledged with zero extra operation points rather than an expired-question error.
- Real classroom deadlines: capital vote approved at 8/10 (80%); identity proposal approved at 7/10 (70%). Room, profile, vote and territory data survived cloud revision replacement.
- Learning: two wrong attempts provide a first-letter hint; mistakes/skips are collected for missed-question-only practice from the round summary. Practice awards no operation points. A simulated 1.4-second answer delay held the same question/read-only input until acknowledgement.
- UI improvements: active operations sort before completed founding records; participant/my-contribution counts are visible; active operation and room can be resumed; connection errors have retry; new nations choose distinct default territory colors; completed participation history survives leaving. Mobile progress/result strip is positioned below the HUD, avoiding overlap.
- These tests verify behavior, not educational efficacy or ten physical devices. Eight of ten browser contexts used reduced motion during concurrency checks; animation/device performance needs a physical classroom-device check.

## Release evidence and next checks

Artifacts: `~/Downloads/Codex/Artifacts/geoweb-cloud-20261030/` contains clean release inputs, test logs, cloud build/deployment metadata, live result JSON and screenshots. Classroom test identities stay in the test room; their credentials are never committed.

The release copies exactly the named conquest files plus the single Pages build environment variable onto the existing remote main commit. The dev renderer uses its own `conquest-vatican.json` asset rather than publishing unrelated in-progress map data. Final verification must confirm ready Cloud Run revision/traffic, the Pages workflow and public route assets, CORS from Pages, profile creation, classroom entry, mobile HUD bounds and original map behavior.

Deferred: teacher-selected question scopes and a teacher-controlled round restart need a separate product decision. Capital powers remain deliberately unspecified. Before public classroom-scale growth, replace polling with authenticated streaming and shard world records as described above.

## Battleground UI and server pacing — 2026-10-30

- Intent: retain the conquest world and its three views; name the product GeoWeb Battleground, with amber Covered By Your Grace lettering for Battleground.
- New World retains 3-day operations, 2-day proposals and 12-hour sea steps. Continental uses 7-day operations, 4-day proposals and 24-hour sea steps. Classroom remains unchanged. Existing operation/proposal deadlines are preserved; new actions use the room-specific rules refreshed by the server.
- Active participants means unique browser profiles polling that room in the last 120 seconds. Separate durable room presence documents refresh each profile at most every 30 seconds; expired entries are pruned. Global chooser refreshes counts every 15 seconds. This is recent activity, not total membership or exact connected sockets.
- Operation entry selects the contributing block and centers it in the left map viewport. Desktop game selection and play occupy the right half. Mobile uses a top map and lower quiz workspace. ResizeObserver updates WebGL dimensions when the workspace changes. Camera question transitions retain the operation center.
- Validation: server tests cover per-room timing, unique presence and classroom isolation; browser checks cover desktop/mobile split, quiz entry and input bounds. Classroom data and existing deadlines are not reset.

## Natural environments and independent quiz viewport — 2026-10-30

- Scope: keep original GeoWeb untouched; Battleground gains source-based environment information and server-authoritative terrain difficulty. Sources: RESOLVE Ecoregions 2017 (CC BY 4.0), Natural Earth representative physical landforms, existing GeoWeb climate raster (see public/lab-data/CONQUEST_ENVIRONMENT_ATTRIBUTION.txt). Biome boundaries represent regional natural environments, not current field-level land cover. Frozen/rock-and-ice grouping is not a measured permafrost classification.
- Classification: water 1 hex from any land is 연안, 2–3 hexes 가까운 바다, further 먼 바다. Country ownership does not determine physical coast distance. Land combines representative mountains/plateaus/plains/deserts and ecological biomes. Missing data is explicitly named, with no modifier. Do not invent a biome from latitude alone.
- Designed game balance, attack increase / defense decrease: plain 0/0%, forest 20/10%, taiga 30/15%, mountain 50/25%, plateau 25/15%, desert 40/20%, grassland 10/5%, jungle 45/25%, tundra 40/20%, frozen 60/30%, wetland 35/20%, coast 15/10%, near sea 25/10%, open sea 40/15%. Percentages are game mechanics, not measured scientific effects. Multipliers apply to battle and founding/rebellion base targets and are snapshotted on creation. Existing operations retain their stored targets; defense falls back to the legacy common target.
- Tile information immediately precedes a reason plus percentage line. Own land displays defense relief; foreign/unowned land displays attack/development cost. Operations display separate attack and defense thresholds, and the contribution bar uses the participant's own side.
- Focus uses the map width after excluding the right information panel (desktop) and zooms to 32. Operation entry retains its target in the left viewport at that zoom. A separate instance of the original GeoWeb renderer supplies the quiz cue, clipped inside the right game workspace, without the hex shader or conquest selection side effects. The quiz camera never moves the operation camera.
- Ranking, unscored practice toggles and the game-mode exit control are removed from Battleground; finishing the round presents game selection or return to operation map. Missed-question retry remains scored and uses the same server authority. Title/HUD are raised; finish is centered. Server, nation-entry, difficulty and result dialogs close on backdrop click; initial server dialog stays dismissed until explicitly reopened.
- Missiles reroll origin/destination and colors each flight, choose destination land with 75% probability and water with 25%, use a 36-segment tail spanning 21.6% of the route, and blend from head color to tail color. Reduced motion still suppresses flight effects.
- Verification artifacts: ~/Downloads/Codex/Artifacts/geoweb-terrain-20261030/. Focus/quiz desktop and 390x844 checks show two independent maps with no quiz escape outside its clipped container. Environment tests include coastal distance bands, real raster regression locations, asymmetric victory and legacy targets, server preview/actual target agreement, and seeded missile category sampling. Real classroom devices and long-term balance remain unverified.
