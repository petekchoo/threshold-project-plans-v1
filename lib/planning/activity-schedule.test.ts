import { describe, expect, it } from 'vitest';
import { placeDatedActivity } from './activity-schedule';

describe('placeDatedActivity', () => {
  it('preserves dates that already satisfy every bound', () => {
    expect(placeDatedActivity('2026-09-05', '2026-09-07', {
      earliest_start_date: '2026-09-04',
      earliest_due_date: '2026-09-06',
      latest_due_date: '2026-09-08',
    })).toEqual({ start_date: '2026-09-05', due_date: '2026-09-07', shift_days: 0 });
  });

  it('uses the strongest lower bound and preserves duration', () => {
    expect(placeDatedActivity('2026-09-05', '2026-09-07', {
      earliest_start_date: '2026-09-08',
      earliest_due_date: '2026-09-09',
    })).toEqual({ start_date: '2026-09-08', due_date: '2026-09-10', shift_days: 3 });
  });

  it('uses an upper finish bound to shift the complete window earlier', () => {
    expect(placeDatedActivity('2026-09-05', '2026-09-07', { latest_due_date: '2026-09-03' }))
      .toEqual({ start_date: '2026-09-01', due_date: '2026-09-03', shift_days: -4 });
  });

  it('rejects contradictory lower and upper bounds', () => {
    expect(() => placeDatedActivity('2026-09-05', '2026-09-07', {
      earliest_start_date: '2026-09-10',
      latest_due_date: '2026-09-09',
    })).toThrow('valid shared placement');
  });

  it('keeps calendar-day arithmetic exact across daylight-saving boundaries', () => {
    expect(placeDatedActivity('2026-10-31', '2026-11-02', { earliest_start_date: '2026-11-02' }))
      .toEqual({ start_date: '2026-11-02', due_date: '2026-11-04', shift_days: 2 });
  });
});
