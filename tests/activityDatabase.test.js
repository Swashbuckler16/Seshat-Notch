import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/index.ts';
import { activityService } from '../src/services/activityService.ts';
import { dataOwnershipService } from '../src/services/dataOwnershipService.ts';
mock.timers.enable({apis:['Date'],now:new Date(2026,10,3,12)});
const now='2026-11-03T00:00:00Z';
const area={id:'health',name:'Health',order:0,isArchived:false,createdAt:now,updatedAt:now};
const legacy={id:'sleep',title:'Sleep cycle',metricType:'boolean',scheduleType:'daily',targetValue:1,isAvoidance:false,startDate:'2026-10-01',isDeleted:false,isArchived:false,createdAt:now,updatedAt:now};
test('Activity database: genuine v2 upgrade preserves identity, Area inheritance and history',async()=>{
  await db.delete();
  const old=new Dexie('seshat_notch_db');old.version(1).stores({areas:'id',projects:'id',habits:'id',progressLogs:'id'});old.version(2).stores({backups:'id'});
  await old.open();await old.table('areas').put(area);await old.table('projects').put({id:'project',areaId:'health'});
  await old.table('habits').bulkPut([{...legacy,linkedGoalId:'project'},{...legacy,id:'other'}]);
  await old.table('progressLogs').put({id:'entry',entityId:'sleep',entityType:'habit',date:'2026-10-01',value:1,isDeleted:false,timestamp:now,createdAt:now});old.close();
  await db.open();assert.equal(db.verno,3);assert.equal((await db.habits.get('sleep')).areaId,'health');assert.equal((await db.habits.get('sleep')).kind,'yes_no');assert.equal((await db.habits.get('other')).areaId,'area_activity_unsorted');assert.equal(await db.progressLogs.count(),1);
});
test('Activity entry writes are transactional, unique, soft deleted and revived',async()=>{
  await db.habits.put({...legacy,areaId:'health',kind:'yes_no'});
  await Promise.all([activityService.setEntry('sleep','2026-11-03',{value:1},'2026-11-03'),activityService.setEntry('sleep','2026-11-03',{value:1},'2026-11-03')]);
  let logs=await db.progressLogs.filter(e=>e.entityId==='sleep'&&e.date==='2026-11-03').toArray();assert.equal(logs.filter(e=>!e.isDeleted).length,1);const id=logs[0].id;
  await activityService.toggle('sleep','2026-11-03','2026-11-03');assert.equal((await db.progressLogs.get(id)).isDeleted,true);
  await activityService.toggle('sleep','2026-11-03','2026-11-03');assert.equal((await db.progressLogs.get(id)).isDeleted,false);
  await assert.rejects(activityService.toggle('sleep','2026-11-04','2026-11-03'));
  await assert.rejects(activityService.toggle('sleep','2026-09-30','2026-11-03'));
});
test('Activity schedules, pauses, bulk undo, archive and recovery retain entries',async()=>{
  await activityService.setSchedule('sleep',{effectiveFrom:'2026-11-09',scheduleType:'weekdays'});
  assert.equal((await db.habits.get('sleep')).scheduleVersions.length,2);
  await assert.rejects(activityService.pause('sleep','2026-11-10','2026-11-09'));
  const snapshot=await activityService.bulkSet('sleep',['2026-11-03'],false,'2026-11-03');
  await activityService.restoreEntries(snapshot);assert.equal(await db.progressLogs.filter(e=>e.entityId==='sleep'&&!e.isDeleted&&['2026-11-03'].includes(e.date)).count(),1);
  await activityService.remove('sleep');assert.equal((await db.habits.get('sleep')).isDeleted,true);
  await dataOwnershipService.restoreItem('habit','sleep');assert.equal((await db.habits.get('sleep')).isDeleted,false);
});
test('Activity v2 backup import upgrades records, keeps history and exports v3',async()=>{
  const history=[{id:'old-log',entityType:'habit',entityId:'sleep',date:'2026-10-03',value:1,isDeleted:false,timestamp:now,createdAt:now}];
  const payload={app:'Seshat Notch',schemaVersion:2,data:{areas:[area],habits:[legacy],progressLogs:history},preferences:{dayBoundaryHour:3}};
  await dataOwnershipService.importFromJson(JSON.stringify(payload),'replace');
  const a=await db.habits.get('sleep');assert.ok(a.areaId);assert.equal(a.kind,'yes_no');assert.equal(a.scheduleVersions.length,1);
  assert.deepEqual(await db.progressLogs.toArray(),history);
  const exported=JSON.parse(await dataOwnershipService.exportAllToJson());assert.equal(exported.schemaVersion,3);
  await db.delete();
});
