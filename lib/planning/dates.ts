export const date = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  );

export const isoDate = (value: Date) => {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const addDays = (value: string, days: number) => {
  const next = new Date(`${value}T12:00:00`);
  next.setDate(next.getDate() + days);
  return isoDate(next);
};

export const dayDifference = (earlier: string, later: string) =>
  Math.round(
    (new Date(`${later}T12:00:00`).getTime() - new Date(`${earlier}T12:00:00`).getTime()) /
      86400000,
  );
