import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { StatTile } from './ui/StatTile';
import { HairlineTable, Column } from './ui/HairlineTable';
import { Modal } from './ui/Modal';
import { NotchRib, DayNotch } from './NotchRib';
import { CordBar } from './CordBar';
import { StatusBadge } from './StatusBadge';
import { Sparkles, Sliders, CheckSquare, Layers, Eye } from 'lucide-react';

interface SampleMilestone {
  id: string;
  phase: string;
  dates: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'paused';
  weight: number;
  detections: number;
}

const SAMPLE_MILESTONES: SampleMilestone[] = [
  { id: '1', phase: 'Phase 1: Lab Architecture & Prep', dates: '2026-10-01 → 10-07', status: 'on_track', weight: 10, detections: 0 },
  { id: '2', phase: 'Phase 2: AD Domain & SwiftOnSecurity Sysmon', dates: '2026-10-08 → 10-15', status: 'on_track', weight: 15, detections: 2 },
  { id: '3', phase: 'Phase 3: Host & Zeek Telemetry Pipeline', dates: '2026-10-16 → 10-22', status: 'on_track', weight: 15, detections: 3 },
  { id: '4', phase: 'Phase 4: Splunk SIEM Ingestion & Parser', dates: '2026-10-23 → 10-28', status: 'on_track', weight: 15, detections: 2 },
  { id: '5', phase: 'Phase 5: Baseline Traffic & Noise Profile', dates: '2026-10-29 → 11-04', status: 'at_risk', weight: 10, detections: 1 },
  { id: '6', phase: 'Phase 6: Attack Emulation & Detection Rules', dates: '2026-11-05 → 11-25', status: 'paused', weight: 20, detections: 4 },
];

