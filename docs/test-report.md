# Rebuild verification — 2026-11-03

## Automated checks

- 91 Node tests passed, including the real schema-2 database upgrade, backup round-trip, daily entry uniqueness, undo/recovery, calendar boundaries, schedule changes, weekly streaks, avoidance and timing calculations.
- Exact Sleep example: 29/33 = 87.9%, current/best streak 8; completing November 3 gives 30/34 = 88.2% and streak 9.
- 120 randomized activity histories checked for finite values and bounded rates/scores.
- TypeScript and Vite production build passed. npm audit: zero vulnerabilities.
- Browser check exercises completion/undo and quantity entry, then checks five screens at three widths and four palettes. See `browser-results.json` for final accessibility, overflow and runtime results.
- Hallmark render audit: no failures, reflex findings or warnings; documented waivers and explanations are in `hallmark-results.json`.

## Performance and offline

Production Chrome, 1440 × 900, Asia/Kolkata, isolated database with 40 activities and 29,200 entries over three years:

| Screen | Route change |
| --- | ---: |
| Activities | 404 ms |
| Analytics | 385 ms |
| Today | 432 ms |

These one-run timings include browser click dispatch and two animation frames, not a statistical benchmark or a promise for all hardware. The pure overview calculation measured 289 ms on the development harness. Shared live queries avoid rereading all entries on each route. Offscreen activity histories mount when approaching the viewport.

Production reload of cached Today and navigation to cached Analytics passed with the browser offline. No runtime errors were recorded. Unvisited lazy screens require an initial online visit to be cached. See `production-results.json` and `performance-results.json`.

## Visual and document checks

Real browser captures are in `screenshots/today.png`, `activities.png` and `analytics.png`. Four manual pages were exported through Microsoft Word (LibreOffice was unavailable), rendered to PNG and visually inspected. Both manual copies are generated from the same script.

## Limits

- Native Tauri packaging was not verified: Rust/Cargo are unavailable in this environment, so no installer or Cargo.lock was produced.
- Weekly schedules use quota-based weekly streaks, but completion charts still use daily opportunities. Weekly completion percentages must not be interpreted as quota attainment.
- Automated accessibility checks do not replace a screen-reader usability study.
- No deployment or push was performed. Test fixtures were created only in isolated browser contexts.
