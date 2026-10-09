export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const formatTime = (value) => timeFormatter.format(new Date(value));
export const formatDay = (value) => dayFormatter.format(new Date(value));

export function inferMealType(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 16) return 'LUNCH';
  if (hour < 21) return 'DINNER';
  return 'SNACK';
}
