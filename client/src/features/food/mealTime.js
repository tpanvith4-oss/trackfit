/**
 * Maps the local time of day to a meal type value accepted by the API:
 * 05:00–10:59 Breakfast, 11:00–15:59 Lunch, 16:00–18:59 Snack, 19:00–04:59 Dinner.
 */
export function getMealTypeByCurrentTime(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'BREAKFAST';
  if (hour >= 11 && hour < 16) return 'LUNCH';
  if (hour >= 16 && hour < 19) return 'SNACK';
  return 'DINNER';
}
