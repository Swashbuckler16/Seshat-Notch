import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Hallmark-compliant Modal Dialog Primitive
 * - Z-level 400 per Craft § 3.
 * - Measured opacity scrim (no heavy blur or glow).
 * - Full Escape key listening.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[var(--color-scrim)] backdrop-contrast-125"
    >
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Dialog Surface */}
      <div
        className={`relative w-full ${widthClass} bg-[var(--color-paper)] border border-[var(--color-rule-strong)] rounded-[var(--radius-sm)] flex flex-col max-h-[90vh] overflow-hidden z-10 text-[var(--color-ink)]`}
      >
        {/* Header */}
        <div className="hairline-b px-5 py-3.5 flex items-center justify-between bg-[var(--color-paper-2)]">
          <div>
            <h3 className="font-semibold text-sm leading-tight">{title}</h3>
            {subtitle && (
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded-[var(--radius-xs)] hover:bg-[var(--color-paper-3)] transition-opacity"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs leading-relaxed">
          {children}
        </div>

        {/* Footer (if provided) */}
        {footer && (
          <div className="hairline-t px-5 py-3 bg-[var(--color-paper-2)] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

