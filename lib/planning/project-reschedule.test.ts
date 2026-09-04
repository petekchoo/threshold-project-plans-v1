import { describe, expect, it } from 'vitest';
import { planProjectReschedule } from './project-reschedule';
import type {
  Activity,
  Dependency,
  Project,
  ProjectRescheduleActivity,
  ProjectRescheduleDependency,
  ProjectRescheduleInput,
} from './types';

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Spring Dinner',
  description: '',
  status: 'on_track',
  start_date: '2026-04-01',
  end_date: '2026-04-10',
  ...overrides,
});

const activity = (id: string, overrides: Partial<Activity> = {}): ProjectRescheduleActivity => ({
  id,
  name: id,
  status: 'not_started',
  priority: 'normal',
  start_date: '2026-04-02',
  due_date: '2026-04-04',
  notes: '',
  project_id: 'p1',
  project_timing_rule: null,
  project_timing_boundary: null,
  project_timing_offset_days: null,
  allow_outside_project: false,
  archived_at: null,
  ...overrides,
});

const dependency = (
  id: string,
  dependent: string,
  prerequisite: string,
  constraint_type: Dependency['constraint_type'] = 'finish_to_start',
): ProjectRescheduleDependency => ({
  id,
  activity_id: dependent,
  depends_on_activity_id: prerequisite,
  constraint_type,
  archived_at: null,
});

const input = (overrides: Partial<ProjectRescheduleInput> = {}): ProjectRescheduleInput => ({
  project: project(),
  new_start_date: '2026-04-06',
  new_end_date: '2026-04-15',
  activities: [
    activity('a'),
    activity('b', { start_date: '2026-04-06', due_date: '2026-04-09' }),
  ],
  dependencies: [],
  ...overrides,
});

const codes = (value: ProjectRescheduleInput) =>
  planProjectReschedule(value).conflicts.map((conflict) => conflict.code);

