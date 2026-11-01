import { db } from './index.ts';
import type { ChangeLogEntry, EntityId } from '../types/index.ts';

/**
 * Generates a unique crypto UUID or fallback timestamp-based ID
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Returns current timestamp in UTC ISO format
 */
export function getCurrentUTC(): string {
  return new Date().toISOString();
}

/**
 * Central Mutation & Change Log Dispatcher
 * Appends every create, update, soft-delete, or status change to the change log
 */
export async function recordChange(params: {
  entityType: string;
  entityId: EntityId;
  action: 'create' | 'update' | 'soft_delete' | 'hard_delete';
  fieldChanged?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}): Promise<ChangeLogEntry> {
  const entry: ChangeLogEntry = {
    id: generateId(),
    timestamp: getCurrentUTC(),
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    fieldChanged: params.fieldChanged,
    oldValue: params.oldValue !== undefined ? JSON.parse(JSON.stringify(params.oldValue)) : undefined,
    newValue: params.newValue !== undefined ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
    reason: params.reason,
  };

  await db.changeLogs.add(entry);
  return entry;
}

/**
 * Retrieve change history for any specific entity
 */
export async function getEntityHistory(entityId: EntityId): Promise<ChangeLogEntry[]> {
  return await db.changeLogs
    .where('entityId')
    .equals(entityId)
    .reverse()
    .sortBy('timestamp');
}

/**
 * Retrieve recent change logs across the entire application
 */
export async function getRecentChanges(limit = 50): Promise<ChangeLogEntry[]> {
  return await db.changeLogs
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

