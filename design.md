# Seshat Notch — Design Source of Truth (DESIGN.MD)

> **Repository:** https://github.com/Swashbuckler16/Seshat-Notch.git  
> **PRD Compliance:** Version 1.0 (Section 9: Design Language and Hallmark Workflow)  
> **Hallmark Version:** 2.0.0  
> **Personality:** Precise, calm, and a little severe, like a well-kept field ledger or an instrument panel. Authored by a person with taste, not assembled from a kit.

---

## 1. Core Principles

1. **Numbers are the hero.** Large, tabular, well-aligned numerals with clear units. Typography does the work (`font-feature-settings: "tnum"`).
2. **Dense but ordered.** High information density organized with hairline rules (1px), consistent spacing, and clear hierarchy — never boxes inside boxes.
3. **One signal color, used semantically.** A restrained neutral palette plus a single accent for state and emphasis. Status never relies on color alone; every status combines an explicit word and geometric shape.
4. **Motion explains change.** Animate only to show something happened (progress filling, an item rolling over, timer tick). Respect `prefers-reduced-motion`.
5. **Native ergonomics.** Keyboard-first on Windows (`Ctrl+K` command palette, single-key quick add `N`, full keyboard navigation). Thumb-first for future Android.
6. **Two real themes.** Light and dark are each designed deliberately; dark mode is a second authored rendering with re-derived OKLCH values, never an inverted light theme.
7. **Honest empty states.** No fake data, no placeholder metrics, and zero cheerful filler copy ("You're crushing it!"). If data is missing, show an explicit blank or honest explanation ("Not enough data for a forecast yet").

---

## 2. Brand Motif: The Notch and the Cord

- **The Notch (`.seshat-notch-rib`):** Seshat recorded years by cutting notches into a palm rib. Completed days and habit check-ins are drawn as rows of vertical ticks grouped strictly in sevens (weeks), providing an immediate rhythmic ledger.
- **The Measuring Cord (`.seshat-cord-bar`):** Seshat laid out temples by stretching a knotted measuring cord. Progress and target-versus-actual bars carry an etched hairline tick scale (10% increments) with an anchor knot marker.
- **The Seven-Pointed Star:** A precise geometric mark taken from the emblem above Seshat's head. Pure geometric vector, never folkloric or decorative.

---

## 3. Anti-Slop Discipline (Strictly Enforced)

- ❌ No purple-to-blue gradients, glowing neon, or decorative background blobs.
- ❌ No glassmorphism, background-blur cards, or heavy drop shadows.
- ❌ No emojis as structural icons (phosphor / lucide vector icons only).
- ❌ No identical rounded-card grids with repeating icon-title-subtext cards.
- ❌ No default chart library look (no rainbow palettes, no donuts, no 3D, no unlabelled axes).
- ❌ No `transition: all`. Motion uses `transform` and `opacity` only.
- ❌ No motivational filler copy or invented onboarding statistics.

---

## 4. Typography System

| Role | Font Family | Size | Line Height | Tracking | Weight | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Metric** | Inter / Plex Mono | 44px / 2.75rem | 1.05 | -0.03em | 700 / 600 | `tnum` tabular numbers required |
| **Display H1** | Inter | 32px / 2.0rem | 1.15 | -0.025em | 700 | `text-wrap: balance` |
| **Heading H2** | Inter | 22px / 1.375rem | 1.25 | -0.015em | 600 | View & tab headers |
| **Heading H3** | Inter | 16px / 1.0rem | 1.35 | -0.01em | 600 | Section ledgers |
| **Body Primary**| Inter | 14px / 0.875rem | 1.5 | normal | 400 | Dense desktop working copy |
| **Body Muted**  | Inter | 13px / 0.8125rem| 1.45 | normal | 400 | Secondary metadata |
| **Meta / Label**| Inter | 12px / 0.75rem | 1.3 | normal | 500 | Sentence case, never small caps |
| **Code / Ledger**| IBM Plex Mono | 13px / 0.8125rem| 1.4 | -0.01em | 500 | Math formulas, grammar tokens |

---

