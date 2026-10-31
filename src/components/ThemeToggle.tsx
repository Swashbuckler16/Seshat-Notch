import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light';
    setMode(current);
  }, []);

  const toggleTheme = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    document.documentElement.dataset.mode = next;
    localStorage.setItem('seshat-theme', next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-[var(--color-rule)] rounded-[var(--radius-xs)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] transition-opacity"
      title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} theme`}
      aria-label="Toggle visual theme"
    >
      {mode === 'light' ? (
        <>
          <Moon className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
          <span>Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
          <span>Light</span>
        </>
      )}
    </button>
  );
};

