import { useEffect, useRef, useState } from 'react';
import { db } from '../../db';
import type { ProgressLog } from '../../types';
import { activityService } from '../../services/activityService';

export function useActivityActions(today:string) {
  const [notice,setNotice]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const undoRef=useRef<null|{id:string;dates:string[];entries:ProgressLog[]}>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  async function change(id:string,dates:string[],action:()=>Promise<unknown>) {
    setBusy(true);setError('');try {
      const entries=await db.progressLogs.where('entityId').equals(id).filter(e=>e.entityType==='habit'&&dates.includes(e.date)&&!e.isDeleted).toArray();
      await action();undoRef.current={id,dates,entries};setNotice(dates.length>1?`${dates.length} days updated`:'Day updated');
      if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{setNotice('');undoRef.current=null;},5000);
      return true;
    }catch(err){setError(err instanceof Error?err.message:'Could not save. Please try again.');return false;}finally{setBusy(false);}
  }
  async function undo(){const snapshot=undoRef.current;if(!snapshot)return;setBusy(true);try{for(const date of snapshot.dates){const e=snapshot.entries.find(e=>e.date===date);await activityService.setEntry(snapshot.id,date,e?{value:e.value,note:e.note,actualStart:e.actualStart,actualEnd:e.actualEnd}:null,today);}setNotice('Change undone');undoRef.current=null;}catch(err){setError(err instanceof Error?err.message:'Could not undo.');}finally{setBusy(false);}}
  return {notice,error,busy,undo,change,canUndo:()=>Boolean(undoRef.current)};
}
