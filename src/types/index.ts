/**
 * Seshat Notch — Core Domain Types
 * Derived strictly from PRD Section 5 (Core Concepts and Data Model)
 */

export type EntityId = string;

export type MetricType =
  | 'boolean'          // done or not done
  | 'count'            // count (e.g. 5 times)
  | 'duration'         // duration in minutes
  | 'numeric'          // numeric with custom unit (e.g. 15 km, 200 pages, 3 rules)
  | 'percentage'       // percentage (0-100)
  | 'checklist';       // done items out of total

export type TargetHorizon = 'month' | 'week' | 'day';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Status =
  | 'not_started'
  | 'active'
  | 'paused'
  | 'blocked'
  | 'done'
  | 'dropped';

export type ScheduleStatus = 'on_track' | 'at_risk' | 'behind' | 'paused';

export interface Area {
  id: EntityId;
  name: string;
  description?: string;
  order: number;
  isArchived: boolean;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
}

export interface ProjectGoal {
  id: EntityId;
  areaId: EntityId;
  title: string;
  isGoal: boolean; // false = Project (Heimdall SOC Lab), true = Goal (Security+ prep)
  why?: string;
  successCriteria?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  priority: Priority;
  status: Status;
  tags: string[];
  weightType: 'equal' | 'estimate' | 'manual';
  manualWeight?: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MilestonePhase {
  id: EntityId;
  projectId: EntityId;
  title: string;
  startDate?: string;
  endDate?: string;
  status: Status;
  dependsOnMilestoneId?: EntityId; // Simple finish-to-start dependency
  weight: number;
  order: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Target {
  id: EntityId;
  projectId?: EntityId;
  parentTargetId?: EntityId; // monthly feeds weekly, weekly feeds daily
  horizon: TargetHorizon;
  period: string; // e.g. "2026-11" for month, "2026-W44" for week, "2026-11-01" for day
  title: string;
  metricType: MetricType;
  targetValue: number;
  currentValue: number;
  unit: string; // e.g. "rules", "hours", "pages", "commits"
  weight: number;
  status: Status;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: EntityId;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: EntityId;
  projectId?: EntityId;
  milestoneId?: EntityId;
  targetId?: EntityId;
  title: string;
  notes?: string;
  scheduleDate?: string; // YYYY-MM-DD
  dueDate?: string;
  estimateMinutes?: number;
  actualMinutes?: number;
  priority: Priority;
  status: Status;
  recurrenceRule?: string; // daily, weekdays, weekly, monthly
  subtasks: Subtask[];
  tags: string[];
  carriedOverFromDate?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HabitScheduleType = 'daily' | 'weekdays' | 'n_per_week' | 'every_n_days';

export interface HabitPauseRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason?: string;
}

export interface Habit {
  id: EntityId;
  linkedGoalId?: EntityId;
  title: string;
  metricType: 'boolean' | 'count' | 'duration';
  scheduleType: HabitScheduleType;
  scheduleDaysOfWeek?: number[]; // [0..6] (0 = Sunday or Monday per setting)
  targetFrequency?: number; // e.g. 3 times per week
  intervalDays?: number; // for every_n_days
  targetValue: number; // e.g. 30 (mins) or 1 (boolean)
  unit?: string;
  isAvoidance: boolean; // HB-6: things to stop with relapse tracking
  startDate: string;
  pausedRanges?: HabitPauseRange[]; // HB-3: vacation/sick pause ranges
  customSkipDates?: string[]; // HB-3: explicit excused skip dates
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineStep {
  id: EntityId;
  title: string;
  habitId?: EntityId;
  taskId?: EntityId;
  durationMinutes?: number;
  order: number;
}

export interface Routine {
  id: EntityId;
  title: string;
  timeWindow?: 'morning' | 'afternoon' | 'evening' | 'shutdown';
  steps: RoutineStep[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressLog {
  id: EntityId;
  entityType: 'target' | 'task' | 'habit';
  entityId: EntityId;
  timestamp: string; // ISO 8601 UTC
  date: string; // YYYY-MM-DD local user date
  value: number;
  unit: string;
  note?: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface TimeSession {
  id: EntityId;
  entityType: 'task' | 'target' | 'project';
  entityId: EntityId;
  startTime: string; // ISO 8601 UTC
  endTime?: string;
  durationMinutes: number;
  kind: 'deep' | 'shallow' | 'learning';
  note?: string;
  createdAt: string;
}

export interface Review {
  id: EntityId;
  type: 'daily' | 'weekly' | 'monthly';
  period: string; // YYYY-MM-DD or YYYY-Wxx or YYYY-MM
  energyRating?: number; // 1 to 5
  moodRating?: number;   // 1 to 5
  answers: Record<string, string>; // prompt key -> user response
  carryOverDecisions?: {
    taskId: EntityId;
    decision: 'reschedule' | 'split' | 'drop';
    reason?: string;
    newDate?: string;
  }[];
  topThreeTomorrow?: string[];
  createdAt: string;
}

export interface Blocker {
  id: EntityId;
  entityType: 'project' | 'task' | 'milestone';
  entityId: EntityId;
  description: string;
  dateRaised: string;
  dateCleared?: string;
  createdAt: string;
}

/**
 * Append-only Change Log (TR-2, TR-7, DT-1, DT-2, DT-5)
 * Every change appends an immutable entry enabling undo, audit, and conflict-free sync
 */
export interface ChangeLogEntry {
  id: EntityId;
  timestamp: string;
  entityType: string;
  entityId: EntityId;
  action: 'create' | 'update' | 'soft_delete' | 'hard_delete';
  fieldChanged?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

export interface BackupSnapshot {
  id: EntityId;
  name: string;
  timestamp: string; // ISO 8601 UTC
  isAutomated: boolean;
  itemCount: number;
  data: string; // JSON string payload
  sizeBytes?: number;
}

export interface RecoveryBinItem {
  id: EntityId;
  entityType: 'project' | 'milestone' | 'target' | 'task' | 'habit' | 'routine';
  title: string;
  deletedAt: string;
  reason?: string;
  originalData: unknown;
}


