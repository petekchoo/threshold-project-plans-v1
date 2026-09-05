import { describe, expect, it } from 'vitest';
import { movementCopy, windowCopy } from './reschedule-preview-dialog';
import type { AuthoritativeProjectReschedulePlan } from '../../lib/planning/types';

const plan = {
  end_delta_days: 1,
  window_change: 'shift',
} as AuthoritativeProjectReschedulePlan;

describe('reschedule preview copy', () => {
  it('describes the calendar-day movement with correct direction and plurality', () => {
    expect(movementCopy(plan)).toBe('Activity dates move 1 calendar day later.');
    expect(movementCopy({ ...plan, end_delta_days: -3 })).toBe('Activity dates move 3 calendar days earlier.');
    expect(movementCopy({ ...plan, end_delta_days: 0 })).toBe('Activity dates remain in place.');
  });

  it('explains how window changes affect the schedule formation', () => {
    expect(windowCopy(plan)).toContain('shifts');
    expect(windowCopy({ ...plan, window_change: 'expand' })).toContain('unused');
    expect(windowCopy({ ...plan, window_change: 'compress' })).toContain('without shortening');
  });
});
