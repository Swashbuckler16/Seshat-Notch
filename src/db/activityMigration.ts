import type { Transaction } from 'dexie';
import type { Habit, Area, ProjectGoal, ProgressLog } from '../types/index.ts';

/** Shared by the database upgrade and old-file imports. Legacy records remain recoverable. */
export async function migrateActivities(tx: Transaction): Promise<void> {
  const habits = await tx.table<Habit>('habits').toArray();
  if (!habits.length) return;
  const areas = await tx.table<Area>('areas').toArray();
  const projects = await tx.table<ProjectGoal>('projects').toArray();
  let unsorted = areas.find(a=>a.name === 'Unsorted');
  const now = new Date().toISOString();
  for (const h of habits) {
    const inherited = projects.find(p=>p.id === h.linkedGoalId)?.areaId;
    let areaId = areas.some(a=>a.id===h.areaId) ? h.areaId : areas.some(a=>a.id===inherited) ? inherited : undefined;
    if (!areaId) {
      if (!unsorted) { unsorted={id:'area_activity_unsorted',name:'Unsorted',order:areas.length,isArchived:false,createdAt:now,updatedAt:now}; await tx.table('areas').put(unsorted); areas.push(unsorted); }
      areaId=unsorted.id;
    }
    await tx.table('habits').put({...h,areaId,kind:h.kind ?? (h.isAvoidance?'avoid':h.metricType==='boolean'?'yes_no':h.metricType==='count'?'count':'measure'),icon:h.icon??'sparkles',accent:h.accent??Math.max(0,areas.findIndex(a=>a.id===areaId))%8,targetDirection:h.targetDirection??'at_least',scheduleVersions:h.scheduleVersions?.length?h.scheduleVersions:[{effectiveFrom:h.startDate,scheduleType:h.scheduleType,weekdays:h.scheduleDaysOfWeek,timesPerWeek:h.targetFrequency,intervalDays:h.intervalDays}]});
  }
  const logs = await tx.table<ProgressLog>('progressLogs').toArray();
  const groups = new Map<string,ProgressLog[]>();
  for(const e of logs) if(e.entityType==='habit'&&!e.isDeleted) {const k=`${e.entityId}:${e.date}`; groups.set(k,[...(groups.get(k)??[]),e]);}
  for(const group of groups.values()) if(group.length>1) {
    group.sort((a,b)=>(a.timestamp??'').localeCompare(b.timestamp??''));
    const retained=group[group.length-1], h=habits.find(a=>a.id===retained.entityId);
    const total=h && h.metricType!=='boolean' && !h.isAvoidance ? group.reduce((sum,e)=>sum+e.value,0) : retained.value;
    for(const e of group.slice(0,-1)) await tx.table('progressLogs').update(e.id,{isDeleted:true});
    await tx.table('progressLogs').update(retained.id,{value:total});
  }
}
