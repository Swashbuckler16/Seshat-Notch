import { db } from '../db/index.ts';
import type {
  EntityId,
  RecoveryBinItem,
  BackupSnapshot,
  Area,
  ProjectGoal,
  MilestonePhase,
  Target,
  Task,
  Habit,
  Routine,
  ProgressLog,
  TimeSession,
  Review,
  Blocker,
  ChangeLogEntry,
} from '../types/index.ts';
import { recordChange } from '../db/changeLogService.ts';
import { parseQuickAdd } from '../utils/quickAddParser.ts';
import { getLocalDateString, getDayBoundaryHour, setDayBoundaryHour } from '../utils/dateUtils.ts';
import { reminderService, type ReminderSettings } from './reminderService.ts';
import { desktopShellService } from './desktopShellService.ts';

function getCurrentUTC(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `bak_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Simple deterministic hash for PIN lock (client-side offline lock)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sn_pin_${Math.abs(hash).toString(16)}`;
}

export interface BackupPreferencesPayload {
  dayBoundaryHour?: number;
  reminderSettings?: ReminderSettings;
  dailyBackupPromptEnabled?: boolean;
  theme?: string | null;
}

export interface FullBackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  schemaVersion: number;
  preferences?: BackupPreferencesPayload;
  data: {
    areas: Area[];
    projects: ProjectGoal[];
    milestones: MilestonePhase[];
    targets: Target[];
    tasks: Task[];
    habits: Habit[];
    routines: Routine[];
    progressLogs: ProgressLog[];
    timeSessions: TimeSession[];
    reviews: Review[];
    blockers: Blocker[];
    changeLogs: ChangeLogEntry[];
    settings?: Array<{ key: string; value: string; updatedAt: string }>;
  };
}

const LAST_FILE_BACKUP_KEY = 'seshat_last_file_backup_date';
const DAILY_BACKUP_PROMPT_KEY = 'seshat_daily_backup_prompt_enabled';
const BACKUP_SNOOZED_DATE_KEY = 'seshat_backup_snoozed_date';

