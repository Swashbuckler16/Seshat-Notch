# Seshat Notch (Planner and Tracker)

> **Every day, a notch. Every goal, measured.**  
> *A personal planning and tracking application for Windows (Android in future), built under the open-source Hallmark design language.*

[![Hallmark 2.0.0 Floor Compliant](https://img.shields.io/badge/Hallmark_2.0.0-100%25_Floor_Compliant-0d9488)](https://github.com/Nutlope/hallmark.git)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Type: Local--First](https://img.shields.io/badge/Architecture-Local--First_Offline-black)](design.md)

---

## 1. Summary

Seshat Notch takes its name from **Seshat**, the Egyptian goddess of writing, measurement, and records, who was depicted notching a palm rib to record the passing of years and stretching a measuring cord to survey temples.

The app is built for personal mastery:
- **Multi-horizon planning:** Monthly, weekly, and daily targets attached to measurable numbers.
- **Plan vs. Reality:** Log what actually happened; compare plan to reality with visible, reproducible math.
- **Projects & Habits in one system:** Holds technical projects (e.g., *Heimdall SOC Lab*), certifications, routines, and habits on one trustworthy dashboard.
- **Local-first, fast, and 100% private:** No tracking, no ads, no social fluff. Works completely offline.

---

## 2. Hallmark Design System & Anti-Slop Floor

Governed strictly by the [Hallmark Design Skill](https://github.com/Nutlope/hallmark.git) and [`design.md`](design.md):

1. **Numbers are the hero:** Large, tabular, well-aligned numerals with clear units (`font-feature-settings: "tnum"`).
2. **Dense but ordered:** High information density organized with 1px hairline rules — never boxes inside boxes.
3. **One signal color:** Restrained neutral OKLCH palette with a single accent (Deep Egyptian Teal `oklch(46% 0.165 205)`). Status never relies on color alone (always explicit word + geometric glyph).
4. **Motion explains change:** `transform` and `opacity` only; `prefers-reduced-motion` fallbacks everywhere.
5. **Brand motif:**
   - **The Notch on a Rib:** Days and habit check-ins rendered as vertical ticks grouped strictly in sevens (weeks).
   - **The Measuring Cord:** Progress and target-versus-actual bars etched with a 10% survey tick scale.
   - **The 7-Pointed Star:** Mathematical geometric mark.
6. **Anti-slop rules:** No purple-to-blue gradients, glowing neon, glassmorphism, emoji icons, repeating card grids, default chart looks, or cheerful filler copy.

---

## 3. Development Roadmap (14 Phases)

| Phase | Description | Status |
| :---: | :--- | :---: |
| **01** | **Project Architecture, Repository Foundation & Hallmark Design Truth** | **Completed** |
| **02** | Domain Model, Typed Storage Layer & Append-Only Change Log | Queued |
| **03** | Hallmark Component Library & Seshat Brand Motif Primitives | Queued |
| **04** | Quick-Add Grammar Engine & Keyboard Palette (`Ctrl+K`, single-key `N`) | Queued |
| **05** | Areas, Projects/Goals & Milestone Planner (with Dependencies) | Queued |
| **06** | Multi-Horizon Planning Engine (Month/Week/Day Cascades & Re-planning) | Queued |
| **07** | Today View & Rapid Execution Strip (<5s glance, 1-keystroke logging) | Queued |
| **08** | Carry-Over Inbox & Review Workflows (Daily, Weekly, Monthly Reviews) | Queued |
| **09** | Habit Tracker & Fair Streak Logic (Skip days, pauses, year heatmap) | Queued |
| **10** | Time Tracker & Deep Work Focus Mode (Stopwatch, sessions, deep/shallow) | Queued |
| **11** | Pure Metric Computation Engine & Interactive Formula Inspector | Queued |
| **12** | Comprehensive Multi-Tab Dashboard & Custom SVG Visualizations | Queued |
| **13** | Data Ownership, Export/Import (JSON/CSV/Markdown) & Recovery Bin | Queued |
| **14** | Windows Desktop Shell Integration (System tray, global hotkey, offline packaging) | Queued |

---

## 4. Getting Started

### Development
```bash
# Run local dev server
npm run dev

# Run automated Hallmark 58-gate audit
npm run audit

# Run automated tests
npm test

# Build production bundle
npm run build
```

---

## 5. Repository

- **GitHub:** [https://github.com/Swashbuckler16/Seshat-Notch.git](https://github.com/Swashbuckler16/Seshat-Notch.git)
- **Author:** Swashbuckler16

