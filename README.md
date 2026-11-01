# Seshat Notch

> **Every day, a notch. Every goal, measured.**  
> *A personal planning and tracking application for Windows (and Android), built for deep work and long-term mastery.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Type: Local--First](https://img.shields.io/badge/Architecture-Local--First_Offline-black)](design.md)
[![Build Status](https://github.com/Swashbuckler16/Seshat-Notch/actions/workflows/ci.yml/badge.svg)](https://github.com/Swashbuckler16/Seshat-Notch/actions)

---

## 1. Overview

Seshat Notch takes its name from **Seshat**, the ancient Egyptian goddess of writing, measurement, and records, who was depicted notching a palm rib to record the passing of years and stretching a measuring cord to survey foundations.

The app is built for personal mastery:
- **Multi-Horizon Planning:** Define and connect targets across three horizons: monthly milestones, weekly goals, and daily tasks.
- **Plan vs. Reality:** Log what actually happened. Compare your plan to reality with visible, transparent mathematics.
- **Unified Tracking:** Manage technical projects, certifications, daily habits, and routines in one cohesive system.
- **Local-First & 100% Private:** Zero telemetry, no ads, no external servers. All data stays offline on your machine with an append-only change log for complete auditability.

---

## 2. Core Capabilities

- **Today Execution Strip:** A streamlined morning dashboard showing scheduled tasks, due habits, time estimates, and rapid one-click progress logging.
- **Multi-Horizon Planner:** Organize life areas, projects, milestones with finish-to-start dependencies, and cascade targets across months, weeks, and days.
- **Quick-Add Grammar:** Fast keyboard entry (`Ctrl+K` or `N`) using an intuitive shorthand:
  ```text
  Write Kerberoasting detection card #heimdall >week3 ~90m !high @friday +rules:2
  ```
- **Habit Tracker & Fair Streaks:** Flexible habit schedules (daily, weekdays, N times per week) with fair streak logic that accounts for scheduled rest days and excused sick/vacation pauses without breaking your momentum.
- **Time Tracker & Focus Mode:** Integrated focus timer with configurable work/break intervals, manual duration entry, and classification into deep work, shallow work, or deliberate learning.
- **Executive Dashboard:** Clear, custom visual data graphics (sparklines, Few-style bullet charts, burn-up curves, and horizon progress bars) with explainable, rule-based observations.
- **Carry-Over Inbox & Reviews:** Structured daily, weekly, and monthly review flows. Slipped tasks are never lost; they are explicitly rescheduled, split, or dropped with a recorded reason.
- **Data Ownership & Recovery Bin:** Export everything anytime to JSON, CSV, or Markdown. Soft-deleted items are retained in a Recovery Bin with one-click restore. Automated and manual offline snapshot backups keep your data secure.

---

## 3. Getting Started

### Prerequisites
- Node.js 22 LTS or newer
- PowerShell, Bash, or Command Prompt

### Running the App
```powershell
# Install dependencies
npm install

# Start local development server
npm run dev

# Run automated unit test suite (69 tests)
npm test

# Build production bundle
npm run build
```

---

## 4. License

- **License:** [MIT](LICENSE) © 2026 Atharva Ghag (Swashbuckler16)