describe('planProjectReschedule whole-schedule mode', () => {
  it('moves every active activity by the project-end delta without changing formation', () => {
    const plan = planProjectReschedule(input());
    expect(plan).toMatchObject({
      mode: 'move_entire_schedule',
      end_delta_days: 5,
      window_change: 'shift',
      proposed_project_start_date: '2026-04-06',
      proposed_project_end_date: '2026-04-15',
      can_confirm: true,
    });
    expect(plan.activity_changes.map(({ proposed_start_date, proposed_due_date }) => [proposed_start_date, proposed_due_date])).toEqual([
      ['2026-04-07', '2026-04-09'],
      ['2026-04-11', '2026-04-14'],
    ]);
  });

  it('moves a whole schedule earlier using calendar days', () => {
    const plan = planProjectReschedule(input({ new_start_date: '2026-03-29', new_end_date: '2026-04-07' }));
    expect(plan.end_delta_days).toBe(-3);
    expect(plan.activity_changes.map((change) => change.proposed_start_date)).toEqual(['2026-03-30', '2026-04-03']);
  });

  it('handles projects with no active activities', () => {
    const plan = planProjectReschedule(input({ activities: [] }));
    expect(plan.activity_changes).toEqual([]);
    expect(plan.available_lead_in_days).toBeNull();
    expect(plan.earliest_containing_start_date).toBeNull();
    expect(plan.can_confirm).toBe(true);
  });

  it('classifies expansion without stretching activity dates', () => {
    const plan = planProjectReschedule(input({ new_start_date: '2026-04-01' }));
    expect(plan.window_change).toBe('expand');
    expect(plan.activity_changes[0].proposed_start_date).toBe('2026-04-07');
  });

  it('allows compression that still contains the shifted formation', () => {
    const plan = planProjectReschedule(input({ new_start_date: '2026-04-07' }));
    expect(plan.window_change).toBe('compress');
    expect(plan.available_lead_in_days).toBe(0);
    expect(plan.can_confirm).toBe(true);
  });

  it('blocks compression beyond lead-in and offers the containing start', () => {
    const plan = planProjectReschedule(input({ new_start_date: '2026-04-08' }));
    expect(plan.earliest_containing_start_date).toBe('2026-04-07');
    expect(plan.available_lead_in_days).toBe(-1);
    expect(codes(input({ new_start_date: '2026-04-08' }))).toContain('ACTIVITY_BEFORE_PROJECT_START');
    expect(plan.can_confirm).toBe(false);
  });

  it('does not move activities when only project start changes', () => {
    const plan = planProjectReschedule(input({ new_start_date: '2026-04-02', new_end_date: '2026-04-10' }));
    expect(plan.end_delta_days).toBe(0);
    expect(plan.activity_changes[0]).toMatchObject({
      disposition: 'unchanged_active',
      proposed_start_date: '2026-04-02',
      proposed_due_date: '2026-04-04',
    });
    expect(plan.can_confirm).toBe(true);
  });

  it('blocks a start-only edit that excludes work and offers the exact containing start', () => {
    const plan = planProjectReschedule(input({ new_start_date: '2026-04-03', new_end_date: '2026-04-10' }));
    expect(plan.end_delta_days).toBe(0);
    expect(plan.earliest_containing_start_date).toBe('2026-04-02');
    expect(plan.conflicts.map((conflict) => conflict.code)).toContain('ACTIVITY_BEFORE_PROJECT_START');
  });

  it('classifies an unchanged schedule without moving active work', () => {
    const plan = planProjectReschedule(input({ new_start_date: '2026-04-01', new_end_date: '2026-04-10' }));
    expect(plan.window_change).toBe('unchanged');
    expect(plan.activity_changes.every((change) => change.disposition === 'unchanged_active')).toBe(true);
  });

  it('rejects an invalid project window and a malformed activity final state', () => {
    const value = input({
      new_start_date: '2026-04-12',
      new_end_date: '2026-04-11',
      activities: [activity('a', { start_date: '2026-04-05', due_date: '2026-04-04' })],
    });
    expect(codes(value)).toEqual(expect.arrayContaining(['PROJECT_DATE_ORDER', 'ACTIVITY_DATE_ORDER']));
  });

  it('leaves archived activities fixed and excludes them from mode and containment', () => {
    const archived = activity('archived', {
      status: 'completed',
      start_date: '2026-03-01',
      due_date: '2026-05-01',
      archived_at: '2026-04-01T00:00:00Z',
      allow_outside_project: true,
    });
    const plan = planProjectReschedule(input({ activities: [archived, activity('a')] }));
    expect(plan.mode).toBe('move_entire_schedule');
    expect(plan.activity_changes[0]).toMatchObject({ disposition: 'moved', activity_id: 'a' });
    expect(plan.activity_changes[1]).toMatchObject({
      disposition: 'unchanged_archived',
      proposed_due_date: '2026-05-01',
    });
    expect(plan.conflicts).toEqual([]);
  });
});

