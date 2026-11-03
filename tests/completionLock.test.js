import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/index.ts';
import { activityService } from '../src/services/activityService.ts';
import { domainService } from '../src/services/domainService.ts';

test('Completion lock protects past/future writes, bulk changes, undo and midnight rollover',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date(2026,10,3,12)});
  await db.delete();await db.open();
  const activity={id:'locked',title:'Read',kind:'yes_no',metricType:'boolean',scheduleType:'daily',targetValue:1,startDate:'2026-11-01',isDeleted:false,isArchived:false};
  await db.habits.put(activity);
  const historical={id:'history',entityId:'locked',entityType:'habit',date:'2026-11-02',value:1,isDeleted:false};
  await db.progressLogs.put(historical);
  for(const date of ['2026-11-02','2026-11-04']) {
    for(const input of [{value:1},{value:5},null])await assert.rejects(activityService.setEntry('locked',date,input,date),/only update today/);
    await assert.rejects(activityService.toggle('locked',date,date),/only update today/);
    await assert.rejects(domainService.logHabitSkip('locked',date),/only update today/);
    await assert.rejects(domainService.logAvoidanceRelapse('locked',date),/only update today/);
  }
  await assert.rejects(activityService.bulkSet('locked',['2026-11-03','2026-11-02'],true),/only update today/);
  assert.equal(await db.progressLogs.count(),1);
  await assert.rejects(activityService.restoreEntries([{activityId:'locked',date:'2026-11-02',entries:[]}]),/only update today/);
  assert.deepEqual(await db.progressLogs.get('history'),historical);
  await activityService.setEntry('locked','2026-11-03',{value:1});
  await activityService.toggle('locked','2026-11-03');
  await activityService.setEntry('locked','2026-11-03',{value:1});
  t.mock.timers.setTime(new Date(2026,10,4,0,1).getTime());
  await assert.rejects(activityService.setEntry('locked','2026-11-03',null,'2026-11-03'),/only update today/);
  await activityService.setEntry('locked','2026-11-04',{value:1});
  assert.equal(await db.progressLogs.filter(e=>!e.isDeleted).count(),3);
  await db.delete();
});

test('Daily task and goal completion is locked while future planning remains available',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date(2026,10,3,12)});
  await db.open();
  for(const date of ['2026-11-02','2026-11-03','2026-11-04']) {
    await db.tasks.put({id:date,title:'Task',scheduleDate:date,status:'not_started'});
    await db.targets.put({id:date,title:'Goal',horizon:'day',period:date,currentValue:0,targetValue:1,status:'not_started'});
    if(date!=='2026-11-03') {
      await assert.rejects(domainService.toggleTaskStatus(date),/only update today/);
      await assert.rejects(domainService.setTaskStatus(date,'done'),/only update today/);
      await assert.rejects(domainService.updateTask(date,{status:'done'}),/only update today/);
      await assert.rejects(domainService.updateTask(date,{subtasks:[{id:'step',title:'Step',isCompleted:true}]}),/only update today/);
      await assert.rejects(domainService.createTask({title:'Already done',scheduleDate:date,status:'done',subtasks:[]}),/only update today/);
      await assert.rejects(domainService.createTarget({title:'Already done',horizon:'day',period:date,currentValue:1,status:'done'}),/only update today/);
      await assert.rejects(domainService.updateTargetProgress(date,1),/only update today/);
      await assert.rejects(domainService.updateTarget(date,{currentValue:1}),/only update today/);
    }
  }
  await domainService.updateTask('2026-11-04',{title:'Plan tomorrow'});
  await domainService.toggleTaskStatus('2026-11-03');
  await domainService.updateTargetProgress('2026-11-03',1);
  assert.equal((await db.tasks.get('2026-11-03')).status,'done');
  assert.equal((await db.targets.get('2026-11-03')).currentValue,1);
  assert.equal((await db.tasks.get('2026-11-04')).title,'Plan tomorrow');
  await db.delete();
});