export const dataOwnershipService = {
  // =========================================================================
  // 1. RECOVERY BIN (Soft delete with recovery bin; plan history retained)
  // =========================================================================

  async getRecoveryBinItems(): Promise<RecoveryBinItem[]> {
    const [
      deletedProjects,
      deletedMilestones,
      deletedTargets,
      deletedTasks,
      deletedHabits,
      deletedRoutines,
      changeLogs,
    ] = await Promise.all([
      db.projects.filter((p) => Boolean(p.isDeleted)).toArray(),
      db.milestones.filter((m) => Boolean(m.isDeleted)).toArray(),
      db.targets.filter((t) => Boolean(t.isDeleted)).toArray(),
      db.tasks.filter((t) => Boolean(t.isDeleted)).toArray(),
      db.habits.filter((h) => Boolean(h.isDeleted)).toArray(),
      db.routines.filter((r) => Boolean(r.isDeleted)).toArray(),
      db.changeLogs.filter((c) => c.action === 'soft_delete').toArray(),
    ]);

    const findDeletionMeta = (entityId: EntityId, defaultDate: string) => {
      const match = changeLogs
        .filter((c) => c.entityId === entityId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return {
        deletedAt: match ? match.timestamp : defaultDate,
        reason: match ? match.reason : undefined,
      };
    };

    const items: RecoveryBinItem[] = [];

    for (const p of deletedProjects) {
      const meta = findDeletionMeta(p.id, p.updatedAt);
      items.push({
        id: p.id,
        entityType: 'project',
        title: p.title,
        deletedAt: meta.deletedAt,
        reason: meta.reason,
        originalData: p,
      });
    }

    for (const m of deletedMilestones) {
      const meta = findDeletionMeta(m.id, m.updatedAt);
      items.push({
        id: m.id,
        entityType: 'milestone',
        title: m.title,
        deletedAt: meta.deletedAt,
        reason: meta.reason,
        originalData: m,
      });
    }

    for (const t of deletedTargets) {
      const meta = findDeletionMeta(t.id, t.updatedAt);
      items.push({
        id: t.id,
        entityType: 'target',
        title: t.title,
        deletedAt: meta.deletedAt,
        reason: meta.reason,
        originalData: t,
      });
    }

    for (const task of deletedTasks) {
      const meta = findDeletionMeta(task.id, task.updatedAt);
      items.push({
        id: task.id,
        entityType: 'task',
        title: task.title,
        deletedAt: meta.deletedAt,
        reason: meta.reason,
        originalData: task,
      });
    }

    for (const h of deletedHabits) {
      const meta = findDeletionMeta(h.id, h.updatedAt);
      items.push({
        id: h.id,
        entityType: 'habit',
        title: h.title,
        deletedAt: meta.deletedAt,
        reason: meta.reason,
        originalData: h,
      });
    }

    for (const r of deletedRoutines) {
      const meta = findDeletionMeta(r.id, r.updatedAt);
      items.push({
        id: r.id,
        entityType: 'routine',
        title: r.title,
        deletedAt: meta.deletedAt,
        reason: meta.reason,
        originalData: r,
      });
    }

    // Sort newest deletion first
    return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  },

  async restoreItem(entityType: string, id: EntityId): Promise<void> {
    const now = getCurrentUTC();

    await db.transaction(
      'rw',
      [db.projects, db.milestones, db.targets, db.tasks, db.habits, db.routines, db.changeLogs],
      async () => {
        switch (entityType) {
          case 'project':
            await db.projects.update(id, { isDeleted: false, updatedAt: now });
            break;
          case 'milestone':
            await db.milestones.update(id, { isDeleted: false, updatedAt: now });
            break;
          case 'target':
            await db.targets.update(id, { isDeleted: false, updatedAt: now });
            break;
          case 'task':
            await db.tasks.update(id, { isDeleted: false, updatedAt: now });
            break;
          case 'habit':
            await db.habits.update(id, { isDeleted: false, updatedAt: now });
            break;
          case 'routine':
            await db.routines.update(id, { isDeleted: false, updatedAt: now });
            break;
          default:
            throw new Error(`Unknown entity type: ${entityType}`);
        }

        await recordChange({
          entityType,
          entityId: id,
          action: 'update',
          fieldChanged: 'isDeleted',
          oldValue: true,
          newValue: false,
          reason: 'Restored from recovery bin',
        });
      }
    );
  },

  async permanentDeleteItem(entityType: string, id: EntityId): Promise<void> {
    await db.transaction(
      'rw',
      [db.projects, db.milestones, db.targets, db.tasks, db.habits, db.routines, db.changeLogs],
      async () => {
        switch (entityType) {
          case 'project':
            await db.projects.delete(id);
            break;
          case 'milestone':
            await db.milestones.delete(id);
            break;
          case 'target':
            await db.targets.delete(id);
            break;
          case 'task':
            await db.tasks.delete(id);
            break;
          case 'habit':
            await db.habits.delete(id);
            break;
          case 'routine':
            await db.routines.delete(id);
            break;
          default:
            throw new Error(`Unknown entity type: ${entityType}`);
        }

        await recordChange({
          entityType,
          entityId: id,
          action: 'hard_delete',
          reason: 'Permanently purged from recovery bin',
        });
      }
    );
  },

  async emptyRecoveryBin(): Promise<number> {
    const items = await this.getRecoveryBinItems();
    await db.transaction(
      'rw',
      [db.projects, db.milestones, db.targets, db.tasks, db.habits, db.routines, db.changeLogs],
      async () => {
        for (const item of items) {
          await this.permanentDeleteItem(item.entityType, item.id);
        }
      }
    );
    return items.length;
  },

  // =========================================================================
  // 2. DATA EXPORT (JSON, CSV, Markdown & Local File System Backup)
  // =========================================================================

  async exportAllToJson(): Promise<string> {
    const [
      areas,
      projects,
      milestones,
      targets,
      tasks,
      habits,
      routines,
      progressLogs,
      timeSessions,
      reviews,
      blockers,
      changeLogs,
      settings,
    ] = await Promise.all([
      db.areas.toArray(),
      db.projects.toArray(),
      db.milestones.toArray(),
      db.targets.toArray(),
      db.tasks.toArray(),
      db.habits.toArray(),
      db.routines.toArray(),
      db.progressLogs.toArray(),
      db.timeSessions.toArray(),
      db.reviews.toArray(),
      db.blockers.toArray(),
      db.changeLogs.toArray(),
      db.settings.toArray(),
    ]);

    let currentTheme: string | null = null;
    try {
      if (typeof localStorage !== 'undefined') {
        currentTheme = localStorage.getItem('seshat-theme');
      }
    } catch {
      // Ignore storage access errors
    }

    const payload: FullBackupPayload = {
      app: 'Seshat Notch',
      version: '1.0.0',
      exportedAt: getCurrentUTC(),
      schemaVersion: 2,
      preferences: {
        dayBoundaryHour: getDayBoundaryHour(),
        reminderSettings: reminderService.getSettings(),
        dailyBackupPromptEnabled: this.isDailyBackupPromptEnabled(),
        theme: currentTheme,
      },
      data: {
        areas,
        projects,
        milestones,
        targets,
        tasks,
        habits,
        routines,
        progressLogs,
        timeSessions,
        reviews,
        blockers,
        changeLogs,
        settings,
      },
    };

    return JSON.stringify(payload, null, 2);
  },

  /**
   * Saves a full JSON backup directly to a local file on disk (Tauri Windows desktop shell,
   * Windows File System Access API, or standard browser download fallback) and records the backup date.
   */
  async saveBackupToLocalFile(): Promise<{ saved: boolean; filename: string; path?: string }> {
    const jsonString = await this.exportAllToJson();
    const todayStr = getLocalDateString();
    const filename = `seshat-notch-backup-${todayStr}.json`;

    // 1. Try silent native disk write when running inside the Tauri Windows Desktop Shell
    const tauriRes = await desktopShellService.writeSilentDesktopBackup(filename, jsonString);
    if (tauriRes.saved) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LAST_FILE_BACKUP_KEY, todayStr);
        }
      } catch {
        // Ignore
      }
      return { saved: true, filename, path: tauriRes.path };
    }

    // 2. Try Windows File System Access API picker
    const win = typeof window !== 'undefined' ? (window as unknown as { showSaveFilePicker?: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }> }) : undefined;

    if (win && typeof win.showSaveFilePicker === 'function') {
      try {
        const handle = await win.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Seshat Notch JSON Backup',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        localStorage.setItem(LAST_FILE_BACKUP_KEY, todayStr);
        return { saved: true, filename };
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return { saved: false, filename };
        }
        // Fallback to download if picker fails
      }
    }

    if (typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem(LAST_FILE_BACKUP_KEY, todayStr);
      return { saved: true, filename };
    }

    return { saved: false, filename };
  },

  getLastFileBackupDate(): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_FILE_BACKUP_KEY) : null;
    } catch {
      return null;
    }
  },

  isDailyBackupPromptEnabled(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DAILY_BACKUP_PROMPT_KEY);
        return raw === null ? true : raw === 'true';
      }
    } catch {
      // Ignore
    }
    return true;
  },

  setDailyBackupPromptEnabled(enabled: boolean): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DAILY_BACKUP_PROMPT_KEY, enabled ? 'true' : 'false');
      }
    } catch {
      // Ignore
    }
  },

  snoozeBackupPromptForToday(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BACKUP_SNOOZED_DATE_KEY, getLocalDateString());
      }
    } catch {
      // Ignore
    }
  },

  isBackupDueToday(todayStr = getLocalDateString()): boolean {
    if (!this.isDailyBackupPromptEnabled()) return false;
    const lastBackup = this.getLastFileBackupDate();
    if (lastBackup === todayStr) return false;
    try {
      if (typeof localStorage !== 'undefined') {
        const snoozed = localStorage.getItem(BACKUP_SNOOZED_DATE_KEY);
        if (snoozed === todayStr) return false;
      }
    } catch {
      // Ignore
    }
    return true;
  },

  async exportTableToCsv(
    tableName: 'tasks' | 'projects' | 'targets' | 'habits' | 'timeSessions' | 'progressLogs'
  ): Promise<string> {
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    if (tableName === 'tasks') {
      const records = await db.tasks.toArray();
      const headers = ['id', 'title', 'scheduleDate', 'dueDate', 'priority', 'status', 'estimateMinutes', 'actualMinutes', 'projectId', 'isDeleted'];
      const rows = records.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.title),
        escapeCsv(r.scheduleDate || ''),
        escapeCsv(r.dueDate || ''),
        escapeCsv(r.priority),
        escapeCsv(r.status),
        escapeCsv(r.estimateMinutes || 0),
        escapeCsv(r.actualMinutes || 0),
        escapeCsv(r.projectId || ''),
        escapeCsv(r.isDeleted ? '1' : '0'),
      ]);
      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    if (tableName === 'projects') {
      const records = await db.projects.toArray();
      const headers = ['id', 'title', 'isGoal', 'areaId', 'priority', 'status', 'startDate', 'endDate', 'why', 'successCriteria', 'isDeleted'];
      const rows = records.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.title),
        escapeCsv(r.isGoal ? 'true' : 'false'),
        escapeCsv(r.areaId),
        escapeCsv(r.priority),
        escapeCsv(r.status),
        escapeCsv(r.startDate),
        escapeCsv(r.endDate || ''),
        escapeCsv(r.why || ''),
        escapeCsv(r.successCriteria || ''),
        escapeCsv(r.isDeleted ? '1' : '0'),
      ]);
      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    if (tableName === 'targets') {
      const records = await db.targets.toArray();
      const headers = ['id', 'title', 'horizon', 'period', 'metricType', 'currentValue', 'targetValue', 'unit', 'projectId', 'status'];
      const rows = records.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.title),
        escapeCsv(r.horizon),
        escapeCsv(r.period),
        escapeCsv(r.metricType),
        escapeCsv(r.currentValue),
        escapeCsv(r.targetValue),
        escapeCsv(r.unit),
        escapeCsv(r.projectId || ''),
        escapeCsv(r.status),
      ]);
      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    if (tableName === 'habits') {
      const records = await db.habits.toArray();
      const headers = ['id', 'title', 'scheduleType', 'targetValue', 'unit', 'isAvoidance', 'linkedGoalId', 'startDate', 'isArchived'];
      const rows = records.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.title),
        escapeCsv(r.scheduleType),
        escapeCsv(r.targetValue),
        escapeCsv(r.unit || ''),
        escapeCsv(r.isAvoidance ? 'true' : 'false'),
        escapeCsv(r.linkedGoalId || ''),
        escapeCsv(r.startDate),
        escapeCsv(r.isArchived ? 'true' : 'false'),
      ]);
      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    if (tableName === 'timeSessions') {
      const records = await db.timeSessions.toArray();
      const headers = ['id', 'startTime', 'endTime', 'durationMinutes', 'kind', 'entityType', 'entityId', 'note'];
      const rows = records.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.startTime),
        escapeCsv(r.endTime || ''),
        escapeCsv(r.durationMinutes),
        escapeCsv(r.kind),
        escapeCsv(r.entityType),
        escapeCsv(r.entityId),
        escapeCsv(r.note || ''),
      ]);
      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    if (tableName === 'progressLogs') {
      const records = await db.progressLogs.toArray();
      const headers = ['id', 'date', 'timestamp', 'entityType', 'entityId', 'value', 'unit', 'note'];
      const rows = records.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.date),
        escapeCsv(r.timestamp),
        escapeCsv(r.entityType),
        escapeCsv(r.entityId),
        escapeCsv(r.value),
        escapeCsv(r.unit),
        escapeCsv(r.note || ''),
      ]);
      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    throw new Error(`Unsupported CSV table: ${tableName}`);
  },

  async exportAllToMarkdown(): Promise<string> {
    const [areas, projects, targets, tasks, habits] = await Promise.all([
      db.areas.filter((a) => !a.isArchived).sortBy('order'),
      db.projects.filter((p) => !p.isDeleted).toArray(),
      db.targets.filter((t) => !t.isDeleted).toArray(),
      db.tasks.filter((t) => !t.isDeleted).toArray(),
      db.habits.filter((h) => !h.isDeleted).toArray(),
    ]);

    const lines: string[] = [];
    lines.push('# Seshat Notch — Master Planning Field Ledger');
    lines.push(`Generated: ${getCurrentUTC()}\n`);

    lines.push('## 1. Life Areas & Projects\n');
    for (const area of areas) {
      lines.push(`### Area: ${area.name}`);
      const areaProjects = projects.filter((p) => p.areaId === area.id);
      if (areaProjects.length === 0) {
        lines.push('_No active projects defined._\n');
        continue;
      }

      for (const p of areaProjects) {
        lines.push(`- **${p.title}** [${p.status.toUpperCase()} | Priority: ${p.priority}]`);
        if (p.why) lines.push(`  - *Why*: ${p.why}`);
        if (p.successCriteria) lines.push(`  - *Success Criteria*: ${p.successCriteria}`);
        if (p.startDate) lines.push(`  - *Timeline*: ${p.startDate} ${p.endDate ? `to ${p.endDate}` : ''}`);

        // Linked targets
        const pTargets = targets.filter((t) => t.projectId === p.id);
        if (pTargets.length > 0) {
          lines.push('  - *Targets*:');
          for (const t of pTargets) {
            lines.push(`    - [${t.horizon}] ${t.title}: ${t.currentValue}/${t.targetValue} ${t.unit}`);
          }
        }
      }
      lines.push('');
    }

    lines.push('## 2. Active Scheduled Tasks\n');
    const sortedTasks = [...tasks].sort((a, b) => (a.scheduleDate || '9999').localeCompare(b.scheduleDate || '9999'));
    for (const task of sortedTasks.slice(0, 50)) {
      const box = task.status === 'done' ? '[x]' : '[ ]';
      const datePart = task.scheduleDate ? `@${task.scheduleDate}` : '@unscheduled';
      const estPart = task.estimateMinutes ? `~${task.estimateMinutes}m` : '';
      const prioPart = `!${task.priority}`;
      lines.push(`- ${box} ${task.title} ${datePart} ${estPart} ${prioPart}`);
    }
    lines.push('');

    lines.push('## 3. Habit Tracker Cadence\n');
    for (const h of habits) {
      const typeStr = h.isAvoidance ? 'Avoidance' : h.scheduleType;
      lines.push(`- **${h.title}** (${typeStr}) — Target: ${h.targetValue} ${h.unit || ''}`);
    }

    return lines.join('\n');
  },

  // =========================================================================
  // 3. BULK PLAN IMPORT
  // =========================================================================

  async importFromJson(
    jsonString: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ importedCount: number; tablesUpdated: string[] }> {
    let parsed: FullBackupPayload;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON format: file could not be parsed.');
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Invalid backup structure: missing data container.');
    }

    // Auto-create snapshot safety backup before applying import
    await this.createSnapshotBackup('Pre-Import Safety Snapshot', true);

    const tables = [
      'areas',
      'projects',
      'milestones',
      'targets',
      'tasks',
      'habits',
      'routines',
      'progressLogs',
      'timeSessions',
      'reviews',
      'blockers',
      'changeLogs',
    ] as const;

    let totalImported = 0;
    const tablesUpdated: string[] = [];

    await db.transaction(
      'rw',
      [
        db.areas,
        db.projects,
        db.milestones,
        db.targets,
        db.tasks,
        db.habits,
        db.routines,
        db.progressLogs,
        db.timeSessions,
        db.reviews,
        db.blockers,
        db.changeLogs,
        db.settings,
      ],
      async () => {
        if (mode === 'replace') {
          for (const tbl of tables) {
            const records = parsed.data[tbl] || [];
            const tableRef = (db as unknown as Record<string, { clear: () => Promise<void>; bulkAdd: (items: unknown[]) => Promise<void> }>)[tbl];
            await tableRef.clear();
            if (records.length > 0) {
              await tableRef.bulkAdd(records);
              totalImported += records.length;
              tablesUpdated.push(tbl);
            }
          }
          if (Array.isArray(parsed.data.settings)) {
            await db.settings.clear();
            if (parsed.data.settings.length > 0) {
              await db.settings.bulkAdd(parsed.data.settings);
              totalImported += parsed.data.settings.length;
              tablesUpdated.push('settings');
            }
          }
        } else {
          for (const tbl of tables) {
            const incoming = parsed.data[tbl] || [];
            if (incoming.length === 0) continue;

            const tableRef = (db as unknown as Record<string, { toArray: () => Promise<Array<{ id: string; updatedAt?: string }>>; bulkPut: (items: unknown[]) => Promise<void> }>)[tbl];
            const existingRecords = await tableRef.toArray();
            const existingMap = new Map<string, { updatedAt?: string; [key: string]: unknown }>(
              existingRecords.map((r) => [r.id, r])
            );

            const toPut: unknown[] = [];
            for (const item of incoming as Array<{ id: string; updatedAt?: string }>) {
              const existing = existingMap.get(item.id);
              if (!existing) {
                toPut.push(item);
              } else {
                const incomingTime = item.updatedAt || '0';
                const existingTime = existing.updatedAt || '0';
                if (incomingTime >= existingTime) {
                  toPut.push(item);
                }
              }
            }

            if (toPut.length > 0) {
              await tableRef.bulkPut(toPut);
              totalImported += toPut.length;
              tablesUpdated.push(tbl);
            }
          }
          if (Array.isArray(parsed.data.settings) && parsed.data.settings.length > 0) {
            await db.settings.bulkPut(parsed.data.settings);
            totalImported += parsed.data.settings.length;
            tablesUpdated.push('settings');
          }
        }
      }
    );

    // Restore user preferences (day rollover boundary, reminder schedule, daily backup prompt, theme)
    if (parsed.preferences) {
      if (typeof parsed.preferences.dayBoundaryHour === 'number') {
        setDayBoundaryHour(parsed.preferences.dayBoundaryHour);
      }
      if (parsed.preferences.reminderSettings) {
        reminderService.saveSettings(parsed.preferences.reminderSettings);
      }
      if (typeof parsed.preferences.dailyBackupPromptEnabled === 'boolean') {
        this.setDailyBackupPromptEnabled(parsed.preferences.dailyBackupPromptEnabled);
      }
      if (parsed.preferences.theme && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('seshat-theme', parsed.preferences.theme);
        } catch {
          // Ignore
        }
      }
    }

    return { importedCount: totalImported, tablesUpdated };
  },

  async importFromMarkdown(
    markdownText: string,
    defaultProjectId?: string
  ): Promise<{ createdTasksCount: number }> {
    const lines = markdownText.split('\n');
    let createdTasksCount = 0;
    const now = getCurrentUTC();

    await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      for (const rawLine of lines) {
        const line = rawLine.trim();
        const checklistMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/);
        if (!checklistMatch) continue;

        const isDone = checklistMatch[1].toLowerCase() === 'x';
        const text = checklistMatch[2].trim();
        if (!text) continue;

        const parsed = parseQuickAdd(text);

        const taskId = `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const task: Task = {
          id: taskId,
          projectId: defaultProjectId,
          title: parsed.title,
          status: isDone ? 'done' : 'active',
          priority: parsed.priority || 'medium',
          estimateMinutes: parsed.estimateMinutes,
          scheduleDate: parsed.scheduleDate,
          subtasks: [],
          tags: parsed.tags || [],
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        await db.tasks.add(task);
        await recordChange({
          entityType: 'task',
          entityId: taskId,
          action: 'create',
          newValue: task,
          reason: 'Imported from Markdown checklist',
        });
        createdTasksCount++;
      }
    });

    return { createdTasksCount };
  },

  // =========================================================================
  // 4. SNAPSHOT BACKUPS
  // =========================================================================

  async createSnapshotBackup(name?: string, isAutomated = false): Promise<BackupSnapshot> {
    const jsonString = await this.exportAllToJson();
    const parsed = JSON.parse(jsonString) as FullBackupPayload;

    const itemCount = Object.values(parsed.data).reduce(
      (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
      0
    );

    const snapshotId = generateId();
    const backup: BackupSnapshot = {
      id: snapshotId,
      name: name || `Backup snapshot (${new Date().toLocaleDateString()})`,
      timestamp: getCurrentUTC(),
      isAutomated,
      itemCount,
      data: jsonString,
      sizeBytes: new Blob([jsonString]).size,
    };

    await db.transaction('rw', [db.backups], async () => {
      await db.backups.add(backup);

      if (isAutomated) {
        const autoBackups = await db.backups
          .filter((b) => Boolean(b.isAutomated))
          .sortBy('timestamp');
        if (autoBackups.length > 10) {
          const toDelete = autoBackups.slice(0, autoBackups.length - 10);
          for (const old of toDelete) {
            await db.backups.delete(old.id);
          }
        }
      }
    });

    return backup;
  },

  async listSnapshotBackups(): Promise<BackupSnapshot[]> {
    const backups = await db.backups.toArray();
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async restoreSnapshotBackup(backupId: string): Promise<void> {
    const backup = await db.backups.get(backupId);
    if (!backup) throw new Error(`Backup snapshot ${backupId} not found.`);
    await this.importFromJson(backup.data, 'replace');
  },

  async deleteSnapshotBackup(backupId: string): Promise<void> {
    await db.backups.delete(backupId);
  },

  // =========================================================================
  // 5. PRIVACY & LOCAL APP LOCK
  // =========================================================================

  async getPrivacySettings(): Promise<{ appLockEnabled: boolean; telemetryEnabled: boolean; hasPin: boolean }> {
    const [lockSetting, pinSetting] = await Promise.all([
      db.settings.get('app_lock_enabled'),
      db.settings.get('app_lock_pin_hash'),
    ]);

    return {
      appLockEnabled: lockSetting?.value === 'true',
      telemetryEnabled: false,
      hasPin: Boolean(pinSetting?.value),
    };
  },

  async setAppLockPin(pin: string): Promise<void> {
    const hashed = hashPin(pin);
    const now = getCurrentUTC();
    await db.transaction('rw', [db.settings], async () => {
      await db.settings.put({ key: 'app_lock_pin_hash', value: hashed, updatedAt: now });
      await db.settings.put({ key: 'app_lock_enabled', value: 'true', updatedAt: now });
    });
  },

  async disableAppLock(currentPin: string): Promise<boolean> {
    return await db.transaction('rw', [db.settings], async () => {
      const pinSetting = await db.settings.get('app_lock_pin_hash');
      if (!pinSetting) {
        await db.settings.put({ key: 'app_lock_enabled', value: 'false', updatedAt: getCurrentUTC() });
        return true;
      }

      const hashedInput = hashPin(currentPin);
      if (hashedInput !== pinSetting.value) {
        return false;
      }

      const now = getCurrentUTC();
      await db.settings.put({ key: 'app_lock_enabled', value: 'false', updatedAt: now });
      await db.settings.delete('app_lock_pin_hash');
      return true;
    });
  },

  async verifyAppLockPin(pin: string): Promise<boolean> {
    const pinSetting = await db.settings.get('app_lock_pin_hash');
    if (!pinSetting) return true;
    return hashPin(pin) === pinSetting.value;
  },
};
