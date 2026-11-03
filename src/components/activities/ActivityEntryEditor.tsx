import { useState } from 'react';
import type { Habit, ProgressLog } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { dateLabel } from './NotchGrid';

export function ActivityEntryEditor({activity,date,entry,onSave,onClose}:{activity:Habit;date:string;entry?:ProgressLog;onSave:(value:{value:number;note?:string;actualStart?:string;actualEnd?:string}|null)=>Promise<boolean>;onClose:()=>void}) {
  const [value,setValue]=useState(entry?.value ?? (activity.kind==='count'||activity.kind==='measure'?0:1));
  const [note,setNote]=useState(entry?.note||'');
  const [start,setStart]=useState(entry?.actualStart||'');
  const [end,setEnd]=useState(entry?.actualEnd||'');
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function save(clear=false) { setBusy(true);setError('');try { const saved=await onSave(clear?null:{value,note,actualStart:start||undefined,actualEnd:end||undefined});if(saved)onClose();else setError('Could not save this entry. Please try again.'); } catch(err){setError(err instanceof Error?err.message:'Could not save this entry.');}finally{setBusy(false);} }
  return <Modal isOpen onClose={onClose} title={activity.title} subtitle={dateLabel(date)}><form className="activity-form" onSubmit={e=>{e.preventDefault();void save();}}>
    {activity.kind==='avoid'&&<label className="activity-field">How did this day go?<select value={value} onChange={e=>setValue(Number(e.target.value))}><option value={1}>Stayed on track</option><option value={-1}>A slip to learn from</option></select></label>}
    {(activity.kind==='count'||activity.kind==='measure')&&<><label className="activity-field">Amount ({activity.unit})<input autoFocus type="number" step="any" min="0" required value={value} onChange={e=>setValue(Number(e.target.value))}/></label><div className="activity-toolbar"><Button onClick={()=>setValue(value+1)}>+1</Button><Button onClick={()=>setValue(value+5)}>+5</Button><Button onClick={()=>setValue(activity.targetValue)}>Set to {activity.targetValue}</Button></div></>}
    {activity.kind==='time_window'&&<><p>Planned: {activity.timeWindow?.start} to {activity.timeWindow?.end}</p><div className="activity-form-columns"><label className="activity-field">Actual start (optional)<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="activity-field">Actual end (optional)<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div></>}
    <label className="activity-field">Note (optional)<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Anything you want to remember?"/></label>
    {error&&<p role="alert" className="activity-error">{error}</p>}<div className="activity-form-actions">{entry&&<Button variant="danger" disabled={busy} onClick={()=>void save(true)}>Clear entry</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" disabled={busy}>{busy?'Saving…':'Save entry'}</Button></div>
  </form></Modal>;
}