describe('planProjectReschedule remaining-work mode', () => {
  const completed = activity('completed', {
    status: 'completed',
    start_date: '2026-04-02',
    due_date: '2026-04-03',
  });
  const incomplete = activity('incomplete', {
    start_date: '2026-04-06',
    due_date: '2026-04-08',
  });

  it('fixes completed dates, shifts incomplete dates, and preserves project start', () => {
    const plan = planProjectReschedule(input({
      new_start_date: '2026-04-01',
      activities: [completed, incomplete],
    }));
    expect(plan.mode).toBe('reschedule_remaining_work');
    expect(plan.proposed_project_start_date).toBe('2026-04-01');
    expect(plan.activity_changes).toEqual([
      expect.objectContaining({ activity_id: 'completed', disposition: 'preserved_completed', proposed_due_date: '2026-04-03' }),
      expect.objectContaining({ activity_id: 'incomplete', disposition: 'moved', proposed_due_date: '2026-04-13' }),
    ]);
  });

  it('rejects a requested project-start change but still returns the complete proposal', () => {
    const plan = planProjectReschedule(input({ activities: [completed, incomplete] }));
    expect(plan.proposed_project_start_date).toBe('2026-04-01');
    expect(plan.activity_changes).toHaveLength(2);
    expect(plan.conflicts[0].code).toBe('PROJECT_START_CHANGE_WITH_COMPLETED_WORK');
  });

  it('validates date order against the preserved effective start', () => {
    const plan = planProjectReschedule(input({
      new_start_date: '2026-03-01',
      new_end_date: '2026-03-15',
      activities: [completed, incomplete],
    }));
    expect(plan.proposed_project_start_date).toBe('2026-04-01');
    expect(plan.conflicts.map((conflict) => conflict.code)).toContain('PROJECT_DATE_ORDER');
  });

  it('blocks work shifted before the fixed start without offering a prohibited start change', () => {
    const plan = planProjectReschedule(input({
      new_start_date: '2026-04-01',
      new_end_date: '2026-04-03',
      activities: [completed, incomplete],
    }));
    expect(plan.conflicts.map((conflict) => conflict.code)).toContain('ACTIVITY_BEFORE_PROJECT_START');
    expect(plan.earliest_containing_start_date).toBeNull();
  });

  it('blocks a completed project until a separate reopen', () => {
    expect(codes(input({ project: project({ status: 'completed' }) }))).toContain('PROJECT_COMPLETED');
  });

  it('uses whole-schedule mode after completed work is separately reopened', () => {
    const plan = planProjectReschedule(input({ activities: [{ ...completed, status: 'in_progress' }, incomplete] }));
    expect(plan.mode).toBe('move_entire_schedule');
    expect(plan.activity_changes.every((change) => change.disposition === 'moved')).toBe(true);
  });
});

describe('planProjectReschedule dependency validation', () => {
  it.each([
    ['finish_to_start', '2026-04-04', '2026-04-04'],
    ['finish_to_finish', '2026-04-02', '2026-04-04'],
  ] as const)('allows equality at the %s boundary', (constraintType, dependentStart, dependentDue) => {
    const prerequisite = activity('prerequisite');
    const dependent = activity('dependent', { start_date: dependentStart, due_date: dependentDue });
    const value = input({
      new_start_date: '2026-04-01',
      new_end_date: '2026-04-10',
      activities: [prerequisite, dependent],
      dependencies: [dependency('edge', 'dependent', 'prerequisite', constraintType)],
    });
    expect(planProjectReschedule(value).can_confirm).toBe(true);
  });

  it.each([
    ['finish_to_start', 'FINISH_TO_START_VIOLATION'],
    ['finish_to_finish', 'FINISH_TO_FINISH_VIOLATION'],
  ] as const)('keeps a completed prerequisite due date as the %s boundary', (constraintType, code) => {
    const prerequisite = activity('prerequisite', { status: 'completed', due_date: '2026-04-08' });
    const dependent = activity('dependent', { start_date: '2026-04-06', due_date: '2026-04-07' });
    const value = input({
      new_start_date: '2026-04-01',
      new_end_date: '2026-04-09',
      activities: [prerequisite, dependent],
      dependencies: [dependency('edge', 'dependent', 'prerequisite', constraintType)],
    });
    expect(codes(value)).toContain(code);
  });

  it('blocks a completed dependent whose prerequisite remains incomplete even when dates align', () => {
    const prerequisite = activity('prerequisite', { due_date: '2026-04-03' });
    const dependent = activity('dependent', {
      status: 'completed',
      start_date: '2026-04-03',
      due_date: '2026-04-04',
    });
    const value = input({
      new_start_date: '2026-04-01',
      activities: [prerequisite, dependent],
      dependencies: [dependency('edge', 'dependent', 'prerequisite')],
    });
    expect(codes(value)).toContain('COMPLETED_DEPENDENT_INCOMPLETE_PREREQUISITE');
  });

  it('detects incoming and outgoing cross-project conflicts without moving external work', () => {
    const target = activity('target', { start_date: '2026-04-06', due_date: '2026-04-08' });
    const incoming = activity('incoming', {
      project_id: 'p2',
      start_date: '2026-04-01',
      due_date: '2026-04-12',
    });
    const outgoing = activity('outgoing', {
      project_id: 'p2',
      start_date: '2026-04-12',
      due_date: '2026-04-12',
    });
    const value = input({
      new_start_date: '2026-04-06',
      activities: [target, incoming, outgoing],
      dependencies: [
        dependency('incoming-edge', 'target', 'incoming'),
        dependency('outgoing-edge', 'outgoing', 'target'),
      ],
    });
    const plan = planProjectReschedule(value);
    expect(plan.conflicts.map((conflict) => conflict.code)).toEqual([
      'FINISH_TO_START_VIOLATION',
      'FINISH_TO_START_VIOLATION',
    ]);
    expect(plan.activity_changes).toHaveLength(1);
    expect(plan.conflicts.map((conflict) => conflict.dependency_scope)).toEqual(['incoming', 'outgoing']);
    expect(plan.conflicts[0]).toMatchObject({
      dependent_activity_name: 'target',
      dependent_project_id: 'p1',
      prerequisite_activity_name: 'incoming',
      prerequisite_project_id: 'p2',
    });
  });

  it('ignores archived relationships and endpoints', () => {
    const target = activity('target');
    const archived = activity('archived', {
      project_id: 'p2',
      due_date: '2026-05-01',
      archived_at: '2026-04-01T00:00:00Z',
    });
    const edge = { ...dependency('edge', 'target', 'archived'), archived_at: '2026-04-02T00:00:00Z' };
    expect(planProjectReschedule(input({ activities: [target, archived], dependencies: [edge] })).can_confirm).toBe(true);
  });

  it('blocks an active relationship with a missing endpoint', () => {
    expect(codes(input({ dependencies: [dependency('edge', 'missing', 'a')] }))).toContain('DEPENDENCY_ENDPOINT_MISSING');
  });
});

