import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  unit?: string;
}

/**
 * Hallmark-compliant Text Input Primitive
 * - Gate 39a: Constant border width; focus ring uses outline, never border change.
 * - Gate F14: Reserved min-height for helper text to prevent layout shift.
 * - Tabular figures on numeric inputs.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, unit, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--color-ink)] select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] placeholder:text-[var(--color-ink-subtle)] disabled:opacity-55 disabled:cursor-not-allowed ${
              props.type === 'number' ? 'tabular-figure font-mono' : ''
            } ${unit ? 'pr-12' : ''} ${error ? 'border-[var(--color-status-behind)]' : ''} ${className}`}
            {...props}
          />
          {unit && (
            <span className="absolute right-3 text-xs text-[var(--color-ink-muted)] font-mono pointer-events-none select-none">
              {unit}
            </span>
          )}
        </div>

        {/* F14: Reserved helper text container */}
        <div className="min-h-[1.125rem] text-[11px] leading-tight">
          {error ? (
            <span className="text-[var(--color-status-behind)] font-medium">{error}</span>
          ) : helperText ? (
            <span className="text-[var(--color-ink-muted)]">{helperText}</span>
          ) : null}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

