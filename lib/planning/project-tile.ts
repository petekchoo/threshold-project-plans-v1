import { dayDifference } from './dates';

export function projectTimelineState(start: string, end: string, today: string) {
  if (today < start) return { elapsedPercent: 0, todayPercent: null };
  if (today > end) return { elapsedPercent: 100, todayPercent: null };
  const duration = dayDifference(start, end);
  const todayPercent = duration === 0 ? 50 : Math.max(0, Math.min(100, dayDifference(start, today) / duration * 100));
  return { elapsedPercent: todayPercent, todayPercent };
}
