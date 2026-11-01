import Dexie, { type EntityTable } from 'dexie';
import type {
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
  BackupSnapshot,
} from '../types/index.ts';

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

/**
 * Seshat Notch Local-First Database
 * Built on Dexie (IndexedDB) with strict schema versioning and change tracking
 */
export class SeshatDatabase extends Dexie {
  areas!: EntityTable<Area, 'id'>;
  projects!: EntityTable<ProjectGoal, 'id'>;
  milestones!: EntityTable<MilestonePhase, 'id'>;
  targets!: EntityTable<Target, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  progressLogs!: EntityTable<ProgressLog, 'id'>;
  timeSessions!: EntityTable<TimeSession, 'id'>;
  reviews!: EntityTable<Review, 'id'>;
  blockers!: EntityTable<Blocker, 'id'>;
  changeLogs!: EntityTable<ChangeLogEntry, 'id'>;
  settings!: EntityTable<AppSetting, 'key'>;
  backups!: EntityTable<BackupSnapshot, 'id'>;

  constructor() {
    super('seshat_notch_db');

    // Schema v1 — fully typed indices for fast dashboard roll-up and queries
    this.version(1).stores({
      areas: 'id, name, order, isArchived',
      projects: 'id, areaId, isGoal, priority, status, startDate, endDate, isDeleted',
      milestones: 'id, projectId, status, dependsOnMilestoneId, order, isDeleted',
      targets: 'id, projectId, parentTargetId, horizon, period, metricType, status, isDeleted',
      tasks: 'id, projectId, milestoneId, targetId, scheduleDate, dueDate, priority, status, carriedOverFromDate, isDeleted',
      habits: 'id, linkedGoalId, scheduleType, isAvoidance, isArchived, isDeleted',
      routines: 'id, timeWindow, isDeleted',
      progressLogs: 'id, entityType, entityId, date, timestamp, isDeleted',
      timeSessions: 'id, entityType, entityId, kind, startTime, endTime',
      reviews: 'id, type, period, createdAt',
      blockers: 'id, entityType, entityId, dateRaised, dateCleared',
      changeLogs: 'id, timestamp, entityType, entityId, action',
      settings: 'key',
    });

    // Schema v2 — Phase 13 snapshot backups
    this.version(2).stores({
      backups: 'id, name, timestamp, isAutomated',
    });
  }
}

export const db = new SeshatDatabase();

