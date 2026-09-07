import { describe, expect, it } from 'vitest';
import { resolveTemplateSchedule, type TemplateScheduleActivity } from './project-template';
import type { TemplateScheduleRule } from './types';

const rule = (schedule_rule: TemplateScheduleRule, offset_days: number, relative_activity_id?: string) =>
  ({ schedule_rule, offset_days, relative_activity_id });
const activity = (id: string, duration_days: number, rules: TemplateScheduleActivity['rules']): TemplateScheduleActivity =>
  ({ id, name: id, duration_days, rules });

describe('resolveTemplateSchedule', () => {
  it('uses one as the same-day duration and permits a zero project-end offset', () => {
    const result = resolveTemplateSchedule([activity('service', 1, [rule('finish_before_project_end', 0)])], '2026-09-10');
    expect(result.activities[0]).toMatchObject({ start_date: '2026-09-10', due_date: '2026-09-10' });
  });

  it('uses inclusive duration for a finish-based project anchor', () => {
    const result = resolveTemplateSchedule([activity('permits', 3, [rule('finish_before_project_end', 7)])], '2026-09-10');
    expect(result.activities[0]).toMatchObject({ start_date: '2026-09-01', due_date: '2026-09-03' });
  });

  it('selects the latest schedule satisfying multiple rules regardless of input order', () => {
    const result = resolveTemplateSchedule([
      activity('training', 2, [rule('finish_before_project_end', 4), rule('start_after_activity_finish', 0, 'menu')]),
      activity('menu', 3, []),
    ], '2026-09-10');
    expect(result.activities[0]).toMatchObject({ start_date: '2026-09-05', due_date: '2026-09-06' });
    expect(result.activities[1]).toMatchObject({ start_date: '2026-09-03', due_date: '2026-09-05' });
    expect(result.project_start_date).toBe('2026-09-03');
  });

  it('propagates a downstream project bound backward to its prerequisite', () => {
    const result = resolveTemplateSchedule([
      activity('source', 2, [rule('finish_before_project_end', 0)]),
      activity('dependent', 2, [rule('finish_before_project_end', 1), rule('finish_after_activity_finish', 2, 'source')]),
    ], '2026-09-10');
    expect(result.activities[0].due_date).toBe('2026-09-07');
    expect(result.activities[1].due_date).toBe('2026-09-09');
  });

  it('derives a dependent branch after its shared prerequisite resolves from an anchored chain', () => {
    const result = resolveTemplateSchedule([
      activity('A', 2, [rule('finish_before_project_end', 4), rule('start_after_activity_finish', 0, 'B')]),
      activity('B', 2, [rule('start_after_activity_finish', 0, 'C')]),
      activity('C', 2, []),
      activity('D', 3, [rule('start_after_activity_finish', 0, 'C')]),
    ], '2026-09-20');
    expect(result.activities.map(({ id, start_date, due_date }) => ({ id, start_date, due_date }))).toEqual([
      { id: 'A', start_date: '2026-09-15', due_date: '2026-09-16' },
      { id: 'B', start_date: '2026-09-14', due_date: '2026-09-15' },
      { id: 'C', start_date: '2026-09-13', due_date: '2026-09-14' },
      { id: 'D', start_date: '2026-09-14', due_date: '2026-09-16' },
    ]);
  });

  it('keeps project start at project end for entirely post-project work', () => {
    const result = resolveTemplateSchedule([activity('follow-up', 1, [rule('finish_after_project_end', 2)])], '2026-09-10');
    expect(result.project_start_date).toBe('2026-09-10');
  });

  it('rejects non-positive durations, unbounded graphs, cycles, and contradictory bounds', () => {
    expect(() => resolveTemplateSchedule([activity('zero', 0, [rule('finish_before_project_end', 0)])], '2026-09-10')).toThrow('at least one day');
    expect(() => resolveTemplateSchedule([activity('disconnected', 1, [])], '2026-09-10')).toThrow('does not trace');
    expect(() => resolveTemplateSchedule([activity('unbounded', 1, [rule('start_after_activity_finish', 0, 'anchor')]), activity('anchor', 1, [rule('start_after_activity_finish', 0, 'unbounded')])], '2026-09-10')).toThrow('cycle');
    expect(() => resolveTemplateSchedule([activity('after', 1, [rule('finish_after_project_end', 2), rule('finish_before_project_end', 0)])], '2026-09-10')).toThrow('cannot coexist');
  });
});
