export function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export const startOfToday = () => startOfDay(new Date());
export const startOfTomorrow = () => addDays(startOfToday(), 1);

/** Local calendar-day key (YYYY-MM-DD) used to bucket entries by the user's day, not UTC. */
export function dayKey(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const formatTime = (value) => timeFormatter.format(new Date(value));
export const formatDay = (value) => dayFormatter.format(new Date(value));
