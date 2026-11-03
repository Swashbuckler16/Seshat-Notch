import { createContext, useContext, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Area, Habit, ProgressLog } from '../../types';

type ActivityData = {activities: Habit[]; entries: ProgressLog[]; areas: Area[]};
const Context = createContext<ActivityData | undefined>(undefined);

// Keep a single live database subscription across route changes. Dexie still
// invalidates it on writes, so edits, imports and recovery remain reactive.
export function ActivityDataProvider({children}: {children: ReactNode}) {
  const data = useLiveQuery(async () => {
    const [activities, entries, areas] = await Promise.all([
      db.habits.filter(a => !a.isDeleted).toArray(),
      db.progressLogs.where('entityType').equals('habit').filter(e => !e.isDeleted).toArray(),
      db.areas.toArray(),
    ]);
    return {activities, entries, areas};
  }, []);
  return <Context.Provider value={data}>{children}</Context.Provider>;
}

export function useActivityData() { return useContext(Context); }
