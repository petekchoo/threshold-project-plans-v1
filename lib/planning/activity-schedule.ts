import { addDays, dayDifference } from './dates';

export type ActivityScheduleBounds = {
  earliest_start_date?: string | null;
  earliest_due_date?: string | null;
  latest_due_date?: string | null;
};

export type ActivitySchedulePlacement = {
  start_date: string;
  due_date: string;
  shift_days: number;
};

/** Places a dated activity as close as possible to its current dates while preserving duration. */
export function placeDatedActivity(
  startDate: string,
  dueDate: string,
  bounds: ActivityScheduleBounds,
): ActivitySchedulePlacement {
  if (dueDate < startDate) throw new Error('The activity due date must be on or after its start date.');

  const minimumShift = Math.max(
    bounds.earliest_start_date ? dayDifference(startDate, bounds.earliest_start_date) : -Infinity,
    bounds.earliest_due_date ? dayDifference(dueDate, bounds.earliest_due_date) : -Infinity,
  );
  const maximumShift = bounds.latest_due_date
    ? dayDifference(dueDate, bounds.latest_due_date)
    : Infinity;

  if (minimumShift > maximumShift) throw new Error('The schedule rules do not have a valid shared placement.');

  const shiftDays = minimumShift > 0 ? minimumShift : maximumShift < 0 ? maximumShift : 0;
  return {
    start_date: addDays(startDate, shiftDays),
    due_date: addDays(dueDate, shiftDays),
    shift_days: shiftDays,
  };
}
