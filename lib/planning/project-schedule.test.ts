import { describe, expect, it } from 'vitest';
import { dateRange } from './dates';
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

  it('fits a medium schedule to the available pane within readable bounds', () => {
    const scale = projectScheduleScale('2026-09-01', '2026-10-30', 996);

    expect(scale.dayWidth).toBe(15);
    expect(scale.trackWidth).toBe(996);
    expect(scale.majorUnit).toBe('week');
    expect(projectScheduleOffset('2026-09-01', '2026-09-08', scale.dayWidth)).toBe(105);
  });

  it('stops compressing long schedules and uses adaptive calendar marks', () => {
    const scale = projectScheduleScale('2026-01-01', '2026-12-31', 900);

    expect(scale.dayWidth).toBe(10);
    expect(scale.trackWidth).toBeGreaterThan(900);
    expect(scale.majorUnit).toBe('quarter');
    expect(scale.minorUnit).toBe('month');
    expect(scale.major.map((mark) => mark.date)).toEqual(['2026-01-01', '2026-04-01', '2026-07-01', '2026-10-01']);
  });

  it('retains a readable mobile day width instead of fitting a month into the viewport', () => {
    const scale = projectScheduleScale('2026-09-01', '2026-09-30', 200, 18);

    expect(scale.dayWidth).toBe(18);
    expect(scale.trackWidth).toBe(636);
  });

  it('presents a one-day activity as one date', () => {
    expect(dateRange('2026-09-13', '2026-09-13')).toBe('Sep 13');
    expect(dateRange('2026-09-13', '2026-09-15')).toBe('Sep 13 — Sep 15');
  });
});
