import { activityService } from './activityService.ts';
import { assertTodayCompletion } from '../utils/completionDate.ts';
import { db } from '../db/index.ts';
import { recordChange, generateId, getCurrentUTC } from '../db/changeLogService.ts';
import {
  getLocalDateString,
  isValidDateString,
  isValidPeriodForHorizon,
  roundMetric,
  shiftDateString,
} from '../utils/dateUtils.ts';
import type {
  Area,
  ProjectGoal,
  MilestonePhase,
  Target,
  TargetHorizon,
  Task,
  Habit,
  Routine,
  ProgressLog,
  TimeSession,
  Review,
  Status,
  EntityId,
} from '../types/index.ts';

export const domainService = {
  // ==========================================
  // AREAS
  // ==========================================
  async createArea(data: Omit<Area, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>): Promise<Area> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Area name is required.');
    }
    const now = getCurrentUTC();
    const area: Area = {
      ...data,
      name: data.name.trim(),
      id: generateId(),
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', [db.areas, db.changeLogs], async () => {
      await db.areas.add(area);
      await recordChange({
        entityType: 'area',
        entityId: area.id,
        action: 'create',
        newValue: area,
      });
    });
    return area;
  },

  async updateArea(id: EntityId, updates: Partial<Area>): Promise<void> {
    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error('Area name cannot be empty.');
    }
    await db.transaction('rw', [db.areas, db.changeLogs], async () => {
      const existing = await db.areas.get(id);
      if (!existing) throw new Error(`Area ${id} not found`);

      const now = getCurrentUTC();
      const updated = {
        ...existing,
        ...updates,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        updatedAt: now,
      };
      await db.areas.put(updated);

      await recordChange({
        entityType: 'area',
        entityId: id,
        action: 'update',
        oldValue: existing,
        newValue: updated,
      });
    });
  },

  async archiveArea(id: EntityId, isArchived = true): Promise<void> {
    await this.updateArea(id, { isArchived });
  },

  async reorderAreas(orderedIds: EntityId[]): Promise<void> {
    const now = getCurrentUTC();
    await db.transaction('rw', [db.areas, db.changeLogs], async () => {
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
    });
  },

  // ==========================================
  // PROJECTS & GOALS
  // ==========================================
  async createProject(data: Omit<ProjectGoal, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<ProjectGoal> {
    if (!data.title || !data.title.trim()) {
      throw new Error('Project title is required.');
    }
    if (data.startDate && !isValidDateString(data.startDate)) {
      throw new Error(`Invalid start date: ${data.startDate}`);
    }
    if (data.endDate && !isValidDateString(data.endDate)) {
      throw new Error(`Invalid end date: ${data.endDate}`);
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      throw new Error('End date cannot be earlier than start date.');
    }

    const now = getCurrentUTC();
    const project: ProjectGoal = {
      ...data,
      title: data.title.trim(),
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', [db.projects, db.changeLogs], async () => {
      await db.projects.add(project);
      await recordChange({
        entityType: 'project',
        entityId: project.id,
        action: 'create',
        newValue: project,
      });
    });
    return project;
  },

  async updateProjectStatus(id: EntityId, newStatus: Status, reason?: string): Promise<void> {
    if (newStatus === 'dropped' && (!reason || reason.trim().length === 0)) {
      throw new Error('Add a short reason before dropping this item.');
    }

    await db.transaction('rw', [db.projects, db.changeLogs], async () => {
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
    });
  },

  async updateProject(id: EntityId, updates: Partial<ProjectGoal>): Promise<ProjectGoal> {
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error('Project title cannot be empty.');
    }
    return await db.transaction('rw', [db.projects, db.changeLogs], async () => {
      const existing = await db.projects.get(id);
      if (!existing) throw new Error(`Project ${id} not found`);

      const nextStart = updates.startDate !== undefined ? updates.startDate : existing.startDate;
      const nextEnd = updates.endDate !== undefined ? updates.endDate : existing.endDate;
      if (nextStart && !isValidDateString(nextStart)) {
        throw new Error(`Invalid start date: ${nextStart}`);
      }
      if (nextEnd && !isValidDateString(nextEnd)) {
        throw new Error(`Invalid end date: ${nextEnd}`);
      }
      if (nextStart && nextEnd && nextEnd < nextStart) {
        throw new Error('End date cannot be earlier than start date.');
      }

      const now = getCurrentUTC();
      const updated: ProjectGoal = {
        ...existing,
        ...updates,
        title: updates.title !== undefined ? updates.title.trim() : existing.title,
        updatedAt: now,
      };
      await db.projects.put(updated);

      await recordChange({
        entityType: 'project',
        entityId: id,
        action: 'update',
        fieldChanged: Object.keys(updates).join(', '),
        oldValue: existing,
        newValue: updated,
      });
      return updated;
    });
  },

  async softDeleteProject(id: EntityId, reason?: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.projects, db.milestones, db.targets, db.tasks, db.changeLogs],
      async () => {
        const existing = await db.projects.get(id);
        if (!existing) throw new Error(`Project ${id} not found`);

        const now = getCurrentUTC();
        await db.projects.update(id, { isDeleted: true, updatedAt: now });

        // Cascade soft-delete to all child milestones, goals/targets, and tasks
        const [childMilestones, childTargets, childTasks] = await Promise.all([
          db.milestones.where('projectId').equals(id).filter((m) => !m.isDeleted).toArray(),
          db.targets.where('projectId').equals(id).filter((t) => !t.isDeleted).toArray(),
          db.tasks.where('projectId').equals(id).filter((t) => !t.isDeleted).toArray(),
        ]);

        for (const ms of childMilestones) {
          await db.milestones.update(ms.id, { isDeleted: true, updatedAt: now });
          await recordChange({
            entityType: 'milestone',
            entityId: ms.id,
            action: 'soft_delete',
            reason: `Cascaded from deleted project "${existing.title}"`,
          });
        }

        for (const tgt of childTargets) {
          await db.targets.update(tgt.id, { isDeleted: true, updatedAt: now });
          await recordChange({
            entityType: 'target',
            entityId: tgt.id,
            action: 'soft_delete',
            reason: `Cascaded from deleted project "${existing.title}"`,
          });
        }

        for (const tsk of childTasks) {
          await db.tasks.update(tsk.id, { isDeleted: true, updatedAt: now });
          await recordChange({
            entityType: 'task',
            entityId: tsk.id,
            action: 'soft_delete',
            reason: `Cascaded from deleted project "${existing.title}"`,
          });
        }

        await recordChange({
          entityType: 'project',
          entityId: id,
          action: 'soft_delete',
          reason,
        });
      }
    );
  },

  // ==========================================
  // MILESTONES & PHASES
  // ==========================================
  async createMilestone(data: Omit<MilestonePhase, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<MilestonePhase> {
    if (!data.title || !data.title.trim()) {
      throw new Error('Milestone title is required.');
    }
    if (data.startDate && !isValidDateString(data.startDate)) {
      throw new Error(`Invalid milestone start date: ${data.startDate}`);
    }
    if (data.endDate && !isValidDateString(data.endDate)) {
      throw new Error(`Invalid milestone end date: ${data.endDate}`);
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      throw new Error('Milestone end date cannot be earlier than start date.');
    }

    const now = getCurrentUTC();
    const milestone: MilestonePhase = {
      ...data,
      title: data.title.trim(),
      weight: roundMetric(data.weight ?? 10),
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', [db.milestones, db.changeLogs], async () => {
      await db.milestones.add(milestone);
      await recordChange({
        entityType: 'milestone',
        entityId: milestone.id,
        action: 'create',
        newValue: milestone,
      });
    });
    return milestone;
  },

  async updateMilestone(id: EntityId, updates: Partial<MilestonePhase>): Promise<void> {
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error('Milestone title cannot be empty.');
    }
    await db.transaction('rw', [db.milestones, db.changeLogs], async () => {
      const existing = await db.milestones.get(id);
      if (!existing) throw new Error(`Milestone ${id} not found`);

      const nextStart = updates.startDate !== undefined ? updates.startDate : existing.startDate;
      const nextEnd = updates.endDate !== undefined ? updates.endDate : existing.endDate;
      if (nextStart && !isValidDateString(nextStart)) {
        throw new Error(`Invalid milestone start date: ${nextStart}`);
      }
      if (nextEnd && !isValidDateString(nextEnd)) {
        throw new Error(`Invalid milestone end date: ${nextEnd}`);
      }
      if (nextStart && nextEnd && nextEnd < nextStart) {
        throw new Error('Milestone end date cannot be earlier than start date.');
      }

      const now = getCurrentUTC();
      const updated = {
        ...existing,
        ...updates,
        title: updates.title !== undefined ? updates.title.trim() : existing.title,
        weight: updates.weight !== undefined ? roundMetric(updates.weight) : existing.weight,
        updatedAt: now,
      };
      await db.milestones.put(updated);

      await recordChange({
        entityType: 'milestone',
        entityId: id,
        action: 'update',
        oldValue: existing,
        newValue: updated,
      });
    });
  },

  async softDeleteMilestone(id: EntityId, reason?: string): Promise<void> {
    await db.transaction('rw', [db.milestones, db.changeLogs], async () => {
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
    });
  },

  // ==========================================
  // BLOCKERS (PRD 5.2 & TR-5)
  // ==========================================
  async raiseBlocker(data: { entityType: 'project' | 'task' | 'milestone'; entityId: EntityId; description: string }): Promise<void> {
    const now = getCurrentUTC();
    const localToday = getLocalDateString();
    const blocker = {
      id: generateId(),
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      dateRaised: localToday,
      createdAt: now,
    };
    await db.transaction('rw', [db.blockers, db.projects, db.tasks, db.changeLogs], async () => {
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
    });
  },

  async clearBlocker(blockerId: EntityId): Promise<void> {
    await db.transaction('rw', [db.blockers, db.projects, db.tasks, db.changeLogs], async () => {
      const existing = await db.blockers.get(blockerId);
      if (!existing) throw new Error(`Blocker ${blockerId} not found`);

      const now = getCurrentUTC();
      const localToday = getLocalDateString();
      await db.blockers.update(blockerId, { dateCleared: localToday });

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
        newValue: localToday,
      });
    });
  },

  // ==========================================
  // TARGETS (MONTHLY, WEEKLY, DAILY)
  // ==========================================
  async createTarget(data: Omit<Target, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Target> {
    if (data.horizon === 'day' && (data.currentValue > 0 || data.status === 'done')) assertTodayCompletion(data.period);
    if (!data.title || !data.title.trim()) {
      throw new Error('Target title is required.');
    }
    if (!Number.isFinite(Number(data.targetValue)) || Number(data.targetValue) <= 0) {
      throw new Error('Target value must be greater than zero.');
    }
    if (!isValidPeriodForHorizon(data.period, data.horizon)) {
      throw new Error(`Invalid period "${data.period}" for ${data.horizon} horizon.`);
    }

    const now = getCurrentUTC();
    const target: Target = {
      ...data,
      title: data.title.trim(),
      period: data.period.trim(),
      targetValue: roundMetric(data.targetValue),
      currentValue: roundMetric(data.currentValue ?? 0),
      weight: roundMetric(data.weight ?? 1.0),
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', [db.targets, db.changeLogs], async () => {
      await db.targets.add(target);
      await recordChange({
        entityType: 'target',
        entityId: target.id,
        action: 'create',
        newValue: target,
      });
    });
    return target;
  },

  async updateTargetProgress(id: EntityId, addedValue: number, note?: string): Promise<Target> {
    return await db.transaction('rw', [db.targets, db.progressLogs, db.changeLogs], async () => {
      const existing = await db.targets.get(id);
      if (!existing) throw new Error(`Target ${id} not found`);

      if (existing.horizon === 'day') assertTodayCompletion(existing.period);

      const now = getCurrentUTC();
      const localToday = getLocalDateString();
      const prevCurrent = roundMetric(existing.currentValue);
      const newCurrent = roundMetric(Math.max(0, prevCurrent + Number(addedValue)));
      const actualDelta = roundMetric(newCurrent - prevCurrent);

      let newStatus: Status = existing.status;
      if (newCurrent >= existing.targetValue) {
        newStatus = 'done';
      } else if (existing.status === 'done') {
        newStatus = newCurrent > 0 ? 'active' : 'not_started';
      } else if (existing.status === 'not_started' && newCurrent > 0) {
        newStatus = 'active';
      }

      const updated: Target = {
        ...existing,
        currentValue: newCurrent,
        status: newStatus,
        updatedAt: now,
      };
      await db.targets.put(updated);

      // Record progress log only for the actual delta applied (so logs and stored value always agree)
      if (actualDelta !== 0 || Number(addedValue) === 0) {
        await db.progressLogs.add({
          id: generateId(),
          entityType: 'target',
          entityId: id,
          timestamp: now,
          date: localToday,
          value: actualDelta,
          unit: existing.unit,
          note,
          isDeleted: false,
          createdAt: now,
        });
      }

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
    });
  },

  async updateTarget(id: EntityId, updates: Partial<Target>): Promise<Target> {
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error('Target title cannot be empty.');
    }
    if (updates.targetValue !== undefined && Number(updates.targetValue) <= 0) {
      throw new Error('Target value must be greater than zero.');
    }
    return await db.transaction('rw', [db.targets, db.changeLogs], async () => {
      const existing = await db.targets.get(id);
      if (!existing) throw new Error(`Target ${id} not found`);

      const nextHorizon = updates.horizon !== undefined ? updates.horizon : existing.horizon;
      const nextPeriod = updates.period !== undefined ? updates.period : existing.period;
      if (updates.currentValue !== undefined || updates.status === 'done' || (existing.status === 'done' && updates.status !== undefined)) {
        if (existing.horizon === 'day') assertTodayCompletion(existing.period);
        if (nextHorizon === 'day') assertTodayCompletion(nextPeriod);
      }
      if (!isValidPeriodForHorizon(nextPeriod, nextHorizon)) {
        throw new Error(`Invalid period "${nextPeriod}" for ${nextHorizon} horizon.`);
      }

      const now = getCurrentUTC();
      const nextTargetVal =
        updates.targetValue !== undefined ? roundMetric(updates.targetValue) : existing.targetValue;
      const nextCurrentVal =
        updates.currentValue !== undefined ? roundMetric(Math.max(0, updates.currentValue)) : existing.currentValue;

      let nextStatus = updates.status !== undefined ? updates.status : existing.status;
      if (updates.status === undefined) {
        if (nextCurrentVal >= nextTargetVal) {
          nextStatus = 'done';
        } else if (existing.status === 'done' && nextCurrentVal < nextTargetVal) {
          nextStatus = nextCurrentVal > 0 ? 'active' : 'not_started';
        }
      }

      const updated: Target = {
        ...existing,
        ...updates,
        title: updates.title !== undefined ? updates.title.trim() : existing.title,
        targetValue: nextTargetVal,
        currentValue: nextCurrentVal,
        status: nextStatus,
        updatedAt: now,
      };
      await db.targets.put(updated);

      await recordChange({
        entityType: 'target',
        entityId: id,
        action: 'update',
        oldValue: existing,
        newValue: updated,
      });
      return updated;
    });
  },

  async softDeleteTarget(id: EntityId, reason?: string): Promise<void> {
    await db.transaction('rw', [db.targets, db.changeLogs], async () => {
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
    });
  },

  /**
   * Cascade Distribution Engine (PRD Section 6.2)
   * Splits a higher horizon target (Month or Week) into sub-targets (Week or Day)
   * Skips any period that already has an active cascaded child for this parent target.
   */
  async cascadeTarget(params: {
    parentTargetId: EntityId;
    childHorizon: TargetHorizon;
    distribution: { period: string; title?: string; value: number }[];
  }): Promise<Target[]> {
    return await db.transaction('rw', [db.targets, db.changeLogs], async () => {
      const parent = await db.targets.get(params.parentTargetId);
      if (!parent) throw new Error(`Parent target ${params.parentTargetId} not found`);

      const existingChildren = await db.targets
        .where('parentTargetId')
        .equals(parent.id)
        .filter((t) => !t.isDeleted && t.horizon === params.childHorizon)
        .toArray();

      const now = getCurrentUTC();
      const createdChildren: Target[] = [];

      for (const item of params.distribution) {
        if (item.value <= 0) continue;
        const resolvedTitle = item.title?.trim() || parent.title;

        // Skip if a child target for this period & title already exists
        const alreadyPresent = existingChildren.some(
          (c) => c.period === item.period && c.title === resolvedTitle
        );
        if (alreadyPresent) continue;

        const child: Target = {
          id: generateId(),
          projectId: parent.projectId,
          parentTargetId: parent.id,
          horizon: params.childHorizon,
          period: item.period,
          title: resolvedTitle,
          metricType: parent.metricType,
          targetValue: roundMetric(item.value),
          currentValue: 0,
          unit: parent.unit,
          weight: 1.0,
          status: 'not_started',
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        await db.targets.add(child);
        existingChildren.push(child);
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
    });
  },

  /**
   * Copy-Forward Period Tool (PRD Section 6.3)
   * Replicates targets from a previous period into the new active period with zeroed progress.
   * Skips any target that is already present in the destination period.
   */
  async copyForwardPeriod(params: {
    sourcePeriod: string;
    targetPeriod: string;
    horizon: TargetHorizon;
    targetIds?: EntityId[];
  }): Promise<Target[]> {
    return await db.transaction('rw', [db.targets, db.changeLogs], async () => {
      let sourceTargets = await db.targets
        .where('period')
        .equals(params.sourcePeriod)
        .filter((t) => !t.isDeleted && t.horizon === params.horizon)
        .toArray();

      if (params.targetIds && params.targetIds.length > 0) {
        sourceTargets = sourceTargets.filter((t) => params.targetIds!.includes(t.id));
      }

      const existingInTargetPeriod = await db.targets
        .where('period')
        .equals(params.targetPeriod)
        .filter((t) => !t.isDeleted && t.horizon === params.horizon)
        .toArray();

      const now = getCurrentUTC();
      const copiedTargets: Target[] = [];

      for (const src of sourceTargets) {
        const alreadyExists = existingInTargetPeriod.some(
          (dest) =>
            dest.title.trim().toLowerCase() === src.title.trim().toLowerCase() &&
            (dest.projectId || '') === (src.projectId || '')
        );
        if (alreadyExists) continue;

        const clone: Target = {
          id: generateId(),
          projectId: src.projectId,
          parentTargetId: src.parentTargetId,
          horizon: params.horizon,
          period: params.targetPeriod,
          title: src.title,
          metricType: src.metricType,
          targetValue: roundMetric(src.targetValue),
          currentValue: 0,
          unit: src.unit,
          weight: roundMetric(src.weight),
          status: 'not_started',
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        await db.targets.add(clone);
        existingInTargetPeriod.push(clone);
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
    });
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

    await db.transaction('rw', [db.targets, db.milestones, db.changeLogs], async () => {
      if (params.targetIds && params.targetIds.length > 0) {
        for (const id of params.targetIds) {
          const tgt = await db.targets.get(id);
          if (!tgt) continue;

          let newPeriod = tgt.period;
          if (tgt.horizon === 'day') {
            newPeriod = shiftDateString(tgt.period, params.shiftDays);
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
            newEnd = shiftDateString(ms.endDate, params.shiftDays);
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
    });
  },

  // ==========================================
  // TASKS & SUBTASKS
  // ==========================================
  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Task> {
    if (data.status === 'done' || data.subtasks?.some(s => s.isCompleted)) assertTodayCompletion(data.scheduleDate || data.dueDate || getLocalDateString());
    if (!data.title || !data.title.trim()) {
      throw new Error('Task title is required.');
    }
    if (data.scheduleDate && !isValidDateString(data.scheduleDate)) {
      throw new Error(`Invalid task schedule date: ${data.scheduleDate}`);
    }
    if (data.dueDate && !isValidDateString(data.dueDate)) {
      throw new Error(`Invalid task due date: ${data.dueDate}`);
    }
    if (data.scheduleDate && data.dueDate && data.dueDate < data.scheduleDate) {
      throw new Error('Task due date cannot be earlier than schedule date.');
    }

    const now = getCurrentUTC();
    const task: Task = {
      ...data,
      title: data.title.trim(),
      estimateMinutes: data.estimateMinutes !== undefined ? roundMetric(data.estimateMinutes) : undefined,
      actualMinutes: data.actualMinutes !== undefined ? roundMetric(data.actualMinutes) : undefined,
      id: generateId(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      await db.tasks.add(task);
      await recordChange({
        entityType: 'task',
        entityId: task.id,
        action: 'create',
        newValue: task,
      });
    });
    return task;
  },

  async setTaskStatus(id: EntityId, status: Status, reason?: string): Promise<void> {
    if (status === 'dropped' && (!reason || reason.trim().length === 0)) {
      throw new Error('Add a short reason before dropping this task.');
    }
    await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      const existing = await db.tasks.get(id);
      if (!existing) throw new Error(`Task ${id} not found`);
      if (status === 'done' || existing.status === 'done') assertTodayCompletion(existing.scheduleDate || existing.dueDate || getLocalDateString());

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
    });
  },

  async toggleTaskStatus(id: EntityId): Promise<Status> {
    return await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      const existing = await db.tasks.get(id);
      if (!existing) throw new Error(`Task ${id} not found`);
      assertTodayCompletion(existing.scheduleDate || existing.dueDate || getLocalDateString());

      const newStatus: Status = existing.status === 'done' ? 'active' : 'done';
      const now = getCurrentUTC();
      await db.tasks.update(id, { status: newStatus, updatedAt: now });

      await recordChange({
        entityType: 'task',
        entityId: id,
        action: 'update',
        fieldChanged: 'status',
        oldValue: existing.status,
        newValue: newStatus,
      });
      return newStatus;
    });
  },

  async updateTask(id: EntityId, updates: Partial<Task>): Promise<Task> {
    return await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      const existing = await db.tasks.get(id);
      if (!existing) throw new Error(`Task ${id} not found`);
      const completionChanged = updates.subtasks?.some(s => s.isCompleted !== (existing.subtasks?.find(old => old.id === s.id)?.isCompleted ?? false));
      if (completionChanged) assertTodayCompletion(existing.scheduleDate || existing.dueDate || getLocalDateString());
      if (updates.status === 'done' || (existing.status === 'done' && updates.status !== undefined)) {
        assertTodayCompletion(existing.scheduleDate || existing.dueDate || getLocalDateString());
        assertTodayCompletion(updates.scheduleDate || updates.dueDate || existing.scheduleDate || existing.dueDate || getLocalDateString());
      }

      const now = getCurrentUTC();
      const updated: Task = { ...existing, ...updates, updatedAt: now };
      await db.tasks.put(updated);

      await recordChange({
        entityType: 'task',
        entityId: id,
        action: 'update',
        oldValue: existing,
        newValue: updated,
      });
      return updated;
    });
  },

  async softDeleteTask(id: EntityId, reason?: string): Promise<void> {
    await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      const existing = await db.tasks.get(id);
      if (!existing) throw new Error(`Task ${id} not found`);

      const now = getCurrentUTC();
      await db.tasks.update(id, { isDeleted: true, updatedAt: now });

      await recordChange({
        entityType: 'task',
        entityId: id,
        action: 'soft_delete',
        reason,
      });
    });
  },

  // ==========================================
  // TIME SESSIONS (PRD Section 6.4 & 10)
  // ==========================================
  async logTimeSession(data: {
    entityType: 'task' | 'target' | 'project';
    entityId: EntityId;
    durationMinutes: number;
    kind: 'deep' | 'shallow' | 'learning';
    note?: string;
  }): Promise<TimeSession> {
    const now = getCurrentUTC();
    const session: TimeSession = {
      id: generateId(),
      entityType: data.entityType,
      entityId: data.entityId,
      startTime: now,
      durationMinutes: data.durationMinutes,
      kind: data.kind,
      note: data.note,
      createdAt: now,
    };
    await db.transaction('rw', [db.timeSessions, db.tasks, db.changeLogs], async () => {
      await db.timeSessions.add(session);

      // If task, increment actualMinutes
      if (data.entityType === 'task') {
        const task = await db.tasks.get(data.entityId);
        if (task) {
          const newActual = (task.actualMinutes || 0) + data.durationMinutes;
          await db.tasks.update(task.id, { actualMinutes: newActual, updatedAt: now });
        }
      }

      await recordChange({
        entityType: 'timeSession',
        entityId: session.id,
        action: 'create',
        newValue: session,
        reason: data.note,
      });
    });
    return session;
  },

  async updateTimeSession(sessionId: EntityId, updates: Partial<TimeSession>): Promise<TimeSession> {
    return await db.transaction('rw', [db.timeSessions, db.tasks, db.changeLogs], async () => {
      const session = await db.timeSessions.get(sessionId);
      if (!session) throw new Error(`TimeSession ${sessionId} not found`);

      const updated: TimeSession = {
        ...session,
        ...updates,
      };

      // If duration changed and was linked to a task, adjust task.actualMinutes difference
      if (updates.durationMinutes !== undefined && updates.durationMinutes !== session.durationMinutes) {
        if (session.entityType === 'task') {
          const task = await db.tasks.get(session.entityId);
          if (task) {
            const diff = updates.durationMinutes - session.durationMinutes;
            const newActual = Math.max(0, (task.actualMinutes || 0) + diff);
            await db.tasks.update(task.id, { actualMinutes: newActual, updatedAt: getCurrentUTC() });
          }
        }
      }

      await db.timeSessions.put(updated);
      await recordChange({
        entityType: 'timeSession',
        entityId: sessionId,
        action: 'update',
        fieldChanged: Object.keys(updates).join(', '),
        oldValue: session,
        newValue: updated,
      });
      return updated;
    });
  },

  async deleteTimeSession(sessionId: EntityId, reason = 'Deleted session'): Promise<void> {
    await db.transaction('rw', [db.timeSessions, db.tasks, db.changeLogs], async () => {
      const session = await db.timeSessions.get(sessionId);
      if (!session) throw new Error(`TimeSession ${sessionId} not found`);

      // Deduct from task.actualMinutes if linked
      if (session.entityType === 'task') {
        const task = await db.tasks.get(session.entityId);
        if (task) {
          const newActual = Math.max(0, (task.actualMinutes || 0) - session.durationMinutes);
          await db.tasks.update(task.id, { actualMinutes: newActual, updatedAt: getCurrentUTC() });
        }
      }

      await db.timeSessions.delete(sessionId);
      await recordChange({
        entityType: 'timeSession',
        entityId: sessionId,
        action: 'hard_delete',
        oldValue: session,
        reason,
      });
    });
  },

  /**
   * Toggles habit completion for a specific local date
   */
  async toggleHabitForDate(habitId: EntityId, dateStr: string): Promise<boolean> {
    return activityService.toggle(habitId, dateStr);
  },

  // ==========================================
  // HABITS & ROUTINES
  // ==========================================
  async createHabit(data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'isArchived'>): Promise<Habit> {
    if (!data.title || !data.title.trim()) {
      throw new Error('Habit title is required.');
    }
    if (data.startDate && !isValidDateString(data.startDate)) {
      throw new Error(`Invalid habit start date: ${data.startDate}`);
    }
    if (data.targetValue !== undefined && Number(data.targetValue) <= 0) {
      throw new Error('Habit target value must be greater than zero.');
    }

    let areaId = data.areaId;
    if (!areaId && data.linkedGoalId) areaId = (await db.projects.get(data.linkedGoalId))?.areaId;
    if (!areaId) {
      let area = await db.areas.where('name').equals('Unsorted').first();
      if (!area) area = await this.createArea({name:'Unsorted',order:await db.areas.count()});
      areaId = area.id;
    }
    const now = getCurrentUTC();
    const habit: Habit = {
      ...data,
      areaId,
      kind: data.kind ?? (data.isAvoidance ? 'avoid' : data.metricType === 'boolean' ? 'yes_no' : 'count'),
      icon: data.icon ?? 'leaf',
      accent: data.accent ?? 0,
      targetDirection: data.targetDirection ?? 'at_least',
      scheduleVersions: data.scheduleVersions ?? [{effectiveFrom:data.startDate,scheduleType:data.scheduleType,weekdays:data.scheduleDaysOfWeek,timesPerWeek:data.targetFrequency,intervalDays:data.intervalDays}],
      title: data.title.trim(),
      targetValue: roundMetric(data.targetValue ?? 1),
      id: generateId(),
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', [db.habits, db.changeLogs], async () => {
      await db.habits.add(habit);
      await recordChange({
        entityType: 'habit',
        entityId: habit.id,
        action: 'create',
        newValue: habit,
      });
    });
    return habit;
  },

  async logHabitCompletion(habitId: EntityId, date: string, value = 1, note?: string): Promise<ProgressLog> {
    if (!isValidDateString(date)) throw new Error(`Invalid habit check-in date: ${date}`);
    return (await activityService.setEntry(habitId, date, { value, note }))!;
  },

  async updateHabit(habitId: EntityId, updates: Partial<Habit>): Promise<Habit> {
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error('Habit title cannot be empty.');
    }
    if (updates.startDate !== undefined && !isValidDateString(updates.startDate)) {
      throw new Error(`Invalid habit start date: ${updates.startDate}`);
    }
    return await db.transaction('rw', [db.habits, db.changeLogs], async () => {
      const habit = await db.habits.get(habitId);
      if (!habit) throw new Error(`Habit ${habitId} not found`);

      const now = getCurrentUTC();
      const updated: Habit = {
        ...habit,
        ...updates,
        title: updates.title !== undefined ? updates.title.trim() : habit.title,
        targetValue:
          updates.targetValue !== undefined ? roundMetric(updates.targetValue) : habit.targetValue,
        updatedAt: now,
      };

      await db.habits.put(updated);
      await recordChange({
        entityType: 'habit',
        entityId: habitId,
        action: 'update',
        fieldChanged: Object.keys(updates).join(', '),
        oldValue: habit,
        newValue: updated,
      });
      return updated;
    });
  },

  async archiveHabit(habitId: EntityId, isArchived: boolean): Promise<void> {
    const habit = await db.habits.get(habitId);
    if (!habit) throw new Error(`Habit ${habitId} not found`);

    await this.updateHabit(habitId, { isArchived });
  },

  async deleteHabit(habitId: EntityId, reason = 'Deleted by user'): Promise<void> {
    await db.transaction('rw', [db.habits, db.changeLogs], async () => {
      const habit = await db.habits.get(habitId);
      if (!habit) throw new Error(`Habit ${habitId} not found`);

      const now = getCurrentUTC();
      const updated: Habit = {
        ...habit,
        isDeleted: true,
        updatedAt: now,
      };

      await db.habits.put(updated);
      await recordChange({
        entityType: 'habit',
        entityId: habitId,
        action: 'soft_delete',
        oldValue: habit,
        newValue: updated,
        reason,
      });
    });
  },

  /**
   * Logs an excused skip day for fair streak preservation (PRD HB-3)
   */
  async logHabitSkip(habitId: EntityId, date: string, reason = 'Excused rest day'): Promise<ProgressLog> {
    assertTodayCompletion(date);
    return await db.transaction('rw', [db.habits, db.progressLogs, db.changeLogs], async () => {
      const habit = await db.habits.get(habitId);
      if (!habit) throw new Error(`Habit ${habitId} not found`);

      // Preserve prior entries while enforcing one active entry per day.
      const existing = await db.progressLogs
        .where('entityId')
        .equals(habitId)
        .filter((l) => !l.isDeleted && l.entityType === 'habit' && l.date === date)
        .toArray();

      for (const entry of existing) await db.progressLogs.update(entry.id, { isDeleted: true });

      const now = getCurrentUTC();
      const log: ProgressLog = {
        id: generateId(),
        entityType: 'habit',
        entityId: habitId,
        timestamp: now,
        date,
        value: 0,
        unit: habit.unit || 'skip',
        note: `excused_skip: ${reason}`,
        isDeleted: false,
        createdAt: now,
      };

      await db.progressLogs.add(log);
      await recordChange({
        entityType: 'habit',
        entityId: habitId,
        action: 'update',
        fieldChanged: 'excused_skip',
        newValue: { date, reason },
        reason,
      });

      return log;
    });
  },

  /**
   * Logs a relapse event for avoidance habits (PRD HB-6)
   */
  async logAvoidanceRelapse(habitId: EntityId, date: string, reason = 'Relapse event'): Promise<ProgressLog> {
    assertTodayCompletion(date);
    return await db.transaction('rw', [db.habits, db.progressLogs, db.changeLogs], async () => {
      const habit = await db.habits.get(habitId);
      if (!habit) throw new Error(`Habit ${habitId} not found`);

      const existing = await db.progressLogs.where('entityId').equals(habitId)
        .filter(l => !l.isDeleted && l.entityType === 'habit' && l.date === date).toArray();
      for (const entry of existing) await db.progressLogs.update(entry.id, { isDeleted: true });

      const now = getCurrentUTC();
      const log: ProgressLog = {
        id: generateId(),
        entityType: 'habit',
        entityId: habitId,
        timestamp: now,
        date,
        value: -1, // Negative denotes relapse
        unit: 'relapse',
        note: `relapse: ${reason}`,
        isDeleted: false,
        createdAt: now,
      };

      await db.progressLogs.add(log);
      await recordChange({
        entityType: 'habit',
        entityId: habitId,
        action: 'update',
        fieldChanged: 'relapse',
        newValue: { date, reason },
        reason,
      });

      return log;
    });
  },

  /**
   * Defines a vacation/sick pause range (PRD HB-3)
   */
  async addHabitPauseRange(
    habitId: EntityId,
    startDate: string,
    endDate: string,
    reason = 'Vacation or sick pause'
  ): Promise<void> {
    const habit = await db.habits.get(habitId);
    if (!habit) throw new Error(`Habit ${habitId} not found`);

    const currentRanges = habit.pausedRanges || [];
    const updatedRanges = [...currentRanges, { startDate, endDate, reason }];

    await this.updateHabit(habitId, { pausedRanges: updatedRanges });
  },

  /**
   * Removes a vacation/sick pause range
   */
  async removeHabitPauseRange(habitId: EntityId, rangeIndex: number): Promise<void> {
    const habit = await db.habits.get(habitId);
    if (!habit) throw new Error(`Habit ${habitId} not found`);

    const currentRanges = habit.pausedRanges || [];
    const updatedRanges = currentRanges.filter((_, idx) => idx !== rangeIndex);

    await this.updateHabit(habitId, { pausedRanges: updatedRanges });
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
    await db.transaction('rw', [db.routines, db.changeLogs], async () => {
      await db.routines.add(routine);
      await recordChange({
        entityType: 'routine',
        entityId: routine.id,
        action: 'create',
        newValue: routine,
      });
    });
    return routine;
  },

  // ==========================================
  // CARRY-OVER INBOX OPERATIONS (PRD Section 6.5 & TR-3)
  // ==========================================
  async rescheduleTask(taskId: EntityId, newDate: string, reason?: string): Promise<Task> {
    return await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      const existing = await db.tasks.get(taskId);
      if (!existing) throw new Error(`Task ${taskId} not found`);

      const now = getCurrentUTC();
      const originalDate = existing.scheduleDate || existing.dueDate || 'backlog';
      const updated: Task = {
        ...existing,
        scheduleDate: newDate,
        dueDate: newDate,
        carriedOverFromDate: existing.carriedOverFromDate || originalDate,
        status: 'active',
        updatedAt: now,
      };
      await db.tasks.put(updated);

      await recordChange({
        entityType: 'task',
        entityId: taskId,
        action: 'update',
        fieldChanged: 'scheduleDate',
        oldValue: originalDate,
        newValue: newDate,
        reason: reason || `Rescheduled from ${originalDate} to ${newDate}`,
      });
      return updated;
    });
  },

  async splitTask(
    taskId: EntityId,
    newTasksData: { title: string; estimateMinutes?: number }[]
  ): Promise<Task[]> {
    return await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      const existing = await db.tasks.get(taskId);
      if (!existing) throw new Error(`Task ${taskId} not found`);

      const now = getCurrentUTC();
      const createdTasks: Task[] = [];

      // Mark original task as done with note
      await db.tasks.update(taskId, {
        status: 'done',
        notes: (existing.notes ? `${existing.notes}\n` : '') + `[Split into ${newTasksData.length} smaller tasks]`,
        updatedAt: now,
      });

      for (const item of newTasksData) {
        const childTask: Task = {
          id: generateId(),
          projectId: existing.projectId,
          milestoneId: existing.milestoneId,
          targetId: existing.targetId,
          title: item.title.trim(),
          estimateMinutes: item.estimateMinutes || 30,
          actualMinutes: 0,
          priority: existing.priority,
          status: 'active',
          scheduleDate: existing.scheduleDate,
          dueDate: existing.dueDate,
          carriedOverFromDate: existing.carriedOverFromDate || existing.scheduleDate,
          subtasks: [],
          tags: [...existing.tags],
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };
        await db.tasks.add(childTask);
        createdTasks.push(childTask);
      }

      await recordChange({
        entityType: 'task',
        entityId: taskId,
        action: 'update',
        fieldChanged: 'split',
        newValue: createdTasks.map((t) => t.id),
        reason: `Split task into ${newTasksData.length} smaller pieces`,
      });

      return createdTasks;
    });
  },

  async dropTask(taskId: EntityId, reason: string): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Add a short reason before dropping this task.');
    }
    await this.setTaskStatus(taskId, 'dropped', reason.trim());
  },

  async deferTaskToBacklog(taskId: EntityId, reason?: string): Promise<Task> {
    return await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      const existing = await db.tasks.get(taskId);
      if (!existing) throw new Error(`Task ${taskId} not found`);

      const now = getCurrentUTC();
      const updated: Task = {
        ...existing,
        scheduleDate: undefined,
        dueDate: undefined,
        updatedAt: now,
      };
      await db.tasks.put(updated);

      await recordChange({
        entityType: 'task',
        entityId: taskId,
        action: 'update',
        fieldChanged: 'scheduleDate',
        oldValue: existing.scheduleDate,
        newValue: 'backlog',
        reason: reason || 'Deferred to project backlog',
      });
      return updated;
    });
  },

  async batchRescheduleTasks(taskIds: EntityId[], newDate: string): Promise<void> {
    await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      for (const id of taskIds) {
        await this.rescheduleTask(id, newDate, 'Batch rescheduled from Carry-Over Inbox');
      }
    });
  },

  // ==========================================
  // PERIODIC REVIEWS (PRD Section 6.6)
  // ==========================================
  async createReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const now = getCurrentUTC();
    const review: Review = {
      ...data,
      id: generateId(),
      createdAt: now,
    };
    await db.transaction('rw', [db.reviews, db.changeLogs], async () => {
      await db.reviews.add(review);

      await recordChange({
        entityType: 'review',
        entityId: review.id,
        action: 'create',
        newValue: review,
        reason: `${data.type} review for ${data.period}`,
      });
    });
    return review;
  },

  async updateReview(id: EntityId, updates: Partial<Review>): Promise<void> {
    await db.transaction('rw', [db.reviews, db.changeLogs], async () => {
      const existing = await db.reviews.get(id);
      if (!existing) throw new Error(`Review ${id} not found`);

      const updated = { ...existing, ...updates };
      await db.reviews.put(updated);

      await recordChange({
        entityType: 'review',
        entityId: id,
        action: 'update',
        oldValue: existing,
        newValue: updated,
      });
    });
  },
};
