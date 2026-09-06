import { describe, expect, it } from 'vitest';
import { PROJECT_SCHEDULE_DAY_WIDTH, projectScheduleBar, projectScheduleOffset, projectScheduleScale } from './project-schedule';

describe('projectScheduleScale', () => {
  it('labels Mondays and draws one light division per calendar day', () => {
    const scale = projectScheduleScale('2026-08-30', '2026-09-16');

    expect(scale.majorUnit).toBe('week');
    expect(scale.minorUnit).toBe('day');
    expect(scale.major).toEqual([
      { date: '2026-08-31', label: 'Aug 31' },
      { date: '2026-09-07', label: 'Sep 7' },
      { date: '2026-09-14', label: 'Sep 14' },
    ]);
    expect(scale.minor).toHaveLength(18);
  });

  it('retains a Monday that is the first visible date', () => {
    expect(projectScheduleScale('2026-09-07', '2026-09-14').major.map((mark) => mark.date)).toEqual(['2026-09-07', '2026-09-14']);
  });

  it('uses the same pixel distance for every day regardless of total duration', () => {
    expect(projectScheduleOffset('2026-08-30', '2026-09-06')).toBe(7 * PROJECT_SCHEDULE_DAY_WIDTH);
    expect(projectScheduleOffset('2026-01-01', '2026-01-08')).toBe(7 * PROJECT_SCHEDULE_DAY_WIDTH);
  });

  it('sizes inclusive one-day and seven-day bars at the fixed zoom', () => {
    expect(projectScheduleBar('2026-08-30', '2026-08-30', '2026-08-31').width).toBe(`${PROJECT_SCHEDULE_DAY_WIDTH}px`);
    expect(projectScheduleBar('2026-08-30', '2026-08-30', '2026-09-06').width).toBe(`${7 * PROJECT_SCHEDULE_DAY_WIDTH}px`);
  });
});
