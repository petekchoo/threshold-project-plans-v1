import { describe, expect, it } from 'vitest';
import { evaluateActivitySchedule, placeDatedActivity } from './activity-schedule';
import type { Activity, Project } from './types';

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

const project: Project = { id: 'p1', name: 'Autumn Event', description: '', status: 'draft', start_date: '2026-09-01', end_date: '2026-09-20' };
const activity = (id: string, start_date: string, due_date: string, dependencies: Activity['activity_dependencies'] = []): Activity => ({
  id, name: id, project_id: 'p1', status: 'not_started', priority: 'normal', notes: '', start_date, due_date,
  activity_dependencies: dependencies,
});

describe('evaluateActivitySchedule', () => {
  it('evaluates unsaved dates and leaves a valid prerequisite rule unchanged', () => {
    const result = evaluateActivitySchedule({ activityName: 'Current', startDate: '2026-09-10', dueDate: '2026-09-12', project,
      timingRule: null, timingOffsetDays: null, dependencies: [{ depends_on_activity_id: 'source', constraint_type: 'finish_to_start' }],
      activities: [activity('source', '2026-09-01', '2026-09-08')] });
    expect(result).toMatchObject({ status: 'valid', placement: { start_date: '2026-09-10', due_date: '2026-09-12' } });
  });

  it('moves only the current activity when its prerequisite requires a later start', () => {
    const result = evaluateActivitySchedule({ activityName: 'Current', startDate: '2026-09-10', dueDate: '2026-09-12', project,
      timingRule: null, timingOffsetDays: null, dependencies: [{ depends_on_activity_id: 'source', constraint_type: 'finish_to_start' }],
      activities: [activity('source', '2026-09-01', '2026-09-15')] });
    expect(result).toMatchObject({ status: 'adjusted', placement: { start_date: '2026-09-15', due_date: '2026-09-17', shift_days: 5 } });
  });

  it('applies a whole-day offset after the referenced activity finishes', () => {
    const result = evaluateActivitySchedule({ activityName: 'Current', startDate: '2026-09-10', dueDate: '2026-09-12', project,
      timingRule: null, timingOffsetDays: null, dependencies: [{ depends_on_activity_id: 'source', constraint_type: 'finish_to_start', offset_days: 3 }],
      activities: [activity('source', '2026-09-01', '2026-09-09')] });
    expect(result).toMatchObject({ status: 'adjusted', placement: { start_date: '2026-09-12', due_date: '2026-09-14', shift_days: 2 } });
  });

  it('treats an incoming dependent as a fixed upper boundary', () => {
    const dependent = activity('dependent', '2026-09-14', '2026-09-16', [
      { depends_on_activity_id: 'current', constraint_type: 'finish_to_start' },
    ]);
    const result = evaluateActivitySchedule({ activityId: 'current', activityName: 'Current', startDate: '2026-09-10', dueDate: '2026-09-12', project,
      timingRule: null, timingOffsetDays: null, dependencies: [{ depends_on_activity_id: 'source', constraint_type: 'finish_to_start' }],
      activities: [activity('source', '2026-09-01', '2026-09-15'), dependent] });
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') expect(result.message).toContain('dependent is fixed at Sep 14');
  });

  it('subtracts an incoming dependency offset from the fixed upper boundary', () => {
    const dependent = activity('dependent', '2026-09-15', '2026-09-17', [
      { depends_on_activity_id: 'current', constraint_type: 'finish_to_start', offset_days: 2 },
    ]);
    const result = evaluateActivitySchedule({ activityId: 'current', activityName: 'Current', startDate: '2026-09-10', dueDate: '2026-09-14', project,
      timingRule: null, timingOffsetDays: null, dependencies: [], activities: [dependent] });
    expect(result).toMatchObject({ status: 'adjusted', placement: { start_date: '2026-09-09', due_date: '2026-09-13', shift_days: -1 } });
  });

  it('combines a prerequisite with an advance project deadline', () => {
    const result = evaluateActivitySchedule({ activityName: 'Current', startDate: '2026-09-10', dueDate: '2026-09-12', project,
      timingRule: 'advance_deadline', timingOffsetDays: 5,
      dependencies: [{ depends_on_activity_id: 'source', constraint_type: 'finish_to_finish' }],
      activities: [activity('source', '2026-09-01', '2026-09-16')] });
    expect(result.status).toBe('conflict');
  });

  it('places post-project work inside the inclusive window', () => {
    const result = evaluateActivitySchedule({ activityName: 'Current', startDate: '2026-09-18', dueDate: '2026-09-20', project,
      timingRule: 'post_project_deadline', timingOffsetDays: 4, dependencies: [], activities: [] });
    expect(result).toMatchObject({ status: 'adjusted', placement: { start_date: '2026-09-19', due_date: '2026-09-21', shift_days: 1 } });
  });

  it('blocks a staged rule that would create a transitive cycle', () => {
    const middle = activity('middle', '2026-09-08', '2026-09-09', [{ depends_on_activity_id: 'current', constraint_type: 'finish_to_start' }]);
    const source = activity('source', '2026-09-10', '2026-09-11', [{ depends_on_activity_id: 'middle', constraint_type: 'finish_to_start' }]);
    const result = evaluateActivitySchedule({ activityId: 'current', activityName: 'Current', startDate: '2026-09-01', dueDate: '2026-09-02', project,
      timingRule: null, timingOffsetDays: null, dependencies: [{ depends_on_activity_id: 'source', constraint_type: 'finish_to_start' }], activities: [middle, source] });
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') expect(result.message).toContain('circular schedule');
  });
});
