import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Hallmark-compliant Tab Navigation Primitive
 * - Craft § 9: Scrolls sideways rather than wrapping.
 * - State indicated by soft background and ink, not primary filled button.
 * - Tabular figures on badges/counts.
 */
export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex items-center overflow-x-auto no-scrollbar hairline-b gap-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-[1px] whitespace-nowrap transition-opacity cursor-pointer select-none ${
              isActive
                ? 'border-[var(--color-accent)] text-[var(--color-ink)] bg-[var(--color-paper-2)]/50'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule)]'
            }`}
          >
            {tab.icon && <span className="w-3.5 h-3.5 text-current shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="tabular-figure font-mono text-[10px] px-1 rounded bg-[var(--color-paper-3)] text-[var(--color-ink-muted)]">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

