# GeoWeb Play — 2026-10-16

## Design and behavior

- 2026-10-16 follow-up: Quiz answer buttons show ENTER/SHIFT+ENTER beneath their labels; the repeated hint below the input is removed. Practice mode is available in the lobby and active round, keeps each answer visible, removes scoring and text entry, and advances with its button or Shift+Enter. Tab retains normal focus navigation. Finishing a flag round turns off its day/night animation and returns to the default globe framing. The globe background uses the Masterclass Stargaze layered-star shader with GeoWeb amber/black colors; the game entry button has no border and an orange diagonal hover sweep. Reduced motion keeps the stars still and disables the sweep. Local UI checks covered practice answer/next/keyboard focus, quiz button labels, flag finish, and globe rendering.

- Follow-up: game entry immediately transitions to the default globe view before a game is selected. Shift+Enter skips from the quiz input or focused practice button; Tab and Shift+Tab retain normal keyboard navigation. Skip reveals only the answer name centrally for 1.4 seconds before the next question. Country/flag answers are country names; capitals/landforms/landmarks retain their actual answer names. Score bursts reuse Spell Drill point/ring/particle timing and speed styles, with combo below; no full-screen flashing. Flag entrance waits for image load, then comes from right and exits left. Preserve reduced-motion and cancel effects on exit.

- Existing amber/black parcyun studio design; preserve the existing map renderer and data. One diagonal sweep on entry, reduced-motion alternative, keyboard-first answers.
- Lobby lists six games and each browser-local best score with time to attain that score. Selecting a game slides the menu left. The playing header contains only GEOWEB PLAY and game title.
- End game shows the current round result and returns to game selection. The separate bottom-right exit restores map exploration settings.
- Country prompt above the input is intentionally absent. Country info in easy capitals shares its width with the score card. Score/answer notices clear after 2.2 seconds.
- Landmarks center the selected country on the left and show its photograph on the right. Nature questions center the highlighted landform on the right and show a sourced representative photograph on the left. All 52 natural-landform entries have Commons author/license/source metadata; if a photo fails, the map question remains answerable.

## Data and scoring

- Country and capital questions: 189 mapped countries; flags: 195 local images. Natural features: 52 distinct existing landforms. Landmarks: 100.
- Base points: country, flag, easy capitals 100; nature 200; hard capitals and landmarks 300. Formula and multipliers reuse `public/spell-drill/scoring.js`; speed thresholds mirror Spell Drill. Wrong answers/skips reset combo without deducting points.
- Records use `geoweb.game-records.v1` in localStorage. Higher scores win; equal scores prefer shorter times. This is not a cross-device leaderboard. Missing/corrupt/unavailable storage is handled without stopping play.
- Landmark sources, attribution and licenses are embedded per entry and shown during play. 92 additional entries were resolved from Wikipedia primary images and Wikimedia Commons imageinfo. Non-Commons/restricted/unsupported files were replaced with other landmarks. No Unsplash fallback was needed for the final catalog.

## Verification and limitations

- 159 Node tests passed, including question count, finite coordinates, local flags, normalized exact answers, shared score parity, shuffle and record persistence. Astro production build passed; existing large-chunk warning remains.
- Browser verification: country input focus, flag correct/next/score, easy-capital card without answer, capital and landmark correct answers, saved record after reload, lobby/round-result navigation, menu hiding and footer controls.
- External photos remain network-dependent. Metadata for all 100 exists, but bulk image HEAD checks encountered Wikimedia HTTP 429 throttling (73 of 100 requests). A real landmark image loaded at 960px in browser. Failed/slow photos show an error and enable skip without starting the speed clock. Do not claim all 100 images were visually inspected.
- Latest browser checks: landmark country at left/photo at right (Prague Castle and Grand Palace photographs loaded); score and country cards both 339.59px wide; notice text empty after expiry with input focus retained; Amazon river drawn without its label and skip revealed its answer. At 390×844 viewport the input, HUD and both distinct exit controls are within bounds, with no horizontal overflow.
- GitHub Pages run 38833563020 succeeded for 14949be. Public game entry, landmark photo loading (960px), and split country/photo layout verified. Live-only visitor badge overlapped the finish button; added a game-only hide rule for the actual `#visitor-stats` host. All 100 photos have not been individually visually reviewed; source metadata is the catalog validation basis.
