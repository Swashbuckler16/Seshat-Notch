import type { Habit, ProgressLog, ActivityScheduleVersion } from '../types/index.ts';
import { shiftDateString, isValidDateString } from './dateUtils.ts';

export type ActivityDayState = 'done' | 'partial' | 'missed' | 'not_scheduled' | 'excused' | 'today' | 'future' | 'before_start';
export interface ActivityDay { date: string; state: ActivityDayState; scheduled: boolean; done: boolean; value: number; entry?: ProgressLog; attainment: number }
export interface ActivityBucket { done: number; scheduled: number; rate: number | null }
export function activityKind(a: Habit): NonNullable<Habit['kind']> { return a.kind ?? (a.isAvoidance ? 'avoid' : a.metricType === 'boolean' ? 'yes_no' : a.metricType === 'count' ? 'count' : 'measure'); }
export function dateRange(from: string, to: string): string[] {
  if (!isValidDateString(from) || !isValidDateString(to) || from > to) return [];
  const out: string[] = [];
  for (let d = from; d <= to; d = shiftDateString(d, 1)) out.push(d);
  return out;
}
export function calendarAge(later: string, earlier: string): number { return Math.round((Date.parse(`${later}T12:00:00Z`) - Date.parse(`${earlier}T12:00:00Z`)) / 86400000); }
export function weekday(date: string): number { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function weekStart(date: string): string { return shiftDateString(date, -((weekday(date) + 6) % 7)); }
export function scheduleForDate(a: Habit, date: string): ActivityScheduleVersion {
  return [...(a.scheduleVersions ?? [])].filter(s => s.effectiveFrom <= date).sort((x, y) => y.effectiveFrom.localeCompare(x.effectiveFrom))[0] ?? {
    effectiveFrom: a.startDate, scheduleType: a.scheduleType, weekdays: a.scheduleDaysOfWeek,
    timesPerWeek: a.targetFrequency, intervalDays: a.intervalDays,
  };
}
function activeEntries(a: Habit, entries: ProgressLog[]): Map<string, ProgressLog> {
  const map = new Map<string, ProgressLog>();
  for (const e of entries) if (e.entityType === 'habit' && e.entityId === a.id && !e.isDeleted) {
    const old = map.get(e.date);
    if (!old || (e.timestamp ?? e.createdAt ?? '') >= (old.timestamp ?? old.createdAt ?? '')) map.set(e.date, e);
  }
  return map;
}
function dayFromEntry(a: Habit, entry: ProgressLog | undefined, date: string, today: string): ActivityDay {
  const base: ActivityDay = { date, state: 'not_scheduled', scheduled: false, done: false, value: entry?.value ?? 0, entry, attainment: 0 };
  if (date < a.startDate) return { ...base, state: 'before_start' };
  if (date > today) return { ...base, state: 'future' };
  if (a.customSkipDates?.includes(date) || a.pausedRanges?.some(p => date >= p.startDate && date <= p.endDate) || /^(excused_skip|skip)/.test(entry?.note ?? '')) return { ...base, state: 'excused' };
  const s = scheduleForDate(a, date), wd = weekday(date);
  const scheduled = s.scheduleType === 'weekdays' ? (s.weekdays?.length ? s.weekdays.includes(wd) : wd > 0 && wd < 6) : s.scheduleType === 'every_n_days' ? calendarAge(date, s.effectiveFrom) % Math.max(1, s.intervalDays ?? 2) === 0 : true;
  if (!scheduled) return base;
  const kind = activityKind(a), value = Number.isFinite(entry?.value) ? entry!.value : 0;
  const amount = kind === 'count' || kind === 'measure';
  const slip = value < 0 || /^relapse:/.test(entry?.note ?? '');
  const done = amount ? Boolean(entry) && (a.targetDirection === 'at_most' ? value <= a.targetValue : value >= a.targetValue) : kind === 'avoid' ? !slip && (Boolean(entry) || Boolean(a.autoClean && date < today)) : Boolean(entry);
  const attainment = amount ? a.targetDirection === 'at_most' ? (done ? 1 : 0) : Math.max(0, Math.min(1, value / Math.max(a.targetValue, Number.EPSILON))) : done ? 1 : 0;
  return { ...base, scheduled: true, done, value, attainment, state: done ? 'done' : amount && value > 0 ? 'partial' : date === today ? 'today' : 'missed' };
}
export function getActivityDay(a: Habit, entries: ProgressLog[], date: string, today: string): ActivityDay { return dayFromEntry(a, activeEntries(a, entries).get(date), date, today); }
export function getActivityDays(a: Habit, entries: ProgressLog[], today: string, from = a.startDate, to = today): ActivityDay[] {
  const map = activeEntries(a, entries);
  return dateRange(from, to).map(date => dayFromEntry(a, map.get(date), date, today));
}
const percent = (done: number, scheduled: number): number | null => scheduled ? done / scheduled * 100 : null;
const counted = (d: ActivityDay, today: string) => d.scheduled && (d.date < today || d.done);
function bucket(days: ActivityDay[], today: string): ActivityBucket {
  const scheduled = days.filter(d => counted(d, today)).length, done = days.filter(d => d.scheduled && d.done).length;
  return { done, scheduled, rate: percent(done, scheduled) };
}
function grouped<K extends string>(days: ActivityDay[], today: string, field: K, key: (d: ActivityDay) => string) {
  const groups = new Map<string, ActivityDay[]>();
  for (const d of days) { const k = key(d), group = groups.get(k); if (group) group.push(d); else groups.set(k, [d]); }
  return [...groups].map(([k, ds]) => ({ [field]: k, ...bucket(ds, today) } as Record<K, string> & ActivityBucket));
}
function weighted(days: ActivityDay[], today: string) {
  const sample = days.filter(d => counted(d, today)).slice(-120);
  let numerator = 0, denominator = 0;
  for (const d of sample) { const w = .5 ** (calendarAge(today, d.date) / 14); denominator += w; numerator += d.done ? w : 0; }
  return { numerator, denominator, score: denominator ? numerator / denominator * 100 : null };
}
function momentumFor(days: ActivityDay[], today: string): number | null {
  const recentStart = shiftDateString(today, -29), previousStart = shiftDateString(today, -59);
  const recent = bucket(days.filter(d => d.date >= recentStart), today);
  const previous = bucket(days.filter(d => d.date >= previousStart && d.date < recentStart), today);
  return recent.scheduled >= 10 && previous.scheduled >= 10 ? recent.rate! - previous.rate! : null;
}
function timing(entries: ProgressLog[]) {
  const minutes = (s?: string) => s && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3)) : null;
  const valid = entries.filter(e => minutes(e.actualStart) !== null && minutes(e.actualEnd) !== null);
  // Unwrap around the first observation so 23:55 and 00:05 average to midnight.
  const summary = (values: number[]) => {
    if (!values.length) return { mean: null, sd: null };
    const anchor = values[0], xs = values.map(x => anchor + ((x - anchor + 2160) % 1440 - 720));
    const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
    return { mean: (mean + 1440) % 1440, sd: Math.sqrt(xs.reduce((s, v) => s + (v - mean) ** 2, 0) / xs.length) };
  };
  const starts = summary(entries.map(e => minutes(e.actualStart)).filter((v): v is number => v !== null));
  const ends = summary(entries.map(e => minutes(e.actualEnd)).filter((v): v is number => v !== null));
  return { count: valid.length, startCount: entries.filter(e => minutes(e.actualStart) !== null).length, endCount: entries.filter(e => minutes(e.actualEnd) !== null).length, startMean: starts.mean, endMean: ends.mean, startSD: starts.sd, endSD: ends.sd, durations: valid.map(e => (minutes(e.actualEnd)! - minutes(e.actualStart)! + 1440) % 1440) };
}
export function getActivityStats(a: Habit, entries: ProgressLog[], today: string, from = a.startDate, to = today, history?: ActivityDay[]) {
  const all = history ?? getActivityDays(a, entries, today), days = all.filter(d => d.date >= from && d.date <= to);
  const totals = bucket(days, today), streaks: {start: string; end: string; length: number}[] = [];
  const weeklyQuota = scheduleForDate(a, today).scheduleType === 'n_per_week';
  const units: {start: string; end: string; done: boolean; open: boolean}[] = weeklyQuota ? grouped(all, today, 'week', d => weekStart(d.date)).map(w => {
    const dates = all.filter(d => weekStart(d.date) === w.week && d.scheduled);
    const quota = scheduleForDate(a, dates[0]?.date ?? w.week).timesPerWeek ?? 1;
    return { start: w.week, end: shiftDateString(w.week, 6), done: quota > 0 && w.done >= quota, open: shiftDateString(w.week, 6) >= today };
  }).filter(w => all.some(d => d.scheduled && d.date >= w.start && d.date <= w.end)) : all.filter(d => d.scheduled).map(d => ({start:d.date,end:d.date,done:d.done,open:d.date === today}));
  let currentStreak = 0;
  for (const u of units) {
    if (u.done) {
      currentStreak++;
      const last = streaks[streaks.length - 1];
      if (currentStreak === 1) streaks.push({start:u.start,end:u.end,length:1});
      else { last.end = u.end; last.length = currentStreak; }
    } else if (!u.open) currentStreak = 0;
  }
  const valid = days.filter(d => counted(d, today)), logs = days.flatMap(d => d.entry ? [d.entry] : []);
  const values = valid.map(d => Math.max(0, d.value)), totalValue = values.reduce((s,v) => s+v,0);
  let gap = 0, longestGap = 0;
  for (const d of valid) { if(d.done) gap = 0; else longestGap = Math.max(longestGap, ++gap); }
  const weekdays = Array.from({length:7}, (_, day) => ({day, ...bucket(days.filter(d => weekday(d.date) === day), today)}));
  const recentStart = shiftDateString(today,-6);
  const recent = valid.filter(d => d.date >= recentStart);
  return { ...totals, missed: days.filter(d => d.scheduled && !d.done && d.date < today).length,
    score: weighted(all, today).score, momentum: momentumFor(all, today), currentStreak, bestStreak: Math.max(0,...streaks.map(s=>s.length)), streakUnit: weeklyQuota ? 'weeks' as const : 'days' as const, streaks, days,
    monthly: grouped(days,today,'month',d=>d.date.slice(0,7)), weekly: grouped(days,today,'week',d=>weekStart(d.date)), weekdays,
    missedDates: days.filter(d=>d.scheduled && !d.done && d.date < today).map(d=>d.date), longestGap,
    averageAttainment: valid.length ? valid.reduce((s,d)=>s+d.attainment,0)/valid.length*100 : null,
    totalValue, averageValue:valid.length ? totalValue/valid.length : null, personalBest: values.length ? Math.max(...values) : null,
    sevenDayAverage:recent.length ? recent.reduce((s,d)=>s+d.value,0)/recent.length : null,
    notes:logs.filter(e=>e.note).sort((x,y)=>y.date.localeCompare(x.date)), timeConsistency:timing(logs), checkIns:logs.length, historyDays:all,
    slips:logs.filter(e=>e.value<0 || /^relapse:/.test(e.note??'')).length,
  };
}
export function getOverviewStats(activities: Habit[], entries: ProgressLog[], today: string, from: string, to = today, histories?: Map<string, ActivityDay[]>) {
  const byActivity = new Map<string,ProgressLog[]>();
  for(const e of entries) { const list=byActivity.get(e.entityId); if(list)list.push(e);else byActivity.set(e.entityId,[e]); }
  const items = activities.filter(a=>!a.isDeleted && !a.isArchived).map(activity=>({activity,stats:getActivityStats(activity,byActivity.get(activity.id)??[],today,from,to,histories?.get(activity.id))}));
  const dayMaps = items.map(({stats}) => new Map(stats.days.map(day => [day.date, day])));
  const days = dateRange(from,to > today ? today : to).map(date=>{
    const states = dayMaps.flatMap(map => { const day = map.get(date); return day ? [day] : []; });
    return {date,...bucket(states,today),perfect:states.some(d=>d.scheduled) && states.filter(d=>d.scheduled).every(d=>d.done)};
  });
  const scheduled = items.reduce((s,i)=>s+i.stats.scheduled,0), done=items.reduce((s,i)=>s+i.stats.done,0);
  const weights = items.map(({stats})=>weighted(stats.historyDays,today));
  const denominator=weights.reduce((s,w)=>s+w.denominator,0);
  const allDays=items.flatMap(({stats})=>stats.historyDays);
  const rangeDays=items.flatMap(i=>i.stats.days);
  const longest=items.reduce<typeof items[number]|undefined>((best,i)=>!best || i.stats.currentStreak>best.stats.currentStreak?i:best,undefined);
  return { scheduled,done,rate:percent(done,scheduled),score:denominator?weights.reduce((s,w)=>s+w.numerator,0)/denominator*100:null,
    momentum:momentumFor(allDays,today),perfectDays:days.filter(d=>d.perfect).length,checkIns:items.reduce((s,i)=>s+i.stats.checkIns,0),
    longestStreak:longest?.stats.currentStreak??0,longestStreakActivity:longest?.activity.title??null,days,
    weekly:grouped(rangeDays,today,'week',d=>weekStart(d.date)),monthly:grouped(rangeDays,today,'month',d=>d.date.slice(0,7)),
    weekdays:Array.from({length:7},(_,day)=>({day,...bucket(rangeDays.filter(d=>weekday(d.date)===day),today)})),activities:items };
}
export function movingAverage(values: (number | null)[], window = 4): (number | null)[] {
  return values.map((_, i) => {const sample=values.slice(Math.max(0,i-window+1),i+1).filter((v):v is number=>v!==null&&Number.isFinite(v));return sample.length?sample.reduce((s,v)=>s+v,0)/sample.length:null;});
}
