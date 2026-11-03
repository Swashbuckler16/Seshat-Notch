# Changes

## Today-only completion — 2026-11-04

- Locked past and future completion writes, including entry edits, clearing, bulk actions, legacy activity actions and undo after the day changes.
- Applied the rule to dated tasks and daily goal progress while retaining future planning and read-only history navigation.
- Preserved the interface layout and styling; only control availability and relevant help text changed.
- Verified with 93 passing tests, a production build, and browser checks for mouse, keyboard, context-menu, today completion and undo.
- Uses the device's local planning day. This is an application rule, not protection against changing the device clock or editing local storage outside the app.

## Activities and analytics rebuild — 2026-11-03

- Rebuilt Today, Activities and Analytics with friendly labels, animated completion feedback, theme-aware activity colors and reduced-motion support.
- Added interactive date grids, week progress, activity notes, actual times, quantities, weekly schedules, pauses, archives and undo.
- Added completion, streaks, recent-weighted scores, momentum, monthly and weekly charts, area comparisons and accessible data tables.
- Migrated existing activities in place to schema 3, preserved the database name and backups, and enforced one active entry per activity/day.
- Preserved Plan, reviews, focus tools, settings and recovery. Removed startup deletion of pre-added records.
- Added salted PIN hashes, legacy PIN migration, temporary lockout and accurate privacy wording.
- Shared live activity data across screens and deferred offscreen histories to keep large libraries responsive.
- Updated the illustrated README, four-page user manual and verification reports.

See `docs/test-report.md` for measured results and remaining limitations.
