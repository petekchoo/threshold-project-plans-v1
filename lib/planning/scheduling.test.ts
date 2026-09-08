import { describe, expect, it } from 'vitest';
import { addDays, dayDifference } from './dates';
import { activityMovesProjectStart, projectTimingConflict, projectTimingDeadline } from './scheduling';
import type { Project } from './types';

const project = {
  id: 'project-1',
  name: 'Autumn Event',
  description: '',
  status: 'on_track',
  start_date: '2026-09-01',
  end_date: '2026-09-10',
} satisfies Project;

describe('projectTimingDeadline', () => {
  it('calculates an advance deadline before project end', () => {
    expect(projectTimingDeadline(project, 'advance_deadline', 4)).toBe('2026-09-06');
  });

  it('calculates an inclusive post-project deadline after project end', () => {
    expect(projectTimingDeadline(project, 'post_project_deadline', 4)).toBe('2026-09-14');
  });

  it('handles leap days as calendar days', () => {
    expect(projectTimingDeadline({ ...project, end_date: '2028-02-28' }, 'post_project_deadline', 2)).toBe('2028-03-01');
  });

  it('keeps calendar arithmetic stable across daylight-saving changes', () => {
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(dayDifference('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('activityMovesProjectStart', () => {
  it('moves the project boundary only when an activity begins before it', () => {
    expect(activityMovesProjectStart('2026-08-31', project)).toBe(true);
    expect(activityMovesProjectStart('2026-09-01', project)).toBe(false);
    expect(activityMovesProjectStart('2026-09-02', project)).toBe(false);
  });
});

describe('projectTimingConflict', () => {
  it('allows an advance activity to finish before its deadline', () => {
    expect(projectTimingConflict('Permits', '2026-09-05', project, 'advance_deadline', 4)).toBe('');
  });

  it('allows an advance activity to finish exactly on its deadline', () => {
    expect(projectTimingConflict('Permits', '2026-09-06', project, 'advance_deadline', 4)).toBe('');
  });

  it('rejects an advance activity one day after its deadline', () => {
    expect(projectTimingConflict('Permits', '2026-09-07', project, 'advance_deadline', 4)).toContain('1 day later');
  });

  it('rejects a post-project activity that finishes before project end', () => {
    expect(projectTimingConflict('Follow-up', '2026-09-09', project, 'post_project_deadline', 4)).toContain('1 calendar day before the project end date');
  });

  it('rejects a post-project activity that finishes on project end', () => {
    expect(projectTimingConflict('Follow-up', '2026-09-10', project, 'post_project_deadline', 4)).toContain('on the project end date');
  });

  it('allows every due date inside the post-project window', () => {
    for (const due of ['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14']) {
      expect(projectTimingConflict('Follow-up', due, project, 'post_project_deadline', 4)).toBe('');
    }
  });

  it('rejects a post-project activity one day after its inclusive deadline', () => {
    expect(projectTimingConflict('Follow-up', '2026-09-15', project, 'post_project_deadline', 4)).toContain('1 day later');
  });

  it('uses plural wording for larger differences', () => {
    expect(projectTimingConflict('Follow-up', '2026-09-08', project, 'post_project_deadline', 4)).toContain('2 calendar days before the project end date');
    expect(projectTimingConflict('Follow-up', '2026-09-16', project, 'post_project_deadline', 4)).toContain('2 days later');
  });
});
