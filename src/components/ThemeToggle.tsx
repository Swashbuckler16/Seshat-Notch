import React, { useState } from 'react';
import { Check, ChevronDown, Moon, Palette, Sun } from 'lucide-react';

type PaletteId = 'seshat' | 'ocean' | 'berry';
type ColorMode = 'light' | 'dark';

const palettes: { id: PaletteId; name: string; description: string }[] = [
  { id: 'seshat', name: 'Leaf & earth', description: 'Warm brown with green' },
  { id: 'ocean', name: 'Ocean', description: 'Blue with sea glass' },
  { id: 'berry', name: 'Berry', description: 'Plum with soft coral' },
];

export const ThemeToggle: React.FC = () => {
  const [mode, setMode] = useState<ColorMode>(
    () => document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light'
  );
  const [palette, setPalette] = useState<PaletteId>(() => {
    const saved = document.documentElement.dataset.palette;
    return saved === 'ocean' || saved === 'berry' ? saved : 'seshat';
  });

  const choosePalette = (next: PaletteId) => {
    setPalette(next);
    document.documentElement.dataset.palette = next;
    localStorage.setItem('seshat-palette', next);
  };

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    document.documentElement.dataset.mode = next;
    localStorage.setItem('seshat-theme', next);
  };

  const selectedPalette = palettes.find((option) => option.id === palette) ?? palettes[0];

  return (
    <details className="appearance-picker">
      <summary className="appearance-picker-trigger" aria-label="Choose appearance">
        <Palette className="w-4 h-4" aria-hidden="true" />
        <span>Appearance</span>
        <ChevronDown className="w-3.5 h-3.5 appearance-chevron" aria-hidden="true" />
      </summary>
      <div className="appearance-picker-panel">
        <fieldset className="flex flex-col gap-1.5 border-0 p-0 m-0">
          <legend className="appearance-picker-heading">Color palette</legend>
          {palettes.map((option) => (
            <button
              key={option.id}
              type="button"
              className="appearance-palette-option"
              aria-pressed={palette === option.id}
              onClick={() => choosePalette(option.id)}
            >
              <span className="appearance-swatches" data-palette={option.id} aria-hidden="true">
                <span />
                <span />
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-sm font-medium text-[var(--color-ink)]">{option.name}</span>
                <span className="text-xs text-[var(--color-ink-muted)]">{option.description}</span>
              </span>
              {palette === option.id && <Check className="w-4 h-4 text-[var(--color-accent)]" aria-hidden="true" />}
            </button>
          ))}
        </fieldset>
        <div className="appearance-mode-row">
          <span>
            {mode === 'dark' ? <Moon className="w-4 h-4" aria-hidden="true" /> : <Sun className="w-4 h-4" aria-hidden="true" />}
            <span>{mode === 'dark' ? 'Dark appearance' : 'Light appearance'}</span>
          </span>
          <button type="button" className="appearance-mode-toggle" onClick={toggleMode}>
            Use {mode === 'light' ? 'dark' : 'light'}
          </button>
        </div>
        <span className="sr-only" aria-live="polite">{selectedPalette.name} palette selected.</span>
      </div>
    </details>
  );
};
