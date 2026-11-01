import React, { useState } from 'react';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import {
  Upload,
  FileJson,
  FileText,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface DataImportPanelProps {
  onNotify: (msg: string) => void;
  onRefresh?: () => void;
}

export const DataImportPanel: React.FC<DataImportPanelProps> = ({ onNotify, onRefresh }) => {
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [jsonText, setJsonText] = useState('');
  const [markdownText, setMarkdownText] = useState('');
  const [activeTab, setActiveTab] = useState<'json' | 'markdown'>('json');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        setJsonText(content);
        setActiveTab('json');
        onNotify(`Loaded ${file.name} into import preview.`);
      } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        setMarkdownText(content);
        setActiveTab('markdown');
        onNotify(`Loaded ${file.name} into Markdown preview.`);
      }
    };
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    if (!jsonText.trim()) {
      onNotify('Please paste or upload a JSON backup file first.');
      return;
    }

    if (
      importMode === 'replace' &&
      !window.confirm(
        'REPLACE MODE will clear current local data and restore the backup. An automatic safety snapshot will be created before applying. Proceed?'
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      const res = await dataOwnershipService.importFromJson(jsonText, importMode);
      onNotify(
        `Imported ${res.importedCount} records across ${res.tablesUpdated.length} tables (${importMode} mode).`
      );
      setJsonText('');
      onRefresh?.();
    } catch (err: unknown) {
      onNotify(`JSON import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportMarkdown = async () => {
    if (!markdownText.trim()) {
      onNotify('Please enter or paste a Markdown checklist first.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await dataOwnershipService.importFromMarkdown(markdownText);
      onNotify(`Created ${res.createdTasksCount} tasks from Markdown checklist.`);
      setMarkdownText('');
      onRefresh?.();
    } catch (err: unknown) {
      onNotify(`Markdown import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
            Import Data & Plans
          </h3>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Restore a previous backup or bulk-import tasks and plans from Markdown checklists using the grammar engine.
        </p>
      </div>

      {/* Import Method Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-rule)] pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] font-medium transition-colors ${
            activeTab === 'json'
              ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)] font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          <FileJson className="w-3.5 h-3.5" />
          <span>Full JSON Database Backup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('markdown')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] font-medium transition-colors ${
            activeTab === 'markdown'
              ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)] font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Markdown Plan / Checklist</span>
        </button>
      </div>

      {/* JSON Backup Importer */}
      {activeTab === 'json' && (
        <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-xs text-[var(--color-ink)]">
                Restore or Merge Database Snapshot
              </span>
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                Upload or paste a `.json` backup file exported from Seshat Notch.
              </p>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[var(--color-ink-muted)] text-[11px]">Mode:</span>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="accent-[var(--color-accent)]"
                />
                <span>Merge (LWW)</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-[var(--color-accent)]"
                />
                <span className="text-[var(--color-rose)]">Replace all</span>
              </label>
            </div>
          </div>

          {/* File Picker */}
          <div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] cursor-pointer text-[var(--color-ink)] transition-colors">
              <Upload className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Choose JSON Backup File…</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Or paste JSON snapshot content here directly…"
            rows={6}
            className="w-full text-xs font-mono p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-ink-muted)] flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>A safety snapshot is always taken before importing.</span>
            </span>

            <button
              type="button"
              disabled={isProcessing || !jsonText.trim()}
              onClick={handleImportJson}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-11"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Processing…' : `Apply ${importMode === 'replace' ? 'Replace' : 'Merge'} Import`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Markdown Checklist Importer */}
      {activeTab === 'markdown' && (
        <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-4">
          <div>
            <span className="font-semibold text-xs text-[var(--color-ink)]">
              Markdown Checklist & Grammar Importer
            </span>
            <p className="text-[11px] text-[var(--color-ink-muted)]">
              Paste a markdown list of tasks. Tags like `#project`, `@date`, `~estimate`, and `!priority` are automatically parsed!
            </p>
          </div>

          <div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] cursor-pointer text-[var(--color-ink)] transition-colors">
              <Upload className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Upload Markdown File…</span>
              <input type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            value={markdownText}
            onChange={(e) => setMarkdownText(e.target.value)}
            placeholder={`Example:
- [ ] Write Kerberoasting detection card #heimdall ~90m !high @2026-11-06 +rules:2
- [ ] Configure Sysmon Event ID 1 telemetry pipeline #heimdall ~45m !med @today
- [x] Initial SOC lab network architecture diagram #heimdall ~120m`}
            rows={7}
            className="w-full text-xs font-mono p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isProcessing || !markdownText.trim()}
              onClick={handleImportMarkdown}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-11"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Importing…' : 'Import Tasks from Markdown'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
