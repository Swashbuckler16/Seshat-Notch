import { db } from './index';
import {
  Area,
  ProjectGoal,
  MilestonePhase,
  Target,
  Task,
  Habit,
  Routine,
  ProgressLog,
  Blocker,
  ChangeLogEntry,
} from '../types';

/**
 * Real Seed Data per PRD Section 16 (Appendix: Seed Data for Dogfooding)
 * Seeds Heimdall SOC Lab, Security+ Goal, Habits, Routines, and Real Logs
 */
export async function seedDatabase(force = false): Promise<void> {
  const existingCount = await db.projects.count();
  if (existingCount > 0 && !force) {
    return; // Already seeded
  }

  // Clear existing if force
  if (force) {
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
        await Promise.all([
          db.areas.clear(),
          db.projects.clear(),
          db.milestones.clear(),
          db.targets.clear(),
          db.tasks.clear(),
          db.habits.clear(),
          db.routines.clear(),
          db.progressLogs.clear(),
          db.timeSessions.clear(),
          db.reviews.clear(),
          db.blockers.clear(),
          db.changeLogs.clear(),
          db.settings.clear(),
        ]);
      }
    );
  }

  const now = '2026-10-31T09:00:00.000Z';
  const todayStr = '2026-10-31';

  // 1. Areas
  const areas: Area[] = [
    {
      id: 'area_career',
      name: 'Career & Engineering',
      description: 'Hands-on technical labs, SOC engineering, and portfolio projects.',
      order: 1,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'area_learning',
      name: 'Certifications & Learning',
      description: 'Security+ preparation, computer science fundamentals, and reading.',
      order: 2,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'area_health',
      name: 'Health & Fitness',
      description: 'Physical training, recovery, and sleep hygiene.',
      order: 3,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'area_personal',
      name: 'Personal Operations',
      description: 'Reviews, routines, administrative hygiene, and personal life.',
      order: 4,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 2. Projects & Goals
  const projects: ProjectGoal[] = [
    {
      id: 'proj_heimdall',
      areaId: 'area_career',
      title: 'Heimdall SOC Lab',
      isGoal: false,
      why: 'Build a production-grade detection engineering lab to master enterprise SIEM, Windows telemetry, and attack emulation.',
      successCriteria: '12 MITRE ATT&CK techniques emulated with documented custom detection rules and verified dashboard alert pipelines.',
      startDate: '2026-10-01',
      endDate: '2026-12-15',
      priority: 'urgent',
      status: 'active',
      tags: ['soc', 'detection-engineering', 'splunk', 'sysmon', 'active-directory'],
      weightType: 'manual',
      manualWeight: 1.0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'goal_secplus',
      areaId: 'area_learning',
      title: 'CompTIA Security+ Certification',
      isGoal: true,
      why: 'Validate baseline cybersecurity knowledge and clear foundational prerequisites for engineering roles.',
      successCriteria: 'Score >= 800/900 on exam SY0-701.',
      startDate: '2026-09-15',
      endDate: '2026-11-30',
      priority: 'high',
      status: 'active',
      tags: ['cert', 'security-plus', 'exam'],
      weightType: 'estimate',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'goal_reading',
      areaId: 'area_learning',
      title: '12 Systems & Security Books',
      isGoal: true,
      why: 'Deep fundamental understanding of operating systems, network protocols, and distributed systems.',
      successCriteria: 'Complete 12 annotated engineering books with key takeaways logged.',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      priority: 'medium',
      status: 'active',
      tags: ['reading', 'systems'],
      weightType: 'equal',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 3. Milestones / Phases (Heimdall SOC Lab: 8 Phases per Section 16)
  const milestones: MilestonePhase[] = [
    {
      id: 'ms_prep',
      projectId: 'proj_heimdall',
      title: 'Phase 1: Lab Architecture & Prep',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
      status: 'done',
      weight: 10,
      order: 1,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ms_ad_build',
      projectId: 'proj_heimdall',
      title: 'Phase 2: Active Directory Domain Build',
      startDate: '2026-10-08',
      endDate: '2026-10-15',
      status: 'done',
      dependsOnMilestoneId: 'ms_prep',
      weight: 15,
      order: 2,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ms_telemetry',
      projectId: 'proj_heimdall',
      title: 'Phase 3: Host & Network Telemetry (Sysmon & Zeek)',
      startDate: '2026-10-16',
      endDate: '2026-10-22',
      status: 'done',
      dependsOnMilestoneId: 'ms_ad_build',
      weight: 15,
      order: 3,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ms_siem',
      projectId: 'proj_heimdall',
      title: 'Phase 4: SIEM Ingestion & Pipeline (Splunk Enterprise)',
      startDate: '2026-10-23',
      endDate: '2026-10-28',
      status: 'done',
      dependsOnMilestoneId: 'ms_telemetry',
      weight: 15,
      order: 4,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ms_baseline',
      projectId: 'proj_heimdall',
      title: 'Phase 5: Baseline Traffic & Normal Noise Profile',
      startDate: '2026-10-29',
      endDate: '2026-11-04',
      status: 'active',
      dependsOnMilestoneId: 'ms_siem',
      weight: 10,
      order: 5,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ms_attack_detect',
      projectId: 'proj_heimdall',
      title: 'Phase 6: Attack Emulation & Detection Engineering',
      startDate: '2026-11-05',
      endDate: '2026-11-25',
      status: 'not_started',
      dependsOnMilestoneId: 'ms_baseline',
      weight: 20,
      order: 6,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ms_dashboards',
      projectId: 'proj_heimdall',
      title: 'Phase 7: SOC Monitoring Dashboards & Alerts',
      startDate: '2026-11-26',
      endDate: '2026-12-05',
      status: 'not_started',
      dependsOnMilestoneId: 'ms_attack_detect',
      weight: 10,
      order: 7,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ms_reporting',
      projectId: 'proj_heimdall',
      title: 'Phase 8: Threat Report & Public Repository',
      startDate: '2026-12-06',
      endDate: '2026-12-15',
      status: 'not_started',
      dependsOnMilestoneId: 'ms_dashboards',
      weight: 5,
      order: 8,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 4. Targets (Multi-Horizon: Monthly, Weekly, Daily per Section 5 & 16)
  const targets: Target[] = [
    {
      id: 'tgt_month_10_techniques',
      projectId: 'proj_heimdall',
      horizon: 'month',
      period: '2026-10',
      title: 'Configure 5 core ingestion sources and baseline logs',
      metricType: 'count',
      targetValue: 5,
      currentValue: 5,
      unit: 'sources',
      weight: 1.0,
      status: 'done',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tgt_month_11_techniques',
      projectId: 'proj_heimdall',
      horizon: 'month',
      period: '2026-11',
      title: 'Emulate 12 ATT&CK techniques with detection cards',
      metricType: 'numeric',
      targetValue: 12,
      currentValue: 4,
      unit: 'techniques',
      weight: 2.0,
      status: 'active',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tgt_week_44_detections',
      projectId: 'proj_heimdall',
      parentTargetId: 'tgt_month_11_techniques',
      horizon: 'week',
      period: '2026-W44',
      title: 'Document 3 detection rules and queries',
      metricType: 'numeric',
      targetValue: 3,
      currentValue: 3,
      unit: 'detections',
      weight: 1.0,
      status: 'done',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tgt_week_45_detections',
      projectId: 'proj_heimdall',
      parentTargetId: 'tgt_month_11_techniques',
      horizon: 'week',
      period: '2026-W45',
      title: 'Document 3 credential dumping detections',
      metricType: 'numeric',
      targetValue: 3,
      currentValue: 1,
      unit: 'detections',
      weight: 1.0,
      status: 'active',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tgt_today_card',
      projectId: 'proj_heimdall',
      parentTargetId: 'tgt_week_45_detections',
      horizon: 'day',
      period: todayStr,
      title: 'Write Kerberoasting detection card & test SPL',
      metricType: 'numeric',
      targetValue: 1,
      currentValue: 1,
      unit: 'card',
      weight: 1.0,
      status: 'done',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 5. Tasks
  const tasks: Task[] = [
    {
      id: 'tsk_kerberoast',
      projectId: 'proj_heimdall',
      milestoneId: 'ms_baseline',
      targetId: 'tgt_today_card',
      title: 'Write Kerberoasting detection card #heimdall >baseline ~90m !high @today +rules:1',
      notes: 'Correlate EventCode 4769 with Ticket Encryption Type 0x17 and RC4 usage on service accounts.',
      scheduleDate: todayStr,
      dueDate: todayStr,
      estimateMinutes: 90,
      actualMinutes: 85,
      priority: 'high',
      status: 'done',
      subtasks: [
        { id: 'sub_1', title: 'Verify Event 4769 in Splunk', isCompleted: true },
        { id: 'sub_2', title: 'Craft search filter for Kerberos service tickets', isCompleted: true },
        { id: 'sub_3', title: 'Export Sigma YAML rule', isCompleted: true },
      ],
      tags: ['detection', 'kerberos', 'active-directory'],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tsk_mimikatz',
      projectId: 'proj_heimdall',
      milestoneId: 'ms_attack_detect',
      title: 'Simulate LSASS memory dumping using procdump #heimdall >attack_detect ~60m !urgent @2026-11-02',
      notes: 'Test Sysmon Event ID 10 (ProcessAccess) and verify call trace matches known dumping patterns.',
      scheduleDate: '2026-11-02',
      dueDate: '2026-11-03',
      estimateMinutes: 60,
      priority: 'urgent',
      status: 'not_started',
      subtasks: [
        { id: 'sub_4', title: 'Configure Sysmon Event 10 include rules', isCompleted: false },
        { id: 'sub_5', title: 'Execute controlled procdump on test workstation', isCompleted: false },
      ],
      tags: ['lsass', 'sysmon', 'attack'],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tsk_secplus_ch4',
      projectId: 'goal_secplus',
      title: 'Review Chapter 4: Cryptography & PKI architectures ~75m !medium @today',
      scheduleDate: todayStr,
      dueDate: todayStr,
      estimateMinutes: 75,
      actualMinutes: 70,
      priority: 'medium',
      status: 'done',
      subtasks: [],
      tags: ['crypto', 'pki'],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tsk_missed_carryover',
      projectId: 'goal_secplus',
      title: 'Complete 50 practice quiz questions on Network Security ~45m !high',
      notes: 'Carried over from yesterday. Needs decision in Carry-Over Inbox.',
      scheduleDate: '2026-10-30',
      dueDate: '2026-10-30',
      carriedOverFromDate: '2026-10-30',
      estimateMinutes: 45,
      priority: 'high',
      status: 'not_started',
      subtasks: [],
      tags: ['quiz', 'questions'],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 6. Habits (PRD Section 16 & Section 6.4)
  const habits: Habit[] = [
    {
      id: 'hbt_study',
      linkedGoalId: 'goal_secplus',
      title: 'Daily Deep Study Block (90m)',
      metricType: 'duration',
      scheduleType: 'daily',
      targetValue: 90,
      unit: 'minutes',
      isAvoidance: false,
      startDate: '2026-10-01',
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'hbt_exercise',
      title: 'Strength Training 3x/week',
      metricType: 'boolean',
      scheduleType: 'n_per_week',
      targetFrequency: 3,
      targetValue: 1,
      isAvoidance: false,
      startDate: '2026-10-01',
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'hbt_sleep',
      title: 'Sleep Window 11 PM - 7 AM (7.5h)',
      metricType: 'duration',
      scheduleType: 'daily',
      targetValue: 450,
      unit: 'minutes',
      isAvoidance: false,
      startDate: '2026-10-01',
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'hbt_review',
      title: 'Sunday Weekly Review & Carry-over Triage',
      metricType: 'boolean',
      scheduleType: 'n_per_week',
      targetFrequency: 1,
      targetValue: 1,
      isAvoidance: false,
      startDate: '2026-10-01',
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 7. Routines (PRD Section 16 & Section 6.4 HB-5)
  const routines: Routine[] = [
    {
      id: 'rtn_morning',
      title: 'Morning Startup Routine',
      timeWindow: 'morning',
      steps: [
        { id: 'step_1', title: 'Hydrate & 5 min light movement', durationMinutes: 10, order: 1 },
        { id: 'step_2', title: 'Open Today Strip (<5s glance at due targets & habits)', durationMinutes: 5, order: 2 },
        { id: 'step_3', title: 'Confirm Top 3 priority tasks for today', durationMinutes: 5, order: 3 },
      ],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rtn_evening',
      title: 'Evening Shutdown & Review Routine',
      timeWindow: 'shutdown',
      steps: [
        { id: 'step_4', title: 'Log final counts, durations, and checkboxes', durationMinutes: 5, order: 1 },
        { id: 'step_5', title: 'Triage Carry-over Inbox (reschedule, split, or drop)', durationMinutes: 5, order: 2 },
        { id: 'step_6', title: 'Score daily energy and mood rating (1-5)', durationMinutes: 2, order: 3 },
      ],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 8. Blockers (PRD 5.2)
  const blockers: Blocker[] = [
    {
      id: 'blk_nvme',
      entityType: 'project',
      entityId: 'proj_heimdall',
      description: 'Secondary NVMe SSD storage space tight for high-volume Zeek PCAP captures.',
      dateRaised: '2026-10-25',
      dateCleared: '2026-10-28', // Cleared!
      createdAt: now,
    },
  ];

  // 9. Historical Progress Logs (28 days of check-ins for the Study habit)
  const progressLogs: ProgressLog[] = [];
  for (let day = 1; day <= 30; day++) {
    const dateStr = `2026-10-${day.toString().padStart(2, '0')}`;
    const dayOfWeek = new Date(dateStr).getDay(); // 0 is Sunday
    // Log study on most days, skip some Sundays
    if (dayOfWeek !== 0 || day % 2 === 0) {
      progressLogs.push({
        id: `log_study_${day}`,
        entityType: 'habit',
        entityId: 'hbt_study',
        timestamp: `${dateStr}T20:00:00.000Z`,
        date: dateStr,
        value: 90,
        unit: 'minutes',
        note: 'Solid deep work focus session.',
        isDeleted: false,
        createdAt: now,
      });
    }
    // Exercise 3x a week (Mon, Wed, Fri)
    if ([1, 3, 5].includes(dayOfWeek)) {
      progressLogs.push({
        id: `log_ex_${day}`,
        entityType: 'habit',
        entityId: 'hbt_exercise',
        timestamp: `${dateStr}T17:30:00.000Z`,
        date: dateStr,
        value: 1,
        unit: 'session',
        note: 'Compound lift routine.',
        isDeleted: false,
        createdAt: now,
      });
    }
  }

  // 10. Initial Change Log Entries (PRD Section 10.3)
  const changeLogs: ChangeLogEntry[] = [
    {
      id: 'chg_init_1',
      timestamp: now,
      entityType: 'project',
      entityId: 'proj_heimdall',
      action: 'create',
      newValue: { title: 'Heimdall SOC Lab', priority: 'urgent' },
      reason: 'Initial setup per PRD Section 16 seed plan',
    },
    {
      id: 'chg_init_2',
      timestamp: now,
      entityType: 'target',
      entityId: 'tgt_today_card',
      action: 'update',
      fieldChanged: 'currentValue',
      oldValue: 0,
      newValue: 1,
      reason: 'Kerberoasting detection card completed and verified in Splunk',
    },
    {
      id: 'chg_init_3',
      timestamp: now,
      entityType: 'milestone',
      entityId: 'ms_baseline',
      action: 'update',
      fieldChanged: 'status',
      oldValue: 'not_started',
      newValue: 'active',
      reason: 'SIEM pipeline completed; beginning network baseline profile',
    },
  ];

  // Bulk add to Dexie tables inside a single transaction
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
      await Promise.all([
        db.areas.bulkAdd(areas),
        db.projects.bulkAdd(projects),
        db.milestones.bulkAdd(milestones),
        db.targets.bulkAdd(targets),
        db.tasks.bulkAdd(tasks),
        db.habits.bulkAdd(habits),
        db.routines.bulkAdd(routines),
        db.progressLogs.bulkAdd(progressLogs),
        db.blockers.bulkAdd(blockers),
        db.changeLogs.bulkAdd(changeLogs),
      ]);
    }
  );
}

