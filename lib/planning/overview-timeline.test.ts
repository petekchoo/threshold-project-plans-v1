import { describe, expect, it } from 'vitest';
import { overviewTimeline } from './overview-timeline';
import type { Project } from './types';

const project = (start_date: string, end_date: string) => ({
  id: 'project-1',
  name: 'Test project',
  description: '',
  project_type_id: 'type-1',
  status: 'active',
  start_date,
  end_date,
  archived_at: null,
} as Project);

describe('overviewTimeline today marker', () => {
  it('positions today inside an All Events range', () => {
    const scale = overviewTimeline('All Events', '2026-09-05', [project('2026-01-01', '2026-12-31')]);

    expect(scale.todayPosition).not.toBeNull();
    expect(scale.todayPosition).toBeGreaterThan(0);
    expect(scale.todayPosition).toBeLessThan(100);
  });

  it('omits today when it falls outside an All Events range', () => {
    const scale = overviewTimeline('All Events', '2026-09-05', [project('2025-01-01', '2025-03-31')]);

    expect(scale.todayPosition).toBeNull();
  });

  it('keeps today at the start of forward-looking ranges', () => {
    expect(overviewTimeline('Month', '2026-09-05', []).todayPosition).toBe(0);
  });
});
