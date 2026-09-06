import { describe, expect, it } from 'vitest';
import { resolveTemplateSchedule, type TemplateScheduleActivity } from './project-template';

const activity = (
  id: string,
  schedule_rule: TemplateScheduleActivity['schedule_rule'],
  offset_days: number,
  duration_days: number,
  relative_activity_id?: string,
): TemplateScheduleActivity => ({
  id,
  name: id,
  schedule_rule,
  offset_days,
  duration_days,
  relative_activity_id,
});

describe('resolveTemplateSchedule', () => {
  it('uses zero as same-day duration and project-end offset', () => {
    const result = resolveTemplateSchedule(
      [activity('service', 'finish_before_project_end', 0, 0)],
      '2026-09-10',
    );
    expect(result.activities[0]).toMatchObject({ start_date: '2026-09-10', due_date: '2026-09-10' });
    expect(result.project_start_date).toBe('2026-09-10');
  });

  it('subtracts duration from finish-based project anchors', () => {
    const result = resolveTemplateSchedule(
      [activity('permits', 'finish_before_project_end', 7, 3)],
      '2026-09-10',
    );
    expect(result.activities[0]).toMatchObject({ start_date: '2026-08-31', due_date: '2026-09-03' });
  });

  it('extends duration forward from a start-after rule regardless of input order', () => {
    const result = resolveTemplateSchedule(
      [
        activity('setup', 'start_after_activity_finish', 1, 2, 'delivery'),
        activity('delivery', 'finish_before_project_end', 4, 1),
      ],
      '2026-09-10',
    );
    expect(result.activities[0]).toMatchObject({ start_date: '2026-09-07', due_date: '2026-09-09' });
    expect(result.project_start_date).toBe('2026-09-05');
  });

  it('extends duration backward from a finish-after rule', () => {
    const result = resolveTemplateSchedule(
      [
        activity('source', 'finish_before_project_end', 5, 0),
        activity('dependent', 'finish_after_activity_finish', 2, 3, 'source'),
      ],
      '2026-09-10',
    );
    expect(result.activities[1]).toMatchObject({ start_date: '2026-09-04', due_date: '2026-09-07' });
  });

  it('keeps project start at project end for entirely post-project work', () => {
    const result = resolveTemplateSchedule(
      [activity('follow-up', 'finish_after_project_end', 2, 0)],
      '2026-09-10',
    );
    expect(result.project_start_date).toBe('2026-09-10');
  });

  it('rejects invalid offsets, missing references, and cycles', () => {
    expect(() => resolveTemplateSchedule([activity('after', 'finish_after_project_end', 0, 0)], '2026-09-10')).toThrow('at least one day');
    expect(() => resolveTemplateSchedule([activity('missing', 'start_after_activity_finish', 0, 0)], '2026-09-10')).toThrow('needs a referenced');
    expect(() => resolveTemplateSchedule([
      activity('a', 'start_after_activity_finish', 0, 0, 'b'),
      activity('b', 'finish_after_activity_finish', 0, 0, 'a'),
    ], '2026-09-10')).toThrow('cycle');
  });
});

