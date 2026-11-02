import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Hallmark-compliant Button Primitive
 * - Adheres strictly to Gate F4 & 39b: 1 filled primary per view, secondaries outlined or typographic.
 * - Transitions use transform & opacity only (Floor 2: banned transition-all).
 * - Instant :focus-visible outline (Floor 6).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', isLoading = false, className = '', disabled, children, ...props }, ref) => {
    // Sizing: app UI 32px to 40px with a 44px hit target
    const sizeClasses = {
      sm: 'h-8 px-2.5 text-xs',
      md: 'h-9 px-3.5 text-xs',
      lg: 'h-10 px-4 text-sm',
    }[size];

    const variantClasses = {
      primary:
        'bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)] border border-transparent font-medium shadow-sm',
      secondary:
        'bg-[var(--color-paper-2)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-normal',
      ghost:
        'bg-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] border border-transparent font-normal',
      danger:
        'bg-[var(--color-status-behind-bg)] text-[var(--color-status-behind)] hover:opacity-90 border border-[var(--color-rule)] font-medium',
    }[variant];

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-xs)] select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-3.5 w-3.5 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
