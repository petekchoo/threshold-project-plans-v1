'use client';

export const statusLabel = (value: string) =>
  ({
    draft: 'Draft',
    on_track: 'On track',
    at_risk: 'At risk',
    blocked: 'Blocked',
    completed: 'Completed',
    not_started: 'Not started',
    in_progress: 'In progress',
  }[value] || value);

export function Pill({ value }: { value: string }) {
  return <span className={`status-pill status-${value}`}>{statusLabel(value)}</span>;
}