export const ComponentShowcase: React.FC = () => {
  // Interactive state for Notch Rib
  const [notches, setNotches] = useState<DayNotch[]>(
    Array.from({ length: 21 }).map((_, i) => {
      const dayNum = i + 1;
      return {
        dayLabel: `D${dayNum}`,
        dateStr: `2026-10-${dayNum.toString().padStart(2, '0')}`,
        isCompleted: [1, 2, 3, 5, 8, 9, 10, 12, 15, 16, 17, 19].includes(dayNum),
        isSkipped: [7, 14, 21].includes(dayNum), // Fair streak rest days
        isToday: dayNum === 19,
      };
    })
  );

  // Interactive state for Cord Bar
  const [cordValue, setCordValue] = useState<number>(8);
  const [modalOpen, setModalOpen] = useState(false);
  const [testInput, setTestInput] = useState('');

  const handleToggleNotch = (dateStr: string, currentState: boolean) => {
    setNotches((prev) =>
      prev.map((n) => (n.dateStr === dateStr ? { ...n, isCompleted: !currentState } : n))
    );
  };

  const columns: Column<SampleMilestone>[] = [
    { key: 'phase', header: 'Milestone / Phase', width: '40%' },
    { key: 'dates', header: 'Timeline', width: '25%', isNumeric: true },
    {
      key: 'weight',
      header: 'Weight',
      width: '12%',
      isNumeric: true,
      align: 'right',
      render: (r) => `${r.weight}%`,
    },
    {
      key: 'detections',
      header: 'Detections',
      width: '13%',
      isNumeric: true,
      align: 'right',
    },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      align: 'right',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Overview Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-sm">Hallmark Component Library & Motif Workbench</h3>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Strict compliance with Hallmark design skill: 1 primary button, instant focus outlines, tabular numerals everywhere, zero AI-slop.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          <Eye className="w-3.5 h-3.5" />
          <span>Launch Modal Inspector</span>
        </Button>
      </div>

      {/* 1. Brand Motif Primitives */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            1. Brand Motif Primitives (The Notch & The Cord)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Interactive Notch on a Rib */}
          <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs">Interactive Notch Rib (Click any tick)</span>
              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Grouped in 7s</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Click any notch to toggle completion state in real-time. Shorter ticks represent excused rest days (PRD HB-3).
            </p>
            <div className="pt-2">
              <NotchRib
                notches={notches}
                label="MITRE Attack Emulation Streak"
                onToggleNotch={handleToggleNotch}
              />
            </div>
          </div>

          {/* Interactive Measuring Cord */}
          <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs">Interactive Measuring Cord (Click to scrub)</span>
              <StatusBadge status={cordValue >= 8 ? 'on_track' : cordValue >= 5 ? 'at_risk' : 'behind'} />
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Etched with 10% survey marks and black expected threshold pin. Click anywhere on the bar to scrub value.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <CordBar
                current={cordValue}
                total={12}
                expected={7}
                unit="rules"
                label="Sigma Rules Written"
                isInteractive
                onChange={(val) => setCordValue(val)}
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-ink-muted)] pt-1">
                <span>Expected: 7 rules (58%)</span>
                <span>Actual: {cordValue} rules ({((cordValue / 12) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Stat Tiles with Formula Tracing */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[var(--color-accent)]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            2. Stat Tiles (Tabular Numerals Hero & Visible Math)
          </h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="Overall Progress"
            value="68.4"
            unit="%"
            qualifier="8 of 12 techniques emulated"
            statusVariant="on_track"
            formula="Progress % = Completed Target Value / Total Planned Target Value"
            formulaExplanation="Calculated across all Heimdall SOC Lab milestones using manual weighting."
          />
          <StatTile
            label="Schedule Ratio"
            value="1.05"
            qualifier="On track (Threshold >= 0.90)"
            statusVariant="on_track"
            formula="Schedule Ratio = Progress % / Expected Progress %"
            formulaExplanation="Actual progress (68.4%) divided by expected progress to date (65.0%). Ratio >= 0.90 is On Track."
          />
          <StatTile
            label="Habit Consistency"
            value="85.7"
            unit="%"
            qualifier="28-day study block consistency"
            statusVariant="on_track"
            formula="Consistency % = Completions / (Scheduled Occurrences - Excused Skips)"
            formulaExplanation="Excludes Sundays designated as fair rest days per PRD HB-3."
          />
          <StatTile
            label="Forecast Finish"
            value="Nov 24"
            unit="± 3d"
            qualifier="14-day velocity range"
            statusVariant="neutral"
            formula="Forecast = Start Date + (Elapsed Time / Progress %)"
            formulaExplanation="Displays a truthful window rather than a single false-precision date."
          />
        </div>
      </section>

      {/* 3. Button & Form Input Hierarchy */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-accent)]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            3. Controls & Form Primitives (Strict Hallmark Hierarchy)
          </h4>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-5">
          {/* Button Styles */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--color-ink)]">
              Button Hierarchy (Only 1 primary per view, instant focus outline):
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="primary">Primary Signal</Button>
              <Button variant="secondary">Secondary Hairline</Button>
              <Button variant="ghost">Typographic Ghost</Button>
              <Button variant="danger">Destructive</Button>
              <Button variant="secondary" isLoading>Saving Entry</Button>
              <Button variant="secondary" disabled>Disabled State</Button>
            </div>
          </div>

          <div className="hairline-b" />

          {/* Form Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Task / Target Title"
              placeholder="e.g. Write Kerberoasting detection card"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              helperText="Instant focus outline, constant 1px border width."
            />
            <Input
              label="Estimate Duration"
              type="number"
              unit="mins"
              defaultValue={90}
              helperText="Tabular numerals with unit badge."
            />
            <Input
              label="Target Metric Value"
              type="number"
              unit="rules"
              defaultValue={3}
              error={testInput.length > 30 ? 'Title exceeds 30 characters' : undefined}
              helperText="Error message reserves height to avoid layout jump."
            />
          </div>
        </div>
      </section>

      {/* 4. Hairline Table Primitive */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            4. Hairline Table Ledger (PRD Section 7.4)
          </h4>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Sentence-case heads · Hairlines only</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] overflow-hidden">
          <HairlineTable
            columns={columns}
            data={SAMPLE_MILESTONES}
            keyExtractor={(r) => r.id}
          />
        </div>
      </section>

      {/* Test Modal Component */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Seshat Ledger Modal Inspector"
        subtitle="Hallmark Z-level 400 · Measured scrim · Escape key trap"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Acknowledge
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-xs text-[var(--color-ink-muted)]">
          <p>
            This dialog implements the accessible modal pattern defined in the PRD and Hallmark craft guide.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Escape key closes instantly.</li>
            <li>Background click dismisses.</li>
            <li>No glowing neon or blurred drop shadows.</li>
            <li>Consistent typography scale with tabular numerals.</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};
