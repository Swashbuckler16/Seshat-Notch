# Seshat Notch (Planner and Tracker)

> **Every day, a notch. Every goal, measured.**  
> *A personal planning and tracking application for Windows (Android in future), built under the open-source Hallmark design language.*

[![Hallmark 2.0.0 Floor Compliant](https://img.shields.io/badge/Hallmark_2.0.0-100%25_Floor_Compliant-0d9488)](https://github.com/Nutlope/hallmark.git)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Type: Local--First](https://img.shields.io/badge/Architecture-Local--First_Offline-black)](design.md)
[![Build Status](https://github.com/Swashbuckler16/Seshat-Notch/actions/workflows/ci.yml/badge.svg)](https://github.com/Swashbuckler16/Seshat-Notch/actions)

---

## 1. Summary

Seshat Notch takes its name from **Seshat**, the Egyptian goddess of writing, measurement, and records, who was depicted notching a palm rib to record the passing of years and stretching a measuring cord to survey temples.

The app is built for personal mastery:
- **Multi-horizon planning:** Monthly, weekly, and daily targets attached to measurable numbers.
- **Plan vs. Reality:** Log what actually happened; compare plan to reality with visible, reproducible math.
- **Projects & Habits in one system:** Holds technical projects (e.g., *Heimdall SOC Lab*), certifications, routines, and habits on one trustworthy dashboard.
- **Local-first, fast, and 100% private:** No tracking, no ads, no social fluff. All data stays offline on your machine with an append-only change log for auditability and undo.

---

## 2. Hallmark Design System & Anti-Slop Floor

Governed strictly by the [Hallmark Design Skill](https://github.com/Nutlope/hallmark.git) and [`design.md`](design.md):

1. **Numbers are the hero:** Large, tabular, well-aligned numerals with clear units (`font-feature-settings: "tnum"`).
2. **Dense but ordered:** High information density organized with 1px hairline rules — never boxes inside boxes.
3. **One signal color:** Restrained neutral OKLCH palette with a single accent (Deep Egyptian Teal `oklch(46% 0.165 205)`). Status never relies on color alone (always explicit word + geometric glyph).
4. **Motion explains change:** `transform` and `opacity` only; `prefers-reduced-motion` fallbacks everywhere.
5. **Brand motif:**
   - **The Notch on a Rib:** Days and habit check-ins rendered as vertical ticks grouped strictly in sevens (weeks), supporting fair streak excused skips (PRD HB-3).
   - **The Measuring Cord:** Progress and target-versus-actual bars etched with a 10% survey tick scale and interactive scrubbing.
   - **The 7-Pointed Star:** Mathematical geometric mark.
6. **Anti-slop rules:** No purple-to-blue gradients, glowing neon, glassmorphism, emoji icons, repeating card grids, default chart looks, or cheerful filler copy.

---

## 3. Component Library & Primitives

All UI components in `src/components/ui/` adhere strictly to Hallmark quality gates:
- **`Button`:** Single primary button per view, secondaries outlined/typographic, instant `:focus-visible` outline, no `transition: all`.
- **`Input`:** Constant 1px border width (no focus border-jumping), reserved min-height for helper text, tabular figures on numeric values.
- **`StatTile`:** Tabular numeral hero with explicit units and an interactive **Formula Inspector popover** for traceable math.
- **`HairlineTable`:** Sentence-case unwrapped headers, 1px horizontal division rules, full width.
- **`Modal`:** Hallmark Z-400 accessible dialog with measured scrim opacity and Escape key handling.
- **`Tabs`:** Horizontal scrolling tab row with soft ink/surface active states.
- **`NotchRib`:** Interactive day tick ledger grouped in 7-day rows with tactile click toggle.
- **`CordBar`:** Etched 10% survey cord with expected milestone pins and interactive scrubber.

---

## 4. Development Roadmap (14 Phases)

| Phase | Description | Deliverables | Status |
| :---: | :--- | :--- | :---: |
| **01** | **Project Architecture, Repository Foundation & Hallmark Design Truth** | Vite + React 19 + TypeScript + Tailwind v4, `design.md`, OKLCH tokens, CI/CD pipeline | **Completed** |
| **02** | **Domain Model, Typed Storage Layer & Append-Only Change Log** | Dexie schema, append-only change log, PRD TR-3 drop guard, Heimdall SOC Lab seed data | **Completed** |
| **03** | **Hallmark Component Library & Seshat Brand Motif Primitives** | Notch rib, measuring cord, buttons, inputs, stat tiles with formula popover, hairline table | **Completed** |
| **04** | **Quick-Add Grammar Engine & Keyboard Palette** | `#project >milestone ~estimate !priority @date +metric:value` parser, live preview, `Ctrl+K` | **Completed** |
| **05** | **Areas, Projects/Goals & Milestone Planner** | Area organizer, Project inspector (why, criteria, dates), finish-to-start dependencies | **Completed** |
| **06** | **Multi-Horizon Planning & Cascade Engine** | Target authoring (Month/Week/Day), cascade distribution helper, copy-forward, re-plan tool | **Completed** |
| **07** | **Today View & Rapid Execution Strip** | Morning dashboard (<5s scan), due targets & habits, planned vs logged time, day timeline | **Completed** |
| **08** | **Carry-Over Inbox & Review Workflows** | Carry-over triage (reschedule, split, drop with reason), Daily/Weekly/Monthly reviews | **Completed** |
| **09** | **Habit Tracker & Fair Streak Logic** | Flexible schedules, fair streak engine (excused pauses/skips), ledger-style year heatmap | Queued |
| **10** | **Time Tracker & Deep Work Focus Mode** | Stopwatch timer, manual logger, focus intervals (work/break), session classification | Queued |
| **11** | **Pure Metric Engine & Formula Inspector** | Deterministic pure functions for Progress %, Schedule ratio, 14-day velocity forecast date | Queued |
| **12** | **Comprehensive Multi-Tab Dashboard & SVG Visualizations** | Overview, Execution, Projects, Goals, Habits, Time, Reviews, Insights tabs with custom SVG | Queued |
| **13** | **Data Ownership, Export/Import & Recovery Bin** | Full export (JSON/CSV/Markdown), bulk plan import, soft-delete recovery bin, backups | Queued |
| **14** | **Windows Desktop Shell Integration** | System tray icon, global quick-add shortcut, offline local notifications, release package | Queued |

---

## 5. Getting Started

### Prerequisites
- Node.js 22 LTS or newer
- PowerShell / Bash

### Development
```powershell
# Run local dev server (http://localhost:5173)
npm.cmd run dev

# Run automated Hallmark 58-gate design audit
npm.cmd run audit

# Run automated unit test suite (38 tests)
npm.cmd test

# Build production bundle
npm.cmd run build
```

---

## 6. License & Repository

- **License:** [MIT](LICENSE) © 2026 Swashbuckler16
- **GitHub:** [https://github.com/Swashbuckler16/Seshat-Notch.git](https://github.com/Swashbuckler16/Seshat-Notch.git)