## 5. OKLCH Color Palette

### Light Mode (`[data-mode="light"]`)
- `--color-paper`: `oklch(98.5% 0.005 200)` — Crisp field ledger canvas
- `--color-paper-2`: `oklch(96.0% 0.007 200)` — Tinted well / table headers
- `--color-paper-3`: `oklch(93.5% 0.010 200)` — Raised surfaces / interactive states
- `--color-rule`: `oklch(87.5% 0.008 200)` — 1px hairline division rules
- `--color-ink`: `oklch(16.5% 0.014 200)` — Primary text (contrast 12:1)
- `--color-ink-muted`: `oklch(42.0% 0.015 200)` — Secondary text (contrast 5.8:1)
- `--color-ink-subtle`: `oklch(62.0% 0.012 200)` — Units and inactive tick marks
- `--color-accent`: `oklch(46.0% 0.165 205)` — Deep Egyptian Teal signal
- `--color-accent-ink`: `oklch(98.0% 0.005 205)` — Text on accent fills
- `--color-focus`: `oklch(52.0% 0.190 205)` — 2px instant focus ring

### Dark Mode (`[data-mode="dark"]`)
- `--color-paper`: `oklch(14.0% 0.012 200)` — Deep charcoal slate
- `--color-paper-2`: `oklch(17.5% 0.014 200)` — Elevated cards (+3.5% L)
- `--color-paper-3`: `oklch(22.0% 0.016 200)` — Wells and active items
- `--color-rule`: `oklch(28.0% 0.014 200)` — Visible hairlines
- `--color-ink`: `oklch(94.0% 0.008 200)` — Primary text
- `--color-ink-muted`: `oklch(68.0% 0.012 200)` — Secondary labels
- `--color-ink-subtle`: `oklch(48.0% 0.010 200)` — Inactive notch marks
- `--color-accent`: `oklch(66.0% 0.145 205)` — Luminous Teal signal (de-saturated for dark ground)
- `--color-accent-ink`: `oklch(14.0% 0.010 205)` — Text on accent fills
- `--color-focus`: `oklch(70.0% 0.170 205)` — High-contrast focus ring

### Semantic Status Indicators (Always Word + Geometric Glyph)
- **On Track:** `oklch(56% 0.14 145)` (Moss) · Glyph `●`
- **At Risk:** `oklch(65% 0.15 75)` (Amber Ochre) · Glyph `▲`
- **Behind:** `oklch(52% 0.17 25)` (Crimson) · Glyph `■`
- **Paused / Pending:** `oklch(58% 0.02 200)` (Slate) · Glyph `◆`

---

## 6. The Surface Ladder

1. **Level 0 (Base Canvas):** `--color-paper`, no elevation.
2. **Level 1 (Hairline Rule):** `1px solid var(--color-rule)`. All sections and stats part with a hairline. No outer heavy boxes.
3. **Level 2 (Tinted Well):** `--color-paper-2` background without border. Used for table headers, command palette inputs, and preview wells.
4. **Level 3 (Focused Card):** `--color-paper-2` with `1px solid var(--color-rule)` (never border + drop shadow together).

---

## 7. Spacing & Rhythm

Based on a strict 4px/8px modular scale:
- `--space-3xs`: `2px` (micro hairline offset)
- `--space-2xs`: `4px` (notch gap, compact badge padding)
- `--space-xs`: `8px` (button vertical padding, element gap)
- `--space-sm`: `12px` (card content padding)
- `--space-md`: `16px` (standard container gap)
- `--space-lg`: `24px` (view module separation)
- `--space-xl`: `32px` (major view section division)
- `--space-2xl`: `48px` (view gutters)

---

## 8. Motion & Micro-Interactions

- Timing tokens:
  - `--dur-micro`: `120ms` (checkbox click, notch state change)
  - `--dur-short`: `200ms` (hover contrast, tab switch)
  - `--dur-long`: `360ms` (dialog enter, drawer reveal)
- Allowed properties: `transform`, `opacity` only.
- Fallback: `@media (prefers-reduced-motion: reduce)` renders end-state instantly.

