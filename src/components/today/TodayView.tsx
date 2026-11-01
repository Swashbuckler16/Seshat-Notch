import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { MorningSummary } from './MorningSummary';
import { ExecutionStrip } from './ExecutionStrip';
import { TodayTasks } from './TodayTasks';
import { TodayTargets } from './TodayTargets';
import { TodayHabits } from './TodayHabits';

interface TodayViewProps {
  onOpenQuickAdd: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onOpenQuickAdd }) => {
  // Default to today's local date YYYY-MM-DD
  const [dateStr, setDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const handlePrevDay = () => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    setDateStr(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    setDateStr(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setDateStr(new Date().toISOString().split('T')[0]);
  };

  // Query tasks for dateStr (scheduled on or due on this date)
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .filter(
          (t) =>
            !t.isDeleted &&
            (t.scheduleDate === dateStr || t.dueDate === dateStr)
        )
        .toArray(),
    [dateStr]
  );

  // Query daily targets for dateStr
  const targets = useLiveQuery(
    () =>
      db.targets
        .filter(
          (t) =>
            !t.isDeleted &&
            ((t.horizon === 'day' && t.period === dateStr) ||
              (t.horizon === 'week' && t.status === 'active'))
        )
        .toArray(),
    [dateStr]
  );

  // Query habits and logs for dateStr
  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.isDeleted && !h.isArchived).toArray()
  );

  const habitLogs = useLiveQuery(
    () =>
      db.progressLogs
        .where('date')
        .equals(dateStr)
        .filter((l) => l.entityType === 'habit')
        .toArray(),
    [dateStr]
  );

  // Query time sessions logged today
  const sessions = useLiveQuery(
    () =>
      db.timeSessions
        .filter((s) => s.startTime.startsWith(dateStr))
        .toArray(),
    [dateStr]
  );

  // Compute summary numbers
  const targetsTotal = targets?.length ?? 0;
  const targetsDone = (targets || []).filter((t) => t.status === 'done').length;

  const tasksTotal = tasks?.length ?? 0;
  const tasksDone = (tasks || []).filter((t) => t.status === 'done').length;

  const habitsTotal = habits?.length ?? 0;
  const habitsDone = (habitLogs || []).filter((l) => l.value > 0).length;

  const minutesLogged = (sessions || []).reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const minutesEstimated = (tasks || []).reduce((acc, t) => acc + (t.estimateMinutes || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Morning Summary Scan Strip (<5s scan) */}
      <MorningSummary
        dateStr={dateStr}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        targetsDone={targetsDone}
        targetsTotal={targetsTotal}
        tasksDone={tasksDone}
        tasksTotal={tasksTotal}
        habitsDone={habitsDone}
        habitsTotal={habitsTotal}
        minutesLogged={minutesLogged}
        minutesEstimated={minutesEstimated}
      />

      {/* 2. Rapid Execution & Focus Strip */}
      <ExecutionStrip tasks={tasks || []} dateStr={dateStr} />

      {/* 3. Main Operational Grid: Tasks & Targets (Left) | Habits (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Tasks and Targets */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <TodayTasks
            tasks={tasks || []}
            dateStr={dateStr}
            onOpenQuickAdd={onOpenQuickAdd}
          />
          <TodayTargets targets={targets || []} dateStr={dateStr} />
        </div>

        {/* Right Column: Habits & Daily Routines */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <TodayHabits dateStr={dateStr} />
        </div>
      </div>
    </div>
  );
};

