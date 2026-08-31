'use client';

export const statusLabel = (value: string) =>
  ({
    draft: 'Draft',
    on_track: 'On Track',
    at_risk: 'At Risk',
    blocked: 'Blocked',
    completed: 'Completed',
    not_started: 'Not Started',
    in_progress: 'In Progress',
  }[value] || value);

export function Pill({ value }: { value: string }) {
  return <span className={`status-pill status-${value}`}>{statusLabel(value)}</span>;
}
