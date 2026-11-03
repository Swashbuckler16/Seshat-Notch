# Activity rebuild plan

Baseline: main equals origin/main after fetching on 2026-11-03. Working tree was clean. The attached rebuild document is the implementation brief; screenshots are behavioral references.

1. Data: extend habits in place with Dexie v3; retain database name, history and backups. Add transactional per-day entries and versioned schedules. Files: src/types/index.ts, src/db/index.ts, src/services/activityService.ts, dataOwnershipService.ts, activity migration tests.
2. Math: pure activityMath.ts, explicit calendar dates, exact Sleep example and schedule regression tests.
3. UI: shared NotchGrid, Today activity list and week strip, Activities library/editor/detail. Add files under src/components/activities; integrate into TodayView and App without deleting existing component files.
4. Analytics: custom SVG and accessible tables, Overview and By activity, range/Area filters, formula explanations, derived-only numbers. New components under src/components/analytics.
5. Finish: retain themes and offline assets, add activity accents and reduced-motion feedback; fix remaining reproducible defects; run tests, audit, build and browser checks.
6. Documentation: record test results honestly, update README, manual and changelog. Commit phase work only after checks pass.

Design contract: existing design.md owns fonts and palette. The signature is the clickable seven-row activity history. Friendly language, clear empty states, one completion action per activity. All numbers come from saved entries. SVG charts encode completion over time; CSS grids encode day states with shape plus color. Tables are the chart fallback. Load expanded year histories on demand to keep the library bounded.

The brief authorizes replacing Today/Habits/Progress presentations. Keep Plan, settings, reviews, quick add, timers, backup and recovery reachable. No existing files or user records will be deleted.
