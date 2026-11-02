import { db } from './index';

const PRE_ADDED_PROJECT_IDS = ['proj_heimdall', 'goal_secplus', 'goal_reading'];
const PRE_ADDED_AREA_IDS = ['area_career', 'area_learning', 'area_health', 'area_personal'];
const PRE_ADDED_MILESTONE_IDS = [
  'ms_prep',
  'ms_arch',
  'ms_core_deploy',
  'ms_telemetry',
  'ms_baseline',
  'ms_attack_detect',
  'ms_ir_playbooks',
  'ms_reporting',
];
const PRE_ADDED_TARGET_IDS = [
  'tgt_month_10_techniques',
  'tgt_week_3_rules',
  'tgt_week_practice_exam',
  'tgt_today_card',
  'tgt_books_annual',
];
const PRE_ADDED_TASK_IDS = [
  'tsk_kerberoast',
  'tsk_mimikatz',
  'tsk_secplus_ch4',
  'tsk_missed_carryover',
];
const PRE_ADDED_HABIT_IDS = ['hbt_study', 'hbt_exercise', 'hbt_sleep', 'hbt_review'];
const PRE_ADDED_ROUTINE_IDS = ['rtn_morning', 'rtn_evening'];
const PRE_ADDED_BLOCKER_IDS = ['blk_nvme'];
const PRE_ADDED_CHANGELOG_IDS = ['chg_init_1', 'chg_init_2', 'chg_init_3', 'chg_init_4'];

/**
 * Removes any pre-added example goals, projects, habits, tasks, and logs
 * from existing local databases while preserving all user-created records.
 */
export async function purgePreAddedSeedData(): Promise<void> {
  const existingPreAddedProjects = await db.projects.bulkGet(PRE_ADDED_PROJECT_IDS);
  const existingPreAddedHabits = await db.habits.bulkGet(PRE_ADDED_HABIT_IDS);
  const existingPreAddedAreas = await db.areas.bulkGet(PRE_ADDED_AREA_IDS);

  const hasAnyPreAdded =
    existingPreAddedProjects.some(Boolean) ||
    existingPreAddedHabits.some(Boolean) ||
    existingPreAddedAreas.some(Boolean);

  if (!hasAnyPreAdded) {
    return;
  }

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
      db.blockers,
      db.changeLogs,
    ],
    async () => {
      await db.projects.bulkDelete(PRE_ADDED_PROJECT_IDS);
      await db.milestones.bulkDelete(PRE_ADDED_MILESTONE_IDS);
      await db.targets.bulkDelete(PRE_ADDED_TARGET_IDS);
      await db.tasks.bulkDelete(PRE_ADDED_TASK_IDS);
      await db.habits.bulkDelete(PRE_ADDED_HABIT_IDS);
      await db.routines.bulkDelete(PRE_ADDED_ROUTINE_IDS);
      await db.blockers.bulkDelete(PRE_ADDED_BLOCKER_IDS);
      await db.changeLogs.bulkDelete(PRE_ADDED_CHANGELOG_IDS);

      // Remove pre-added sample progress logs (log_study_0..29, log_ex_0..29)
      const sampleLogIds: string[] = [];
      for (let i = 0; i < 30; i++) {
        sampleLogIds.push(`log_study_${i}`, `log_ex_${i}`);
      }
      await db.progressLogs.bulkDelete(sampleLogIds);

      // Remove pre-added areas only if no user-created projects belong to them
      const remainingProjects = await db.projects.toArray();
      const usedAreaIds = new Set(remainingProjects.map((p) => p.areaId));
      const areaIdsToDelete = PRE_ADDED_AREA_IDS.filter((id) => !usedAreaIds.has(id));
      if (areaIdsToDelete.length > 0) {
        await db.areas.bulkDelete(areaIdsToDelete);
      }
    }
  );
}

/**
 * Clean workspace initializer — does not pre-populate example goals or projects.
 * Users add their own Life Areas, Projects, Goals, and Habits.
 */
export async function seedDatabase(_force = false): Promise<void> {
  await purgePreAddedSeedData();
}
