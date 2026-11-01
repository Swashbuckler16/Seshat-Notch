# Seshat Notch — Design Source of Truth

> **Repository:** https://github.com/Swashbuckler16/Seshat-Notch.git  
> **PRD Compliance:** Version 1.0 (Section 9: Design Language and Hallmark Workflow)  
> **Hallmark Version:** 2.0.0  
> **Personality:** Warm, clear, encouraging, and quietly playful. Seshat is a friendly everyday planner that makes progress easy to see and easy to return to.

---

## 1. Core Principles

1. **People first.** Use everyday labels and short explanations. Keep specialist terms and formulas available when useful, never in the way of a simple task.
2. **Numbers are the hero.** Give real progress figures clear, readable emphasis so people can quickly see what changed.
3. **One clear next step.** Make today's tasks and the primary action easy to find. Keep navigation short and group supporting tools out of the main path.
4. **Progress feels good.** Use friendly shapes, generous spacing, soft corners, and a lively green accent. Celebrate real completions with subtle feedback, without pressure or invented praise.
5. **Show real progress.** Charts are based on saved records, labeled plainly, and never display made-up values. Use color with labels and keep charts readable in both themes.
6. **Motion explains change.** Use restrained feedback for completion, progress, and timer state. Respect `prefers-reduced-motion`.
7. **Keep familiar controls.** Preserve keyboard shortcuts, quick add, navigation destinations, and the behavior users already know.
8. **Design light and dark with care.** Both themes are authored deliberately with readable text and visible controls.
9. **Be honest and kind.** Empty states explain what belongs there and offer a useful next action. Copy is calm, helpful, and never shames missed days.

---

## 2. Brand Motif: The Notch and the Cord

- **The Notch (`.seshat-notch-rib`):** Keep the seven-day rhythm for habit history, with welcoming labels and comfortable spacing.
- **The Measuring Cord (`.seshat-cord-bar`):** Use simple progress bars for goals and targets. Avoid instrument-like tick marks and dense scales.
- **The Seven-Pointed Star:** Keep the existing geometric brand mark, used sparingly.

---

## 3. Anti-Slop Discipline (Strictly Enforced)

- ❌ No purple-to-blue gradients, glowing neon, or decorative background blobs.
- ❌ No glassmorphism, background-blur cards, or heavy drop shadows.
- ❌ No emojis as structural icons (phosphor / lucide vector icons only).
- ❌ No dashboard overload, technical control-room language, or repeated grids of mini metrics.
- ❌ No rainbow charts, 3D charts, or charts without plain-language labels.
- ❌ No `transition: all`. Motion uses `transform` and `opacity` only.
- ❌ No motivational filler copy or invented onboarding statistics.

---

## 4. Typography System

| Role | Font Family | Size | Line Height | Tracking | Weight | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | Inter | 32px / 2.0rem | 1.15 | -0.02em | 700 | Friendly, concise screen title |
| **Heading H2** | Inter | 22px / 1.375rem | 1.25 | -0.01em | 600 | View and section headers |
| **Heading H3** | Inter | 17px / 1.0625rem | 1.35 | normal | 600 | Cards and subsections |
| **Body Primary**| Inter | 16px / 1rem | 1.5 | normal | 400 | Comfortable everyday copy |
| **Body Muted**  | Inter | 14px / 0.875rem| 1.45 | normal | 400 | Supporting detail |
| **Meta / Label**| Inter | 13px / 0.8125rem | 1.35 | normal | 500 | Sentence case, no tracking |
| **Figures**| Inter | inherit | inherit | normal | 600 | Tabular figures for changing values |

---

## 5. OKLCH Color Palette

### Light Mode (`[data-mode="light"]`)
- `--color-paper`: `oklch(98.5% 0.018 93)` — Warm, bright canvas
- `--color-paper-2`: `oklch(96.0% 0.025 94)` — Soft cream surface
- `--color-paper-3`: `oklch(92.5% 0.035 92)` — Warm interactive surface
- `--color-rule`: `oklch(88.0% 0.035 90)` — Quiet warm divider
- `--color-ink`: `oklch(24% 0.035 55)` — Soft espresso text
- `--color-ink-muted`: `oklch(42% 0.035 55)` — Secondary text
- `--color-ink-subtle`: `oklch(54% 0.035 55)` — Supporting detail
- `--color-accent`: `oklch(58% 0.17 145)` — Friendly leaf green action
- `--color-accent-ink`: `oklch(99% 0.01 100)` — Text on green actions
- `--color-focus`: `oklch(50% 0.19 145)` — Visible focus ring
- `--color-chart-1`: `oklch(58% 0.17 145)` — Deep focus
- `--color-chart-2`: `oklch(74% 0.15 72)` — Learning
- `--color-chart-3`: `oklch(67% 0.14 25)` — Light focus

### Dark Mode (`[data-mode="dark"]`)
- `--color-paper`: `oklch(19% 0.02 60)` — Warm deep brown canvas
- `--color-paper-2`: `oklch(23% 0.025 60)` — Raised warm surface
- `--color-paper-3`: `oklch(29% 0.03 60)` — Active and selected surface
- `--color-rule`: `oklch(34% 0.03 60)` — Visible warm divider
- `--color-ink`: `oklch(95% 0.02 90)` — Warm primary text
- `--color-ink-muted`: `oklch(76% 0.025 80)` — Secondary text
- `--color-ink-subtle`: `oklch(64% 0.02 80)` — Supporting detail
- `--color-accent`: `oklch(75% 0.16 145)` — Bright leaf green action
- `--color-accent-ink`: `oklch(20% 0.03 60)` — Text on green actions
- `--color-focus`: `oklch(79% 0.15 145)` — High-contrast focus ring
- `--color-chart-1`: `oklch(75% 0.16 145)` — Deep focus
- `--color-chart-2`: `oklch(82% 0.14 78)` — Learning
- `--color-chart-3`: `oklch(77% 0.15 30)` — Light focus

### Semantic Status Indicators (Always Word + Geometric Glyph)
- **On track:** `--color-status-on-track` · Glyph `●`
- **At risk:** `--color-status-at-risk` · Glyph `▲`
- **Behind:** `--color-status-behind` · Glyph `■`
- **Paused / pending:** `--color-status-paused` · Glyph `◆`

---

## 6. Surface Ladder and Shapes

The **Surface Ladder** keeps the page easy to scan: canvas first, one main surface for related content, and a raised interactive surface for hover or selection. Avoid nesting cards and use open layouts for secondary details.

1. **Canvas:** `--color-paper`, roomy and warm.
2. **Main surface:** `--color-paper-2`, white-space first, soft 16–24px corners.
3. **Interactive surface:** `--color-paper-3`, used for hover and selection.
4. **Primary action:** leaf green with clear text; one per group.
5. **Avoid nesting cards.** Prefer open layouts and use a card only to group related work.

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

