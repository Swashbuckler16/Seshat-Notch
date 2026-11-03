# Changes

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
