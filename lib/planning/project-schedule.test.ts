import { describe, expect, it } from 'vitest';
import { projectScheduleScale } from './project-schedule';

describe('projectScheduleScale', () => {
  it('does not clamp a pre-domain month label onto the leading edge', () => {
    const scale = projectScheduleScale('2026-08-30', '2026-10-03');

    expect(scale.majorUnit).toBe('month');
    expect(scale.major.map(mark => mark.date)).toEqual(['2026-09-01', '2026-10-01']);
    expect(scale.major.map(mark => mark.label)).toEqual(['Sep 2026', 'Oct 2026']);
  });

  it('retains an exact leading month boundary', () => {
    const scale = projectScheduleScale('2026-08-01', '2026-10-03');

    expect(scale.major.map(mark => mark.date)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
  });

  it('uses weekly labels for schedules up to one calendar month', () => {
    expect(projectScheduleScale('2026-08-30', '2026-09-30').majorUnit).toBe('week');
  });

  it('uses quarterly labels beyond six calendar months', () => {
    expect(projectScheduleScale('2026-01-15', '2026-07-16').majorUnit).toBe('quarter');
  });
});
