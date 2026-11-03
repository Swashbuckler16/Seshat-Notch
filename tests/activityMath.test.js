import test from 'node:test';
import assert from 'node:assert/strict';
import { getActivityStats, getActivityDay, getOverviewStats, dateRange } from '../src/utils/activityMath.ts';
import { getLocalDateString } from '../src/utils/dateUtils.ts';
const activity={id:'sleep',title:'Sleep cycle',areaId:'health',kind:'time_window',metricType:'boolean',scheduleType:'daily',targetValue:1,startDate:'2026-10-01',isDeleted:false,isArchived:false};
const entry=(date,value=1,extra={})=>({id:date,entityType:'habit',entityId:'sleep',date,value,isDeleted:false,...extra});
const misses=['2026-10-07','2026-10-13','2026-10-21','2026-10-25'];
const history=dateRange(activity.startDate,'2026-11-02').filter(d=>!misses.includes(d)).map(d=>entry(d));
test('Activity A: exact Sleep example, open today, monthly totals and undo math',()=>{
  const s=getActivityStats(activity,history,'2026-11-03');
  assert.equal(s.scheduled,33);assert.equal(s.done,29);assert.equal(s.missed,4);assert.equal(s.rate.toFixed(1),'87.9');
  assert.equal(s.currentStreak,8);assert.equal(s.bestStreak,8);assert.deepEqual(s.streaks.map(s=>s.length),[6,5,7,3,8]);
  assert.deepEqual(s.missedDates,misses);assert.deepEqual(s.monthly.map(m=>[m.done,m.scheduled]),[[27,31],[2,2]]);
  const done=getActivityStats(activity,[...history,entry('2026-11-03')],'2026-11-03');
  assert.equal(done.currentStreak,9);assert.equal(done.rate.toFixed(1),'88.2');
  const overall=getOverviewStats([activity],history,'2026-11-03',activity.startDate);
  assert.equal(overall.rate,s.rate);assert.equal(overall.longestStreak,8);assert.equal(overall.perfectDays,29);
});
test('Activity B: partial amounts, upper limits require entry, strict rate differs from attainment',()=>{
  const water={...activity,kind:'count',targetValue:8};
  assert.equal(getActivityDay(water,[entry('2026-10-01',4)],'2026-10-01','2026-10-02').state,'partial');
  const stats=getActivityStats(water,[entry('2026-10-01',4)],'2026-10-02');assert.equal(stats.averageAttainment,50);assert.equal(stats.rate,0);
  assert.equal(getActivityDay(water,[entry('2026-10-01',8)],'2026-10-01','2026-10-02').done,true);
  const limit={...water,targetDirection:'at_most',targetValue:0};
  assert.equal(getActivityDay(limit,[],'2026-10-01','2026-10-02').done,false);
  assert.equal(getActivityDay(limit,[entry('2026-10-01',0)],'2026-10-01','2026-10-02').done,true);
});
test('Activity C/D: selected schedule, pause and excused preserve streak; versions preserve history',()=>{
  const a={...activity,startDate:'2026-10-26',scheduleType:'weekdays',pausedRanges:[{startDate:'2026-10-28',endDate:'2026-10-29'}],customSkipDates:['2026-10-30']};
  const logs=['2026-10-26','2026-10-27','2026-11-02'].map(d=>entry(d));
  const s=getActivityStats(a,logs,'2026-11-03');assert.equal(s.currentStreak,3);assert.equal(s.rate,100);
  assert.equal(getActivityDay(a,logs,'2026-11-01','2026-11-03').state,'not_scheduled');
  const changed={...activity,scheduleVersions:[{effectiveFrom:'2026-10-01',scheduleType:'daily'},{effectiveFrom:'2026-11-09',scheduleType:'weekdays'}]};
  assert.deepEqual(getActivityStats(changed,history,'2026-11-03'),getActivityStats(activity,history,'2026-11-03'));
});
test('Activity C: quota streaks count weeks and do not break during open week',()=>{
  const a={...activity,startDate:'2026-10-19',scheduleType:'n_per_week',targetFrequency:3};
  const logs=['2026-10-19','2026-10-21','2026-10-23','2026-10-26','2026-10-28','2026-10-30'].map(d=>entry(d));
  const s=getActivityStats(a,logs,'2026-11-03');assert.equal(s.streakUnit,'weeks');assert.equal(s.currentStreak,2);assert.equal(s.bestStreak,2);
});
test('Activity E/F: explicit rollover and future/before-start bounds',()=>{
  assert.equal(getLocalDateString(new Date(2026,10,2,2),3),'2026-11-01');
  assert.equal(getActivityDay(activity,history,'2026-11-04','2026-11-03').state,'future');
  assert.equal(getActivityDay(activity,history,'2026-09-30','2026-11-03').state,'before_start');
});
test('Activity avoidance uses explicit clean entry unless opt-in; slips never clean',()=>{
  const a={...activity,kind:'avoid'};
  assert.equal(getActivityDay(a,[],'2026-10-01','2026-11-03').done,false);
  assert.equal(getActivityDay({...a,autoClean:true},[],'2026-10-01','2026-11-03').done,true);
  assert.equal(getActivityDay({...a,autoClean:true},[entry('2026-10-01',-1)],'2026-10-01','2026-11-03').done,false);
});
test('Activity timing unwraps midnight and reports measured sample sizes',()=>{
  const s=getActivityStats(activity,[entry('2026-10-01',1,{actualStart:'23:55',actualEnd:'06:00'}),entry('2026-10-02',1,{actualStart:'00:05',actualEnd:'06:00'})],'2026-10-03');
  assert.equal(s.timeConsistency.count,2);assert.equal(s.timeConsistency.startMean,0);assert.equal(s.timeConsistency.startSD,5);assert.equal(s.timeConsistency.endSD,0);
});
test('Activity score weights each scheduled day with half-life 14, no samples return dash',()=>{
  const a={...activity,startDate:'2026-10-01'};
  assert.equal(getActivityStats(a,[],'2026-10-01').rate,null);
  const s=getActivityStats(a,[entry('2026-10-01')],'2026-10-03');
  const expected=(.5**(2/14))/(.5**(2/14)+.5**(1/14))*100;assert.ok(Math.abs(s.score-expected)<1e-9);
  assert.equal(s.momentum,null);
});
test('Activity deterministic property trials: finite, bounded, future invariant, streak ordered',()=>{
  let seed=9721;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(let n=0;n<120;n++) {
    const a={...activity,kind:n%2?'count':'yes_no',targetValue:n%2?8:1,scheduleType:n%3?'daily':'weekdays'};
    const logs=dateRange(a.startDate,'2026-11-02').filter(()=>rand()>.3).map(d=>entry(d,Math.floor(rand()*10)));
    const s=getActivityStats(a,logs,'2026-11-03');
    for(const v of [s.rate,s.score,s.averageAttainment])if(v!==null)assert.ok(Number.isFinite(v)&&v>=0&&v<=100);
    assert.ok(s.currentStreak<=s.bestStreak);
    assert.equal(s.rate,getActivityStats(a,[...logs,entry('2026-12-01')],'2026-11-03').rate);
  }
});
