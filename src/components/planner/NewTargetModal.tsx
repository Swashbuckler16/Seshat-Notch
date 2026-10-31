import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TargetHorizon, MetricType, EntityId } from '../../types';
import { domainService } from '../../services/domainService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Check } from 'lucide-react';

interface NewTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHorizon?: TargetHorizon;
  defaultPeriod?: string;
  defaultProjectId?: EntityId;
}

export const NewTargetModal: React.FC<NewTargetModalProps> = ({
  isOpen,
  onClose,
  defaultHorizon = 'week',
  defaultPeriod = '',
  defaultProjectId = '',
}) => {
  const [title, setTitle] = useState('');
  const [horizon, setHorizon] = useState<TargetHorizon>(defaultHorizon);
  const [period, setPeriod] = useState(defaultPeriod);
  const [projectId, setProjectId] = useState<string>(defaultProjectId);
  const [targetValue, setTargetValue] = useState<number>(5);
  const [unit, setUnit] = useState('items');
  const [metricType, setMetricType] = useState<MetricType>('numeric');
  const weight = 1.0;

  // Projects list for linking
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.isDeleted).toArray());

  useEffect(() => {
    setHorizon(defaultHorizon);
    setPeriod(defaultPeriod);
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultHorizon, defaultPeriod, defaultProjectId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetValue <= 0) return;

    await domainService.createTarget({
      title: title.trim(),
      horizon,
      period: period.trim(),
      projectId: projectId || undefined,
      targetValue: Number(targetValue),
      currentValue: 0,
      unit: unit.trim() || 'count',
      metricType,
      weight: Number(weight) || 1.0,
      status: 'not_started',
    });

    setTitle('');
    setTargetValue(5);
    setUnit('items');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New target"
      subtitle="Set a measurable milestone or target for this planning period."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!title.trim() || targetValue <= 0 || !period.trim()}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Create target</span>
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Target title"
          placeholder="e.g. Document 3 detection rules and test coverage"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink)]">
              Horizon
            </label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as TargetHorizon)}
              className="h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] font-medium"
            >
              <option value="month">Monthly</option>
              <option value="week">Weekly</option>
              <option value="day">Daily</option>
            </select>
          </div>

          <Input
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            helperText={
              horizon === 'month'
                ? 'Format: YYYY-MM (e.g. 2026-10)'
                : horizon === 'week'
                ? 'Format: YYYY-Www (e.g. 2026-W44)'
                : 'Format: YYYY-MM-DD (e.g. 2026-10-31)'
            }
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink)]">
              Associated project (optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
            >
              <option value="">None (Independent effort)</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink)]">
              Metric type
            </label>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as MetricType)}
              className="h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
            >
              <option value="numeric">Numeric count</option>
              <option value="duration">Duration (minutes)</option>
              <option value="percentage">Percentage (0–100)</option>
              <option value="boolean">Done / Not Done</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target value"
            type="number"
            min="0.1"
            step="any"
            value={targetValue}
            onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
            required
          />
          <Input
            label="Unit"
            placeholder="e.g. rules, detections, pages"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
};
