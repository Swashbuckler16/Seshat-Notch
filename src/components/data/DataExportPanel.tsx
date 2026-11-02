import React, { useState } from 'react';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import { getLocalDateString } from '../../utils/dateUtils';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  HardDrive,
} from 'lucide-react';

interface DataExportPanelProps {
  onNotify: (msg: string) => void;
}

export const DataExportPanel: React.FC<DataExportPanelProps> = ({ onNotify }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = async () => {
    try {
      setDownloading('json');
      const result = await dataOwnershipService.saveBackupToLocalFile();
      if (result.saved) {
        onNotify(`Full JSON backup saved (${result.filename}).`);
      }
    } catch (err: unknown) {
      onNotify(`Export error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportCsv = async (
    table: 'tasks' | 'projects' | 'targets' | 'habits' | 'timeSessions' | 'progressLogs'
  ) => {
    try {
      setDownloading(`csv-${table}`);
      const csv = await dataOwnershipService.exportTableToCsv(table);
      const dateStr = getLocalDateString();
      triggerDownload(csv, `seshat-${table}-${dateStr}.csv`, 'text/csv');
      onNotify(`${table}.csv downloaded successfully.`);
    } catch (err: unknown) {
      onNotify(`CSV export error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      setDownloading('markdown');
      const md = await dataOwnershipService.exportAllToMarkdown();
      const dateStr = getLocalDateString();
      triggerDownload(md, `seshat-field-ledger-${dateStr}.md`, 'text/markdown');
      onNotify('Markdown field ledger downloaded.');
    } catch (err: unknown) {
      onNotify(`Markdown export error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const md = await dataOwnershipService.exportAllToMarkdown();
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      onNotify('Markdown field ledger copied to clipboard.');
      setTimeout(() => setCopiedMd(false), 3000);
    } catch (err: unknown) {
      onNotify(`Copy error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Overview Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="text-xs font-bold text-[var(--color-ink)] ">
            Save a copy of your plans
          </h3>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Save everything in one backup file, or download a simple text copy of your plan.
        </p>
      </div>

      {/* 3 Primary Export Formats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Complete JSON Backup */}
        <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink)]">
              <FileJson className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Full backup file</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Includes your projects, tasks, habits, reviews, and settings so you can restore them later.
            </p>
          </div>

          <button
            type="button"
            disabled={downloading === 'json'}
            onClick={handleExportJson}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-11"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading === 'json' ? 'Saving…' : 'Save backup file'}</span>
          </button>
        </div>

        {/* 2. Markdown Field Ledger */}
        <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink)]">
              <FileText className="w-4 h-4 text-[var(--color-emerald)]" />
              <span>Readable plan</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              A text version of your projects, goals, tasks, and habits that is easy to read or share.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={downloading === 'markdown'}
              onClick={handleExportMarkdown}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] text-xs font-medium text-[var(--color-ink)] transition-colors disabled:opacity-50 min-h-11"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download text copy</span>
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] text-xs font-medium text-[var(--color-ink)] transition-colors min-h-11"
              title="Copy to clipboard"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-[var(--color-emerald)]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* 3. CSV Spreadsheet Tables */}
        <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink)]">
              <FileSpreadsheet className="w-4 h-4 text-[var(--color-status-at-risk)]" />
              <span>Table-by-Table CSV</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Standard RFC 4180 CSV files suitable for spreadsheet analysis in Excel, LibreOffice, or data science pipelines in Python/R.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
            {(
              [
                ['tasks', 'Tasks'],
                ['projects', 'Projects'],
                ['targets', 'Targets'],
                ['habits', 'Habits'],
                ['timeSessions', 'Time'],
                ['progressLogs', 'Logs'],
              ] as const
            ).map(([tbl, label]) => (
              <button
                key={tbl}
                type="button"
                disabled={downloading === `csv-${tbl}`}
                onClick={() => handleExportCsv(tbl)}
                className="py-1 px-2 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] transition-colors flex items-center justify-between"
              >
                <span>{label}.csv</span>
                <Download className="w-3 h-3 text-[var(--color-ink-muted)]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
