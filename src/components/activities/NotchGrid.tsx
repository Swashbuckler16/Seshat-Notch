import { useEffect, useMemo, useRef, useState } from 'react';
import type { Habit, ProgressLog } from '../../types';
import { getActivityDays } from '../../utils/activityMath';
import { shiftDateString } from '../../utils/dateUtils';

export interface NotchGridProps {
  activity: Habit;
  entries: ProgressLog[];
  today: string;
  from?: string;
  to?: string;
  compact?: boolean;
  calendar?: boolean;
  selectedDate?: string;
  onSelect?: (date: string, range?: string[]) => void;
  onEdit?: (date: string) => void;
}
const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function monday(date: string) { return shiftDateString(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7)); }
export function datesBetween(from: string, to: string) {
  const dates: string[] = [];
  for (let date = from; date <= to && dates.length < 4000; date = shiftDateString(date, 1)) dates.push(date);
  return dates;
}
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export function dateLabel(date: string) { return dateFormatter.format(new Date(`${date}T12:00:00`)); }
export function NotchGrid({ activity, entries, today, from, to, compact, calendar, selectedDate, onSelect, onEdit }: NotchGridProps) {
  const first = from || (compact ? shiftDateString(monday(today), -77) : `${today.slice(0, 4)}-01-01`);
  const last = to || (compact ? shiftDateString(monday(today), 6) : `${today.slice(0, 4)}-12-31`);
  const dates = useMemo(() => datesBetween(monday(first), shiftDateString(monday(last), 6)), [first, last]);
  const dayMap = useMemo(() => new Map(getActivityDays(activity, entries, today, dates[0], dates.at(-1)).map(day => [day.date, day])), [activity, entries, today, dates]);
  const [focused, setFocused] = useState(selectedDate || today);
  const [hint, setHint] = useState('Only today’s box can be updated. Other days are read-only.');
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focusDate = today < first ? first : today > last ? last : today;
    setFocused(focusDate);
    const el = scroller.current;
    const cell = el?.querySelector<HTMLElement>(`[data-date="${focusDate}"]`);
    if (el && cell && !calendar) el.scrollLeft = cell.offsetLeft - el.offsetLeft - el.clientWidth / 2;
  }, [first, last, today, calendar]);
  const describe = (date: string) => {
    const day = dayMap.get(date)!;
    return `${activity.title}, ${dateLabel(date)}, ${day.state.replaceAll('_', ' ')}${day.entry ? `, ${day.value} ${activity.unit || ''}${day.entry.note ? `, ${day.entry.note}` : ''}` : ''}`;
  };
  const renderBox = (date: string) => {
    const day = dayMap.get(date)!;
    const inert = date !== today || date < activity.startDate || !day.scheduled;
    const state = day.state.replaceAll('_', '-');
    return <button key={date} type="button" className={`notch-box notch-${state} ${date === today ? 'notch-today' : ''} ${date === selectedDate ? 'notch-selected' : ''}`}
      tabIndex={date === focused ? 0 : -1} aria-label={describe(date)} aria-disabled={inert || !onSelect} aria-pressed={day.done}
      title={describe(date)} data-date={date} id={`activity-day-${activity.id}-${date}`}
      onFocus={() => { setFocused(date); setHint(describe(date)); }} onMouseEnter={() => setHint(describe(date))}
      onContextMenu={onEdit && !inert ? (event) => { event.preventDefault(); onEdit(date); } : undefined}
      onClick={() => { if (inert || !onSelect) return; onSelect(date); }}
      onKeyDown={(event) => {
        const index = dates.indexOf(date); const row = index % 7;
        const offsets: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7, Home: -row, End: 6 - row, PageUp: -28, PageDown: 28 };
        if (event.key in offsets) { event.preventDefault(); const next = dates[Math.max(0, Math.min(dates.length - 1, index + offsets[event.key]))]; setFocused(next); scroller.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus(); }
      }}><span aria-hidden="true">{day.done ? '✓' : state === 'partial' ? '−' : state === 'paused' || state === 'excused' ? '/' : ''}</span></button>;
  };
  return <div className={`notch-history ${compact ? 'notch-compact' : ''}`} style={{ '--activity-accent': `var(--activity-${activity.accent ?? 0})` } as React.CSSProperties}>
    <div ref={scroller} className="notch-scroll" aria-label={`${activity.title} history`}>
      {calendar ? <div className="notch-calendar">{Array.from({ length: 12 }, (_, month) => {
        const monthStart = `${first.slice(0, 4)}-${String(month + 1).padStart(2, '0')}-01`;
        const nextMonth = month === 11 ? `${Number(first.slice(0, 4)) + 1}-01-01` : `${first.slice(0, 4)}-${String(month + 2).padStart(2, '0')}-01`;
        return <section key={month}><h4>{new Date(`${monthStart}T12:00:00`).toLocaleDateString(undefined, { month: 'long' })}</h4><div className="notch-month-grid">{names.map(n => <span key={n} className="notch-day-label">{n.slice(0, 1)}</span>)}{Array.from({length: (new Date(`${monthStart}T12:00:00`).getDay() + 6) % 7}, (_, i) => <span key={`blank${i}`} />)}{datesBetween(monthStart, shiftDateString(nextMonth, -1)).map(renderBox)}</div></section>;
      })}</div> : <div className="notch-layout"><div className="notch-weekdays"><span />{names.map(n => <span key={n}>{n}</span>)}</div><div className="notch-columns">{Array.from({ length: Math.ceil(dates.length / 7) }, (_, column) => {
        const week = dates.slice(column * 7, column * 7 + 7); const label = week.find(d => d.slice(8) === '01') || (column === 0 ? week[0] : null);
        return <div className={`notch-week ${label ? 'notch-month-start' : ''}`} key={week[0]}><span className="notch-month-label">{label ? new Date(`${label}T12:00:00`).toLocaleDateString(undefined, {month:'short'}) : ''}</span>{week.map(renderBox)}</div>;
      })}</div></div>}
    </div>
    {!compact && <><div className="notch-legend">{[['done','Done'],['partial','Partial'],['missed','Missed'],['not-scheduled','Rest day'],['excused','Excused']].map(([state,label]) => <span key={state}><i className={`notch-box notch-${state}`} aria-hidden="true">{state === 'done' ? '✓' : state === 'partial' ? '−' : state === 'excused' ? '/' : ''}</i>{label}</span>)}</div><p className="notch-hint" aria-live="polite">{hint}</p></>}
  </div>;
}