describe('planProjectReschedule timing and exception validation', () => {
  const timed = (id: string, overrides: Partial<Activity>): ProjectRescheduleActivity => activity(id, {
    project_timing_boundary: 'end',
    ...overrides,
  });

  it('preserves valid advance and post-project timing rules during a whole shift', () => {
    const advance = timed('advance', {
      start_date: '2026-04-05', due_date: '2026-04-07',
      project_timing_rule: 'advance_deadline', project_timing_offset_days: 3,
    });
    const post = timed('post', {
      start_date: '2026-04-09', due_date: '2026-04-12', allow_outside_project: true,
      project_timing_rule: 'post_project_deadline', project_timing_offset_days: 4,
    });
    expect(planProjectReschedule(input({ activities: [advance, post] })).can_confirm).toBe(true);
  });

  it('blocks fixed completed advance and post-project timing violations', () => {
    const advance = timed('advance', {
      status: 'completed', due_date: '2026-04-07',
      project_timing_rule: 'advance_deadline', project_timing_offset_days: 3,
    });
    const post = timed('post', {
      status: 'completed', start_date: '2026-04-09', due_date: '2026-04-12', allow_outside_project: true,
      project_timing_rule: 'post_project_deadline', project_timing_offset_days: 4,
    });
    const value = input({
      new_start_date: '2026-04-01',
      new_end_date: '2026-04-07',
      activities: [advance, post],
    });
    expect(codes(value)).toEqual(expect.arrayContaining([
      'ADVANCE_DEADLINE_VIOLATION',
      'POST_PROJECT_WINDOW_VIOLATION',
    ]));
  });

  it('validates the exact exception truth table', () => {
    const outside = activity('outside', { due_date: '2026-04-12' });
    const stale = activity('stale', { allow_outside_project: true });
    const value = input({
      new_start_date: '2026-04-01', new_end_date: '2026-04-10', activities: [outside, stale],
    });
    expect(codes(value)).toEqual(expect.arrayContaining([
      'OUTSIDE_PROJECT_UNAPPROVED',
      'OUTSIDE_PROJECT_EXCEPTION_STALE',
    ]));
  });

  it('blocks a fixed completed exception that becomes stale when project end moves later', () => {
    const fixed = activity('fixed', {
      status: 'completed',
      due_date: '2026-04-12',
      allow_outside_project: true,
    });
    const value = input({
      new_start_date: '2026-04-01', new_end_date: '2026-04-15', activities: [fixed],
    });
    expect(codes(value)).toContain('OUTSIDE_PROJECT_EXCEPTION_STALE');
  });

  it('allows inclusive timing boundaries and blocks dates immediately outside them', () => {
    const rows = [
      timed('advance-ok', { due_date: '2026-04-07', project_timing_rule: 'advance_deadline', project_timing_offset_days: 3 }),
      timed('advance-bad', { due_date: '2026-04-08', project_timing_rule: 'advance_deadline', project_timing_offset_days: 3 }),
      timed('post-ok-first', { due_date: '2026-04-11', allow_outside_project: true, project_timing_rule: 'post_project_deadline', project_timing_offset_days: 4 }),
      timed('post-ok-last', { due_date: '2026-04-14', allow_outside_project: true, project_timing_rule: 'post_project_deadline', project_timing_offset_days: 4 }),
      timed('post-bad-late', { due_date: '2026-04-15', allow_outside_project: true, project_timing_rule: 'post_project_deadline', project_timing_offset_days: 4 }),
    ];
    const value = input({ new_start_date: '2026-04-01', new_end_date: '2026-04-10', activities: rows });
    expect(codes(value).filter((code) => code === 'ADVANCE_DEADLINE_VIOLATION')).toHaveLength(1);
    expect(codes(value).filter((code) => code === 'POST_PROJECT_WINDOW_VIOLATION')).toHaveLength(1);
  });

  it('blocks malformed timing configurations', () => {
    const rows = [
      timed('post-zero', { project_timing_rule: 'post_project_deadline', project_timing_offset_days: 0 }),
      timed('advance-negative', { project_timing_rule: 'advance_deadline', project_timing_offset_days: -1 }),
      activity('orphan-offset', { project_timing_offset_days: 2 }),
    ];
    const value = input({ new_start_date: '2026-04-01', new_end_date: '2026-04-10', activities: rows });
    expect(codes(value).filter((code) => code === 'TIMING_RULE_INVALID')).toHaveLength(3);
  });
});

