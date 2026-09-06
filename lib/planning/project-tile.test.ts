import { describe, expect, it } from 'vitest';
import { projectTimelineState } from './project-tile';

describe('projectTimelineState', () => {
  it('positions today proportionally inside the project window', () => {
    expect(projectTimelineState('2026-09-01', '2026-09-11', '2026-09-06')).toEqual({ elapsedPercent: 50, todayPercent: 50 });
  });

  it('shows future and past windows without today markers', () => {
    expect(projectTimelineState('2026-09-10', '2026-09-20', '2026-09-05')).toEqual({ elapsedPercent: 0, todayPercent: null });
    expect(projectTimelineState('2026-08-01', '2026-08-20', '2026-09-05')).toEqual({ elapsedPercent: 100, todayPercent: null });
  });

  it('centers today for a one-day project', () => {
    expect(projectTimelineState('2026-09-05', '2026-09-05', '2026-09-05')).toEqual({ elapsedPercent: 50, todayPercent: 50 });
  });
});
