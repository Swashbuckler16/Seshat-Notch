import { db } from '../db';
import { recordChange, generateId, getCurrentUTC } from '../db/changeLogService';
import {
  Area,
  ProjectGoal,
  MilestonePhase,
  Target,
  TargetHorizon,
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

  async archiveArea(id: EntityId, isArchived = true): Promise<void> {
    await this.updateArea(id, { isArchived });
  },

  async reorderAreas(orderedIds: EntityId[]): Promise<void> {
    const now = getCurrentUTC();
    for (let i = 0; i < orderedIds.length; i++) {
      await db.areas.update(orderedIds[i], { order: i + 1, updatedAt: now });
    }
    await recordChange({
      entityType: 'area',
      entityId: 'batch_reorder',
      action: 'update',
      fieldChanged: 'order',
      newValue: orderedIds,
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

  async updateMilestone(id: EntityId, updates: Partial<MilestonePhase>): Promise<void> {
    const existing = await db.milestones.get(id);
    if (!existing) throw new Error(`Milestone ${id} not found`);

    const now = getCurrentUTC();
    const updated = { ...existing, ...updates, updatedAt: now };
    await db.milestones.put(updated);

    await recordChange({
      entityType: 'milestone',
      entityId: id,
      action: 'update',
      oldValue: existing,
      newValue: updated,
    });
  },

  async softDeleteMilestone(id: EntityId, reason?: string): Promise<void> {
    const existing = await db.milestones.get(id);
    if (!existing) throw new Error(`Milestone ${id} not found`);

    const now = getCurrentUTC();
    await db.milestones.update(id, { isDeleted: true, updatedAt: now });

    await recordChange({
      entityType: 'milestone',
      entityId: id,
      action: 'soft_delete',
      reason,
    });
  },

  // ==========================================
  // BLOCKERS (PRD 5.2 & TR-5)
  // ==========================================
  async raiseBlocker(data: { entityType: 'project' | 'task' | 'milestone'; entityId: EntityId; description: string }): Promise<void> {
    const now = getCurrentUTC();
    const blocker = {
      id: generateId(),
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      dateRaised: now.split('T')[0],
      createdAt: now,
    };
    await db.blockers.add(blocker);

    // If it's a project or task, mark its status as blocked
    if (data.entityType === 'project') {
      await db.projects.update(data.entityId, { status: 'blocked', updatedAt: now });
    } else if (data.entityType === 'task') {
      await db.tasks.update(data.entityId, { status: 'blocked', updatedAt: now });
    }

    await recordChange({
      entityType: 'blocker',
      entityId: blocker.id,
      action: 'create',
      newValue: blocker,
      reason: data.description,
    });
  },

  async clearBlocker(blockerId: EntityId): Promise<void> {
    const existing = await db.blockers.get(blockerId);
    if (!existing) throw new Error(`Blocker ${blockerId} not found`);

    const now = getCurrentUTC();
    await db.blockers.update(blockerId, { dateCleared: now.split('T')[0] });

    // Check if other open blockers exist for this entity
    const remainingOpen = await db.blockers
      .where('entityId')
      .equals(existing.entityId)
      .filter((b) => !b.dateCleared)
      .count();

    if (remainingOpen <= 1) {
      if (existing.entityType === 'project') {
        await db.projects.update(existing.entityId, { status: 'active', updatedAt: now });
      } else if (existing.entityType === 'task') {
        await db.tasks.update(existing.entityId, { status: 'active', updatedAt: now });
      }
    }

    await recordChange({
      entityType: 'blocker',
      entityId: blockerId,
      action: 'update',
      fieldChanged: 'dateCleared',
      newValue: now.split('T')[0],
    });
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

  async updateTarget(id: EntityId, updates: Partial<Target>): Promise<Target> {
    const existing = await db.targets.get(id);
    if (!existing) throw new Error(`Target ${id} not found`);

    const now = getCurrentUTC();
    const updated: Target = { ...existing, ...updates, updatedAt: now };
    await db.targets.put(updated);

    await recordChange({
      entityType: 'target',
      entityId: id,
      action: 'update',
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  },

  async softDeleteTarget(id: EntityId, reason?: string): Promise<void> {
    const existing = await db.targets.get(id);
    if (!existing) throw new Error(`Target ${id} not found`);

    const now = getCurrentUTC();
    await db.targets.update(id, { isDeleted: true, updatedAt: now });

    await recordChange({
      entityType: 'target',
      entityId: id,
      action: 'soft_delete',
      reason,
    });
  },

  /**
   * Cascade Distribution Engine (PRD Section 6.2)
   * Splits a higher horizon target (Month or Week) into sub-targets (Week or Day)
   */
  async cascadeTarget(params: {
    parentTargetId: EntityId;
    childHorizon: TargetHorizon;
    distribution: { period: string; title?: string; value: number }[];
  }): Promise<Target[]> {
    const parent = await db.targets.get(params.parentTargetId);
    if (!parent) throw new Error(`Parent target ${params.parentTargetId} not found`);

    const now = getCurrentUTC();
    const createdChildren: Target[] = [];

    for (const item of params.distribution) {
      if (item.value <= 0) continue;
      const child: Target = {
        id: generateId(),
        projectId: parent.projectId,
        parentTargetId: parent.id,
        horizon: params.childHorizon,
        period: item.period,
        title: item.title?.trim() || parent.title,
        metricType: parent.metricType,
        targetValue: item.value,
        currentValue: 0,
        unit: parent.unit,
        weight: 1.0,
        status: 'not_started',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.targets.add(child);
      await recordChange({
        entityType: 'target',
        entityId: child.id,
        action: 'create',
        newValue: child,
        reason: `Cascaded from ${parent.title} (${parent.horizon} -> ${params.childHorizon})`,
      });
      createdChildren.push(child);
    }

    return createdChildren;
  },

  /**
   * Copy-Forward Period Tool (PRD Section 6.3)
   * Replicates targets from a previous period into the new active period with zeroed progress
   */
  async copyForwardPeriod(params: {
    sourcePeriod: string;
    targetPeriod: string;
    horizon: TargetHorizon;
    targetIds?: EntityId[];
  }): Promise<Target[]> {
    let sourceTargets = await db.targets
      .where('period')
      .equals(params.sourcePeriod)
      .filter((t) => !t.isDeleted && t.horizon === params.horizon)
      .toArray();

    if (params.targetIds && params.targetIds.length > 0) {
      sourceTargets = sourceTargets.filter((t) => params.targetIds!.includes(t.id));
    }

    const now = getCurrentUTC();
    const copiedTargets: Target[] = [];

    for (const src of sourceTargets) {
      const clone: Target = {
        id: generateId(),
        projectId: src.projectId,
        parentTargetId: src.parentTargetId,
        horizon: params.horizon,
        period: params.targetPeriod,
        title: src.title,
        metricType: src.metricType,
        targetValue: src.targetValue,
        currentValue: 0,
        unit: src.unit,
        weight: src.weight,
        status: 'not_started',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.targets.add(clone);
      await recordChange({
        entityType: 'target',
        entityId: clone.id,
        action: 'create',
        newValue: clone,
        reason: `Copied forward from ${src.period} to ${params.targetPeriod}`,
      });
      copiedTargets.push(clone);
    }

    return copiedTargets;
  },

  /**
   * Re-Plan & Shift Tool (PRD Section 6.3)
   * Shifts target periods or milestone end dates forward by N days
   */
  async shiftPlanPeriod(params: {
    targetIds?: EntityId[];
    milestoneIds?: EntityId[];
    shiftDays: number;
    reason?: string;
  }): Promise<void> {
    const now = getCurrentUTC();

    if (params.targetIds && params.targetIds.length > 0) {
      for (const id of params.targetIds) {
        const tgt = await db.targets.get(id);
        if (!tgt) continue;

        let newPeriod = tgt.period;
        if (tgt.horizon === 'day') {
          const d = new Date(`${tgt.period}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() + params.shiftDays);
          newPeriod = d.toISOString().split('T')[0];
        }

        await db.targets.update(id, { period: newPeriod, updatedAt: now });
        await recordChange({
          entityType: 'target',
          entityId: id,
          action: 'update',
          fieldChanged: 'period',
          oldValue: tgt.period,
          newValue: newPeriod,
          reason: params.reason || `Shifted by ${params.shiftDays} days`,
        });
      }
    }

    if (params.milestoneIds && params.milestoneIds.length > 0) {
      for (const id of params.milestoneIds) {
        const ms = await db.milestones.get(id);
        if (!ms) continue;

        let newEnd = ms.endDate;
        if (ms.endDate) {
          const d = new Date(`${ms.endDate}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() + params.shiftDays);
          newEnd = d.toISOString().split('T')[0];
        }

        await db.milestones.update(id, { endDate: newEnd, updatedAt: now });
        await recordChange({
          entityType: 'milestone',
          entityId: id,
          action: 'update',
          fieldChanged: 'endDate',
          oldValue: ms.endDate,
          newValue: newEnd,
          reason: params.reason || `Shifted by ${params.shiftDays} days`,
        });
      }
    }
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