describe('planProjectReschedule calendar and purity guarantees', () => {
  it('returns structured conflicts for invalid calendar dates instead of throwing', () => {
    const plan = planProjectReschedule(input({ new_end_date: '2026-02-30' }));
    expect(plan.can_confirm).toBe(false);
    expect(plan.conflicts).toEqual([
      expect.objectContaining({ code: 'DATE_INVALID', dates: { requested_project_end: '2026-02-30' } }),
    ]);
  });

  it('uses exact calendar-day movement over leap day and daylight-saving boundaries', () => {
    const leap = input({
      project: project({ start_date: '2028-02-20', end_date: '2028-02-28' }),
      new_start_date: '2028-02-22',
      new_end_date: '2028-03-01',
      activities: [activity('leap', { start_date: '2028-02-27', due_date: '2028-02-28' })],
    });
    expect(planProjectReschedule(leap).activity_changes[0].proposed_due_date).toBe('2028-03-01');

    const dst = input({
      project: project({ start_date: '2026-10-25', end_date: '2026-10-31' }),
      new_start_date: '2026-10-27',
      new_end_date: '2026-11-02',
      activities: [activity('dst', { start_date: '2026-10-30', due_date: '2026-10-31' })],
    });
    expect(planProjectReschedule(dst).activity_changes[0].proposed_due_date).toBe('2026-11-02');
  });

  it('does not mutate its input and returns deterministic results', () => {
    const value = input();
    const snapshot = structuredClone(value);
    const first = planProjectReschedule(value);
    expect(value).toEqual(snapshot);
    expect(planProjectReschedule(value)).toEqual(first);
  });
});
