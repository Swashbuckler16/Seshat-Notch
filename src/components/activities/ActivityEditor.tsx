import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Droplets, BookOpen, Dumbbell, Footprints, Heart, Leaf, Star } from 'lucide-react';
import { db } from '../../db';
import type { Habit } from '../../types';
import { activityService } from '../../services/activityService';
import { domainService } from '../../services/domainService';
import { getLocalDateString } from '../../utils/dateUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export const activityIcons = { leaf: Leaf, moon: Moon, water: Droplets, book: BookOpen, gym: Dumbbell, walk: Footprints, heart: Heart, star: Star };
export function ActivityIcon({ icon, size = 24 }: { icon?: string; size?: number }) { const Icon = activityIcons[icon as keyof typeof activityIcons] || Leaf; return <Icon size={size} aria-hidden="true" />; }
const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function ActivityEditor({ activity, onClose }: { activity?: Habit; onClose: () => void }) {
  const areas = useLiveQuery(() => db.areas.filter(a => !a.isArchived).toArray()) || [];
  const [title, setTitle] = useState(activity?.title || '');
  const [area, setArea] = useState(activity?.areaId || '');
  const [newArea, setNewArea] = useState('');
  const [kind, setKind] = useState<NonNullable<Habit['kind']>>(activity?.kind || 'yes_no');
  const [target, setTarget] = useState(activity?.targetValue || 1);
  const [unit, setUnit] = useState(activity?.unit || '');
  const [direction, setDirection] = useState(activity?.targetDirection || 'at_least');
  const [start, setStart] = useState(activity?.timeWindow?.start || '22:00');
  const [end, setEnd] = useState(activity?.timeWindow?.end || '06:00');
  const latest = activity?.scheduleVersions?.at(-1);
  const [schedule, setSchedule] = useState(latest?.scheduleType || activity?.scheduleType || 'daily');
  const [days, setDays] = useState(latest?.weekdays || activity?.scheduleDaysOfWeek || [1,2,3,4,5]);
  const [frequency, setFrequency] = useState(latest?.timesPerWeek || activity?.targetFrequency || 3);
  const [interval, setInterval] = useState(latest?.intervalDays || activity?.intervalDays || 2);
  const [startDate, setStartDate] = useState(activity?.startDate || getLocalDateString());
  const [effective, setEffective] = useState(getLocalDateString());
  const [icon, setIcon] = useState(activity?.icon || 'leaf');
  const [accent, setAccent] = useState(activity?.accent || 0);
  const [notes, setNotes] = useState(activity?.notes || '');
  const [autoClean, setAutoClean] = useState(activity?.autoClean || false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const quantitative = kind === 'count' || kind === 'measure';
  return <Modal isOpen onClose={onClose} title={activity ? 'Edit activity' : 'Make room for a small habit'} subtitle="Pick something you want to return to. Each day is a fresh box." maxWidth="lg">
    <form className="activity-form" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try {
      let areaId = area;
      if (area === 'new') areaId = (await domainService.createArea({ name: newArea, order: areas.length })).id;
      if (!areaId) throw new Error('Choose an area for this activity.');
      if (schedule === 'weekdays' && !days.length) throw new Error('Choose at least one weekday.');
      const version = { effectiveFrom: activity ? effective : startDate, scheduleType: schedule, weekdays: schedule === 'weekdays' ? days : undefined, timesPerWeek: frequency, intervalDays: interval };
      const saved = await activityService.save({ title, areaId, kind, icon, accent, targetValue: quantitative ? target : 1, unit: quantitative ? unit : '', targetDirection: direction,
        timeWindow: kind === 'time_window' ? { start, end, crossesMidnight: end <= start } : undefined,
        scheduleType: activity ? activity.scheduleType : schedule, scheduleDaysOfWeek: days, targetFrequency: frequency, intervalDays: interval,
        startDate, notes, autoClean, metricType: quantitative ? 'count' : 'boolean', isAvoidance: kind === 'avoid',
        ...(!activity ? { scheduleVersions: [version] } : {}) }, activity?.id);
      if (activity && (schedule !== (latest?.scheduleType || activity.scheduleType) || JSON.stringify(days) !== JSON.stringify(latest?.weekdays || activity.scheduleDaysOfWeek || [1,2,3,4,5]) || frequency !== (latest?.timesPerWeek || activity.targetFrequency || 3) || interval !== (latest?.intervalDays || activity.intervalDays || 2))) await activityService.setSchedule(saved.id, version);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Please try again.'); } finally { setBusy(false); } }}>
      <label className="activity-field">Activity name<input autoFocus required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="For example, Sleep cycle" /></label>
      <div className="activity-form-columns"><label className="activity-field">Area<select required value={area} onChange={e=>setArea(e.target.value)}><option value="">Choose an area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}<option value="new">Create a new area</option></select></label><label className="activity-field">How will you track it?<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="yes_no">Check it off</option><option value="count">Count something</option><option value="measure">Enter a measurement</option><option value="time_window">Follow a time window</option><option value="avoid">Stay away from something</option></select></label></div>
      {area==='new' && <label className="activity-field">New area name<input required value={newArea} onChange={e=>setNewArea(e.target.value)} placeholder="Health and personal development" /></label>}
      {quantitative && <div className="activity-form-columns"><label className="activity-field">Daily goal<input required type="number" min="0.01" step="any" value={target} onChange={e=>setTarget(Number(e.target.value))} /></label><label className="activity-field">Unit<input required value={unit} onChange={e=>setUnit(e.target.value)} placeholder="glasses, steps, pages…" /></label><label className="activity-field">Success means<select value={direction} onChange={e=>setDirection(e.target.value as typeof direction)}><option value="at_least">At least this amount</option><option value="at_most">At most this amount</option></select></label></div>}
      {kind==='time_window' && <div className="activity-form-columns"><label className="activity-field">Start time<input required type="time" value={start} onChange={e=>setStart(e.target.value)} /></label><label className="activity-field">End time<input required type="time" value={end} onChange={e=>setEnd(e.target.value)} /></label><p className="activity-help">{end<=start ? 'Ends the following day.' : 'Starts and ends on the same day.'}</p></div>}
      <div className="activity-form-columns"><label className="activity-field">Repeat<select value={schedule} onChange={e=>setSchedule(e.target.value as typeof schedule)}><option value="daily">Every day</option><option value="weekdays">Choose weekdays</option><option value="n_per_week">A few times each week</option><option value="every_n_days">Every few days</option></select></label><label className="activity-field">Start date<input type="date" required value={startDate} onChange={e=>setStartDate(e.target.value)} /></label></div>
      {schedule==='weekdays' && <fieldset><legend>On these days</legend><div className="activity-day-picker">{[1,2,3,4,5,6,0].map(day=><button key={day} type="button" aria-pressed={days.includes(day)} onClick={()=>setDays(days.includes(day)?days.filter(d=>d!==day):[...days,day])}>{weekdays[day]}</button>)}</div></fieldset>}
      {schedule==='n_per_week' && <label className="activity-field">Times per week<input type="number" required min="1" max="7" value={frequency} onChange={e=>setFrequency(Number(e.target.value))}/></label>}
      {schedule==='every_n_days' && <label className="activity-field">Every how many days?<input type="number" required min="1" max="365" value={interval} onChange={e=>setInterval(Number(e.target.value))}/></label>}
      {activity && <label className="activity-field">Apply schedule changes from<input type="date" required min={startDate} value={effective} onChange={e=>setEffective(e.target.value)}/><span className="activity-help">Earlier days keep their original schedule.</span></label>}
      <div className="activity-form-columns"><fieldset><legend>Choose a symbol</legend><div className="activity-icon-picker">{Object.keys(activityIcons).map(key=><button type="button" key={key} aria-label={key} aria-pressed={icon===key} onClick={()=>setIcon(key)}><ActivityIcon icon={key}/></button>)}</div></fieldset><fieldset><legend>Choose a color</legend><div className="activity-icon-picker">{['Leaf','Ocean','Berry','Amber','Coral','Teal','Plum','Slate'].map((name,index)=><button type="button" key={name} aria-label={name} aria-pressed={accent===index} onClick={()=>setAccent(index)}><span className="activity-color" style={{background:`var(--activity-${index})`}}>{accent===index?'✓':''}</span></button>)}</div></fieldset></div>
      {kind==='avoid' && <label className="activity-check-label"><input type="checkbox" checked={autoClean} onChange={e=>setAutoClean(e.target.checked)}/>Count unmarked past days as clean<span className="activity-help">Off by default. Otherwise, check each day you stayed on track.</span></label>}
      <label className="activity-field">A note to yourself (optional)<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What would make this easier?"/></label>
      {error && <p role="alert" className="activity-error">{error}</p>}
      <div className="activity-form-actions"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={!title.trim() || !area || (area==='new'&&!newArea.trim()) || busy}>{busy?'Saving…':activity?'Save changes':'Create activity'}</Button></div>
    </form>
  </Modal>;
}
