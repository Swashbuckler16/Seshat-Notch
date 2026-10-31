import { db } from '../db';
import { recordChange, generateId, getCurrentUTC } from '../db/changeLogService';
import {
  Area,
  ProjectGoal,
  MilestonePhase,
  Target,
  Task,
  Habit,
  Routine,
  ProgressLog,
  Status,
  EntityId,
} from '../types';

export const domainService = {
  // ==========================================
  // AREAS
  // ==========================================
  async createArea(data: Omit<Area, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>): Promise<Area> {
    const now = getCurrentUTC();
    const area: Area = {
      ...data,
      id: generateId(),
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.areas.add(area);
    await recordChange({
      entityType: 'area',
      entityId: area.id,
      action: 'create',
      newValue: area,
    });
    return area;
  },

  async updateArea(id: EntityId, updates: Partial<Area>): Promise<void> {
    const existing = await db.areas.get(id);
    if (!existing) throw new Error(`Area ${id} not found`);

    const now = getCurrentUTC();
    const updated = { ...existing, ...updates, updatedAt: now };
    await db.areas.put(updated);

    await recordChange({
      entityType: 'area',
      entityId: id,
      action: 'update',
      oldValue: existing,
      newValue: updated,
    });
  },

  // ==========================================
  // PROJECTS & GOALS
  // ==========================================
  async createProject(data: Omit<ProjectGoal, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<ProjectGoal> {
    const now = getCurrentUTC();
    const project: ProjectGoal = {
      ...data,
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.projects.add(project);
    await recordChange({
      entityType: 'project',
      entityId: project.id,
      action: 'create',
      newValue: project,
    });
    return project;
  },

  async updateProjectStatus(id: EntityId, newStatus: Status, reason?: string): Promise<void> {
    if (newStatus === 'dropped' && (!reason || reason.trim().length === 0)) {
      throw new Error('PRD Requirement TR-3: Dropping an item requires an explicit reason.');
    }

    const existing = await db.projects.get(id);
    if (!existing) throw new Error(`Project ${id} not found`);

    const now = getCurrentUTC();
    const updated: ProjectGoal = { ...existing, status: newStatus, updatedAt: now };
    await db.projects.put(updated);

    await recordChange({
      entityType: 'project',
      entityId: id,
      action: 'update',
      fieldChanged: 'status',
      oldValue: existing.status,
      newValue: newStatus,
      reason,
    });
  },

  async softDeleteProject(id: EntityId, reason?: string): Promise<void> {
    const existing = await db.projects.get(id);
    if (!existing) throw new Error(`Project ${id} not found`);

    const now = getCurrentUTC();
    await db.projects.update(id, { isDeleted: true, updatedAt: now });

    await recordChange({
      entityType: 'project',
      entityId: id,
      action: 'soft_delete',
      reason,
    });
  },

  // ==========================================
  // MILESTONES & PHASES
  // ==========================================
  async createMilestone(data: Omit<MilestonePhase, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<MilestonePhase> {
    const now = getCurrentUTC();
    const milestone: MilestonePhase = {
      ...data,
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.milestones.add(milestone);
    await recordChange({
      entityType: 'milestone',
      entityId: milestone.id,
      action: 'create',
      newValue: milestone,
    });
    return milestone;
  },

  // ==========================================
  // TARGETS (MONTHLY, WEEKLY, DAILY)
  // ==========================================
  async createTarget(data: Omit<Target, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Target> {
    const now = getCurrentUTC();
    const target: Target = {
      ...data,
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.targets.add(target);
    await recordChange({
      entityType: 'target',
      entityId: target.id,
      action: 'create',
      newValue: target,
    });
    return target;
  },

  async updateTargetProgress(id: EntityId, addedValue: number, note?: string): Promise<Target> {
    const existing = await db.targets.get(id);
    if (!existing) throw new Error(`Target ${id} not found`);

    const now = getCurrentUTC();
    const newCurrent = Math.max(0, existing.currentValue + addedValue);
    const newStatus: Status = newCurrent >= existing.targetValue ? 'done' : existing.status === 'not_started' ? 'active' : existing.status;

    const updated: Target = {
      ...existing,
      currentValue: newCurrent,
      status: newStatus,
      updatedAt: now,
    };
    await db.targets.put(updated);

    // Record both progress log and change log
    await db.progressLogs.add({
      id: generateId(),
      entityType: 'target',
      entityId: id,
      timestamp: now,
      date: now.split('T')[0],
      value: addedValue,
      unit: existing.unit,
      note,
      isDeleted: false,
      createdAt: now,
    });

    await recordChange({
      entityType: 'target',
      entityId: id,
      action: 'update',
      fieldChanged: 'currentValue',
      oldValue: existing.currentValue,
      newValue: newCurrent,
      reason: note,
    });

    return updated;
  },

  // ==========================================
  // TASKS & SUBTASKS
  // ==========================================
  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Task> {
    const now = getCurrentUTC();
    const task: Task = {
      ...data,
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.tasks.add(task);
    await recordChange({
      entityType: 'task',
      entityId: task.id,
      action: 'create',
      newValue: task,
    });
    return task;
  },

  async setTaskStatus(id: EntityId, status: Status, reason?: string): Promise<void> {
    if (status === 'dropped' && (!reason || reason.trim().length === 0)) {
      throw new Error('PRD Requirement TR-3: Dropping a task requires an explicit reason.');
    }
    const existing = await db.tasks.get(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    const now = getCurrentUTC();
    await db.tasks.update(id, { status, updatedAt: now });

    await recordChange({
      entityType: 'task',
      entityId: id,
      action: 'update',
      fieldChanged: 'status',
      oldValue: existing.status,
      newValue: status,
      reason,
    });
  },

  // ==========================================
  // HABITS & ROUTINES
  // ==========================================
  async createHabit(data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'isArchived'>): Promise<Habit> {
    const now = getCurrentUTC();
    const habit: Habit = {
      ...data,
      id: generateId(),
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.habits.add(habit);
    await recordChange({
      entityType: 'habit',
      entityId: habit.id,
      action: 'create',
      newValue: habit,
    });
    return habit;
  },

  async logHabitCompletion(habitId: EntityId, date: string, value = 1, note?: string): Promise<ProgressLog> {
    const habit = await db.habits.get(habitId);
    if (!habit) throw new Error(`Habit ${habitId} not found`);

    const now = getCurrentUTC();
    const log: ProgressLog = {
      id: generateId(),
      entityType: 'habit',
      entityId: habitId,
      timestamp: now,
      date,
      value,
      unit: habit.unit || (habit.metricType === 'duration' ? 'minutes' : 'count'),
      note,
      isDeleted: false,
      createdAt: now,
    };

    await db.progressLogs.add(log);
    await recordChange({
      entityType: 'habit',
      entityId: habitId,
      action: 'update',
      fieldChanged: 'check_in',
      newValue: { date, value },
      reason: note,
    });

    return log;
  },

  async createRoutine(data: Omit<Routine, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Routine> {
    const now = getCurrentUTC();
    const routine: Routine = {
      ...data,
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.routines.add(routine);
    await recordChange({
      entityType: 'routine',
      entityId: routine.id,
      action: 'create',
      newValue: routine,
    });
    return routine;
  },
};

