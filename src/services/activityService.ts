import { db } from '../db/index.ts';
import type { Habit, ProgressLog, ActivityScheduleVersion } from '../types/index.ts';
import { getLocalDateString, isValidDateString } from '../utils/dateUtils.ts';
import { activityKind, getActivityDay } from '../utils/activityMath.ts';
import { recordChange } from '../db/changeLogService.ts';
import { assertTodayCompletion } from '../utils/completionDate.ts';

export interface EntryInput { value: number; note?: string; actualStart?: string; actualEnd?: string }
export interface EntrySnapshot { activityId: string; date: string; entries: ProgressLog[] }
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
function validTime(value?: string) { return !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function validateSchedule(s: ActivityScheduleVersion) {
  if(!isValidDateString(s.effectiveFrom)) throw new Error('Choose a valid date for the new schedule.');
  if(!['daily','weekdays','n_per_week','every_n_days'].includes(s.scheduleType)) throw new Error('Choose a schedule.');
  if(s.weekdays?.some(d=>!Number.isInteger(d)||d<0||d>6)) throw new Error('Choose valid weekdays.');
  if(s.scheduleType==='n_per_week' && (!Number.isInteger(s.timesPerWeek)||s.timesPerWeek!<1||s.timesPerWeek!>7)) throw new Error('Choose between 1 and 7 times per week.');
  if(s.scheduleType==='every_n_days' && (!Number.isInteger(s.intervalDays)||s.intervalDays!<1)) throw new Error('The interval must be at least one day.');
}
async function requireActivity(activityId:string) { const a=await db.habits.get(activityId); if(!a||a.isDeleted) throw new Error('This activity is no longer available.'); return a; }
async function entriesFor(activityId:string,date:string) { return db.progressLogs.where('entityId').equals(activityId).filter(e=>e.entityType==='habit'&&e.date===date).toArray(); }
async function writeEntry(a:Habit,date:string,input:EntryInput|null,today:string) {
  assertTodayCompletion(date);
  if(!isValidDateString(date)||date<a.startDate||date>today) throw new Error('Choose a date from the activity’s start through today.');
  const entries=await entriesFor(a.id,date);
  const state=getActivityDay(a,entries,date,today);
  if(input && !state.scheduled) throw new Error('This day is a rest day. Change the schedule or remove the pause first.');
  if(input && (!Number.isFinite(input.value)||(input.value<0 && !(activityKind(a)==='avoid' && input.value===-1)))) throw new Error('Enter a number of zero or more.');
  if(input && (!validTime(input.actualStart)||!validTime(input.actualEnd))) throw new Error('Enter times in HH:MM format.');
  const current=entries.find(e=>!e.isDeleted)??entries[0];
  for(const e of entries) await db.progressLogs.update(e.id,{isDeleted:true});
  let result:ProgressLog|null=null;
  if(input) { result={...current,id:current?.id??id(),entityType:'habit',entityId:a.id,date,timestamp:now(),createdAt:current?.createdAt??now(),unit:a.unit??'count',...input,isDeleted:false}; await db.progressLogs.put(result); }
  await recordChange({entityType:'habit',entityId:a.id,action:'update',fieldChanged:'entry',oldValue:entries,newValue:result,reason:`Entry for ${date}`});
  return result;
}
export const activityService = {
  async save(data:Partial<Habit>&{title:string}, activityId?:string):Promise<Habit> {
    return db.transaction('rw',[db.habits,db.areas,db.changeLogs],async()=>{
      const old=activityId?await requireActivity(activityId):undefined;
      if(!data.title.trim()) throw new Error('Give your activity a name.');
      const areaId=data.areaId??old?.areaId;
      if(!areaId||!await db.areas.get(areaId)) throw new Error('Choose an Area for this activity.');
      const kind=data.kind??old?.kind??'yes_no',startDate=data.startDate??old?.startDate??getLocalDateString();
      if(!isValidDateString(startDate)) throw new Error('Choose a valid start date.');
      const targetValue=kind==='yes_no'||kind==='time_window'||kind==='avoid'?1:Number(data.targetValue??old?.targetValue??1);
      if(!Number.isFinite(targetValue)||targetValue<0 || (targetValue===0 && (data.targetDirection??old?.targetDirection)!=='at_most')) throw new Error('Enter a positive target, or zero for an upper limit.');
      const timeWindow=data.timeWindow??old?.timeWindow;
      if(kind==='time_window'&&(!timeWindow||!timeWindow.start||!timeWindow.end||!validTime(timeWindow.start)||!validTime(timeWindow.end))) throw new Error('Choose a start and end time.');
      const scheduleVersions=data.scheduleVersions??old?.scheduleVersions??[{effectiveFrom:startDate,scheduleType:data.scheduleType??'daily',weekdays:data.scheduleDaysOfWeek,timesPerWeek:data.targetFrequency,intervalDays:data.intervalDays}];
      scheduleVersions.forEach(validateSchedule);
      const a:Habit={metricType:kind==='count'?'count':kind==='measure'?'duration':'boolean',scheduleType:'daily',isAvoidance:kind==='avoid',isArchived:false,isDeleted:false,createdAt:now(),...old,...data,id:old?.id??id(),title:data.title.trim(),areaId,startDate,targetValue,kind,icon:data.icon??old?.icon??'sparkles',accent:data.accent??old?.accent??0,targetDirection:data.targetDirection??old?.targetDirection??'at_least',scheduleVersions:[...scheduleVersions].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)),updatedAt:now()};
      if(timeWindow) a.timeWindow={...timeWindow,crossesMidnight:timeWindow.end<timeWindow.start};
      await db.habits.put(a); await recordChange({entityType:'habit',entityId:a.id,action:old?'update':'create',oldValue:old,newValue:a});return a;
    });
  },
  async setEntry(activityId:string,date:string,input:EntryInput|null,today=getLocalDateString()) {
    return db.transaction('rw',[db.habits,db.progressLogs,db.changeLogs],async()=>writeEntry(await requireActivity(activityId),date,input,today));
  },
  async toggle(activityId:string,date:string,today=getLocalDateString()):Promise<boolean> {
    return db.transaction('rw',[db.habits,db.progressLogs,db.changeLogs],async()=>{
      const a=await requireActivity(activityId),entries=await entriesFor(activityId,date);
      const done=getActivityDay(a,entries,date,today).done;
      await writeEntry(a,date,done?null:{value:activityKind(a)==='count'||activityKind(a)==='measure'?a.targetValue:1},today);return !done;
    });
  },
  async bulkSet(activityId:string,dates:string[],done:boolean,today=getLocalDateString()):Promise<EntrySnapshot[]> {
    dates.forEach(assertTodayCompletion);
    return db.transaction('rw',[db.habits,db.progressLogs,db.changeLogs],async()=>{
      const a=await requireActivity(activityId), snapshots:EntrySnapshot[]=[];
      for(const date of [...new Set(dates)]) {
        const entries=await entriesFor(activityId,date);
        if(!getActivityDay(a,entries,date,today).scheduled) continue;
        snapshots.push({activityId,date,entries});
        await writeEntry(a,date,done?{value:a.targetValue}:null,today);
      } return snapshots;
    });
  },
  async restoreEntries(snapshots:EntrySnapshot[]|ProgressLog[]) {
    return db.transaction('rw',[db.progressLogs,db.changeLogs],async()=>{
      const grouped:EntrySnapshot[]=snapshots.length && 'activityId' in snapshots[0] ? snapshots as EntrySnapshot[] : (snapshots as ProgressLog[]).map(e=>({activityId:e.entityId,date:e.date,entries:[e]}));
      grouped.forEach(snap => { assertTodayCompletion(snap.date); snap.entries.forEach(entry => assertTodayCompletion(entry.date)); });
      for(const snap of grouped) {const current=await entriesFor(snap.activityId,snap.date);for(const e of current) await db.progressLogs.update(e.id,{isDeleted:true});if(snap.entries.length)await db.progressLogs.bulkPut(snap.entries);await recordChange({entityType:'habit',entityId:snap.activityId,action:'update',fieldChanged:'entry',newValue:snap.entries,reason:'Undo entry change'});}
    });
  },
  async setSchedule(activityId:string,version:ActivityScheduleVersion) {
    validateSchedule(version); const a=await requireActivity(activityId);
    return this.save({...a,scheduleVersions:[...(a.scheduleVersions??[{effectiveFrom:a.startDate,scheduleType:a.scheduleType,weekdays:a.scheduleDaysOfWeek,timesPerWeek:a.targetFrequency,intervalDays:a.intervalDays}])].filter(s=>s.effectiveFrom!==version.effectiveFrom).concat(version)},activityId);
  },
  async pause(activityId:string,startDate:string,endDate:string,reason?:string) {
    if(!isValidDateString(startDate)||!isValidDateString(endDate)||endDate<startDate) throw new Error('The break must end on or after its start.');
    const a=await requireActivity(activityId);return this.save({...a,pausedRanges:[...(a.pausedRanges??[]),{startDate,endDate,reason}]},activityId);
  },
  async excuse(activityId:string,date:string) {if(!isValidDateString(date))throw new Error('Choose a valid date.');const a=await requireActivity(activityId);return this.save({...a,customSkipDates:[...new Set([...(a.customSkipDates??[]),date])]},activityId);},
  async archive(activityId:string,isArchived=true) {const a=await requireActivity(activityId);return this.save({...a,isArchived},activityId);},
  async remove(activityId:string) {const a=await requireActivity(activityId);return this.save({...a,isDeleted:true},activityId);},
};
