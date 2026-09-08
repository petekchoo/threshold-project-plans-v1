'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { addDays, date, isoDate } from '../../lib/planning/dates';
import { projectScheduleBar, projectScheduleOffset, projectScheduleScale } from '../../lib/planning/project-schedule';
import type { Activity, AppData } from '../../lib/planning/types';
import { statusLabel } from '../shared/status-pill';

type RelationshipFilter = 'all' | 'prerequisites' | 'dependents';
type TimelineRow = {
  activity: Activity;
  kind: 'selected' | 'prerequisite' | 'dependent';
  relationship: string;
};

const relationshipLabel = (constraint: string) =>
  constraint === 'finish_to_start' ? 'Finish to start' : 'Finish to finish';

export function ActivityContextTimeline({ activity, data }: { activity: Activity; data: AppData }) {
  const [selectedFilter, setSelectedFilter] = useState<RelationshipFilter | null>(null);
  const prerequisites = useMemo(() => (activity.activity_dependencies || []).flatMap((dependency) => {
    const item = [...data.activities, ...(data.archivedActivities || [])].find(candidate => candidate.id === dependency.depends_on_activity_id);
    return item ? [{ activity: item, kind: 'prerequisite' as const, relationship: `${relationshipLabel(dependency.constraint_type)} prerequisite` }] : [];
  }), [activity.activity_dependencies, data.activities, data.archivedActivities]);
  const dependents = useMemo(() => data.activities.flatMap((candidate) => {
    const dependency = (candidate.activity_dependencies || []).find(item => item.depends_on_activity_id === activity.id);
    return dependency ? [{ activity: candidate, kind: 'dependent' as const, relationship: `${relationshipLabel(dependency.constraint_type)} dependent` }] : [];
  }), [activity.id, data.activities]);

  const isSmallScreen = useSyncExternalStore(
    (onChange) => { const query = window.matchMedia('(max-width: 700px)'); query.addEventListener('change', onChange); return () => query.removeEventListener('change', onChange); },
    () => window.matchMedia('(max-width: 700px)').matches,
    () => false,
  );
  const filter = selectedFilter ?? (isSmallScreen ? (prerequisites.length ? 'prerequisites' : dependents.length ? 'dependents' : 'all') : 'all');

  const rows: TimelineRow[] = [
    ...(filter === 'all' || filter === 'prerequisites' ? prerequisites : []),
    { activity, kind: 'selected', relationship: 'Selected activity' },
    ...(filter === 'all' || filter === 'dependents' ? dependents : []),
  ];
  const project = activity.projects;
  if (!project) return null;
  const starts = [project.start_date, ...rows.map(row => row.activity.start_date)];
  const ends = [project.end_date, ...rows.map(row => row.activity.due_date)];
  const domainStart = starts.sort()[0];
  const domainEnd = ends.sort().at(-1) || project.end_date;
  const { trackWidth, dayWidth, major, minor } = projectScheduleScale(domainStart, domainEnd);
  const position = (value: string) => `${projectScheduleOffset(domainStart, value)}px`;
  const today = isoDate(new Date());
  const showToday = today >= domainStart && today <= domainEnd;
  const grid = <>{minor.map(mark => <i aria-hidden="true" className="schedule-grid-minor" key={`minor-${mark.date}`} style={{ left: position(mark.date) }}/>) }{major.map(mark => <i aria-hidden="true" className="schedule-grid-major" key={`major-${mark.date}`} style={{ left: position(mark.date) }}/>)}</>;

  return <section className="focus-timeline activity-context-timeline" aria-labelledby="activity-context-heading">
    <div className="section-head"><div><p className="eyebrow">Schedule</p><h2 id="activity-context-heading">Project and relationship context</h2></div></div>
    {(prerequisites.length > 0 || dependents.length > 0) && <div className="relationship-filters" aria-label="Relationship timeline filter">
      {(['all', 'prerequisites', 'dependents'] as const).map(value => <button type="button" aria-pressed={filter === value} onClick={() => setSelectedFilter(value)} key={value}>{value === 'all' ? 'All' : value === 'prerequisites' ? 'Prerequisites' : 'Dependents'}</button>)}
    </div>}
    <p className="timeline-description">Dates are positioned on a daily scale. Relationship direction is stated in every activity row.</p>
    <div className="project-schedule-scroll activity-context-scroll">
      <div className="project-schedule activity-context-grid" style={{ '--schedule-track-width': `${trackWidth}px` } as CSSProperties}>
        <div className="schedule-header-label">Timeline</div>
        <div className="schedule-header-track">{grid}{major.map(mark => <span key={mark.date} style={{ left: position(mark.date), width: `${dayWidth * 7}px` }}>{mark.label}</span>)}{showToday && <em className="activity-today-marker" style={{ left: position(today) }}>Today</em>}</div>
        <div className="schedule-row-label activity-context-label"><Link href={`/projects/${project.id}`}><strong>{project.name}</strong><small>Project · {date(project.start_date)} – {date(project.end_date)}</small></Link></div>
        <div className="schedule-track activity-context-track" role="img" aria-label={`${project.name} project window, ${date(project.start_date)} through ${date(project.end_date)}`}>{grid}{showToday && <i aria-hidden="true" className="activity-today-line" style={{ left: position(today) }}/>}<b aria-hidden="true" className="activity-context-bar project-context-bar" style={projectScheduleBar(domainStart, project.start_date, addDays(project.end_date, 1))}/></div>
        {rows.map(row => <div className="activity-context-row" key={`${row.kind}-${row.activity.id}`}>
          <div className={`schedule-row-label activity-context-label is-${row.kind}`}><Link href={`/activities/${row.activity.id}`} aria-current={row.kind === 'selected' ? 'page' : undefined}><strong>{row.activity.name}</strong><small>{row.relationship} · {statusLabel(row.activity.status)}</small><small>{date(row.activity.start_date)} – {date(row.activity.due_date)}{row.activity.projects?.id !== project.id ? ` · ${row.activity.projects?.name}` : ''}</small></Link></div>
          <div className="schedule-track activity-context-track" role="img" aria-label={`${row.activity.name}, ${row.relationship.toLowerCase()}, ${date(row.activity.start_date)} through ${date(row.activity.due_date)}`}>{grid}{showToday && <i aria-hidden="true" className="activity-today-line" style={{ left: position(today) }}/>}<i aria-hidden="true" className={`activity-context-bar status-${row.activity.status} is-${row.kind}`} style={projectScheduleBar(domainStart, row.activity.start_date, addDays(row.activity.due_date, 1))}/></div>
        </div>)}
      </div>
    </div>
  </section>;
}
