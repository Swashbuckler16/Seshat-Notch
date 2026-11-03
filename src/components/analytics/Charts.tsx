import { useId } from 'react';

export interface ChartPoint { label: string; value: number | null; detail?: string }
export const percentage = (value: number | null | undefined) => value == null ? '—' : `${value.toFixed(1)}%`;

export function ChartTable({ points, valueLabel = 'Completion' }: { points: ChartPoint[]; valueLabel?: string }) {
  return <details className="analytics-table-toggle"><summary>View numbers</summary><div className="analytics-scroll" tabIndex={0}><table><thead><tr><th scope="col">Period</th><th scope="col">{valueLabel}</th><th scope="col">Details</th></tr></thead><tbody>{points.map((p, i) => <tr key={`${p.label}-${i}`}><th scope="row">{p.label}</th><td>{p.value == null ? '—' : p.value.toFixed(1)}</td><td>{p.detail || '—'}</td></tr>)}</tbody></table></div></details>;
}

/** React owns SVG. A fixed minimum plot width preserves readable axes on small screens. */
export function LineChart({ title, points, previous, target, percent = true, average = false }: { title: string; points: ChartPoint[]; previous?: ChartPoint[]; target?: number; percent?: boolean; average?: boolean }) {
  const id = useId();
  const available = points.filter(p => p.value != null);
  if (!available.length) return <section className="analytics-panel"><h3>{title}</h3><p className="analytics-empty">Your saved entries will appear here.</p></section>;
  const max = percent ? 100 : Math.max(1, target || 0, ...available.map(p => p.value!));
  const x = (i: number) => 46 + (i / Math.max(1, points.length - 1)) * 650;
  const y = (value: number) => 180 - value / max * 140;
  const path = (data: ChartPoint[]) => data.map((p, i) => p.value == null ? '' : `${i === 0 || data[i - 1].value == null ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const smooth = points.map((p, i) => { const window = points.slice(Math.max(0, i - 3), i + 1).filter(v => v.value != null); return { ...p, value: window.length === 4 ? window.reduce((s, v) => s + v.value!, 0) / 4 : null }; });
  return <section className="analytics-panel"><h3>{title}</h3><div className="analytics-chart-scroll" tabIndex={0}><svg viewBox="0 0 750 224" role="img" aria-labelledby={id} className="analytics-chart"><title id={id}>{title}. {available.length} recorded periods. Use View numbers for exact values.</title>{[0, .5, 1].map(f => <g key={f}><line x1="46" x2="700" y1={y(max * f)} y2={y(max * f)} className="analytics-gridline"/><text x="36" y={y(max * f) + 4} textAnchor="end">{Math.round(max * f)}{percent ? '%' : ''}</text></g>)}{target != null && <g><line x1="46" x2="700" y1={y(target)} y2={y(target)} className="analytics-target"/><text x="696" y={y(target) - 8} textAnchor="end">Target {target}</text></g>}{previous && <path d={path(previous.slice(0, points.length))} className="analytics-line analytics-previous"/>}<path d={path(points)} className="analytics-line"/>{average && <path d={path(smooth)} className="analytics-line analytics-average"/>}{points.map((p,i) => p.value == null ? null : <circle key={i} cx={x(i)} cy={y(p.value)} r="3" className="analytics-point"><title>{p.label}: {percent ? percentage(p.value) : p.value} {p.detail}</title></circle>)}{[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v,i,a)=>a.indexOf(v)===i).map(i => <text key={i} x={x(i)} y="211" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{points[i].label}</text>)}</svg></div>{average && <p className="analytics-caption">Solid: weekly completion. Dashed: four-week average.{previous ? ' Faint: previous period.' : ''}</p>}<ChartTable points={points} valueLabel={percent ? 'Completion (%)' : 'Value'}/></section>;
}

export function BarChart({ title, points, percent = true }: { title: string; points: ChartPoint[]; percent?: boolean }) {
  const id = useId();
  const max = percent ? 100 : Math.max(1,...points.map(p => p.value || 0));
  if (!points.some(p => p.value != null)) return <section className="analytics-panel"><h3>{title}</h3><p className="analytics-empty">There are no scheduled days in this range.</p></section>;
  const pitch = 650 / Math.max(1,points.length);
  return <section className="analytics-panel"><h3>{title}</h3><div className="analytics-chart-scroll" tabIndex={0}><svg viewBox="0 0 750 230" role="img" aria-labelledby={id} className="analytics-chart"><title id={id}>{title}. Exact values are printed above each bar and in View numbers.</title><line x1="40" x2="710" y1="180" y2="180" className="analytics-gridline"/>{points.map((p,i) => <g key={i}><rect x={45+i*pitch} y={180-(p.value || 0)/max*125} width={Math.max(8,pitch-15)} height={(p.value || 0)/max*125} rx="4" className="analytics-bar"/><text x={45+i*pitch+(pitch-15)/2} y={168-(p.value || 0)/max*125} textAnchor="middle">{p.value == null ? '—' : `${Math.round(p.value)}${percent ? '%' : ''}`}</text><text x={45+i*pitch+(pitch-15)/2} y="205" textAnchor="middle">{p.label}</text></g>)}</svg></div><ChartTable points={points} valueLabel={percent ? 'Completion (%)' : 'Days'}/></section>;
}

