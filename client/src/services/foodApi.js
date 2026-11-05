import { apiClient } from '../api/apiClient.js';
import { timestampForDay } from '../hooks/useSelectedDate.js';
import { dayKey } from '../utils/date.js';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/**
 * Exact UTC bounds for a local calendar day (e.g. IST midnight → 23:59:59.999).
 * YYYY-MM-DD is parsed as local components — never via `new Date('YYYY-MM-DD')` (UTC midnight).
 * @param {string|Date} [dateInput]
 * @returns {{ from: string, to: string }}
 */
export function getDateRangeForDay(dateInput) {
  let year;
  let month;
  let day;

  if (typeof dateInput === 'string' && ISO_DAY.test(dateInput)) {
    [year, month, day] = dateInput.slice(0, 10).split('-').map(Number);
  } else {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
}

const sumField = (entries, field) => entries.reduce((total, entry) => total + (Number(entry[field]) || 0), 0);

function withTotals(entries) {
  return {
    success: true,
    data: entries,
    totalCalories: sumField(entries, 'calories'),
    totalProtein: sumField(entries, 'proteinG'),
    totalCarbs: sumField(entries, 'carbsG'),
    totalFat: sumField(entries, 'fatG'),
  };
}

/** Food logs for one local day. Auth / 401 logout are handled by apiClient. */
export async function getFoodLogsByDay(dateString, limit = 200, options) {
  const { from, to } = getDateRangeForDay(dateString);
  const url = `/api/food?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${limit}`;
  const response = await apiClient.get(url, options);
  return withTotals(response.data ?? []);
}

/** Multi-day food logs (charts): startDate 00:00 local → endDate 23:59:59.999 local. */
export async function getFoodLogsRange(startDate, endDate, limit = 500, options) {
  const from = getDateRangeForDay(startDate).from;
  const to = getDateRangeForDay(endDate).to;
  const url = `/api/food?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${limit}`;
  const response = await apiClient.get(url, options);
  return withTotals(response.data ?? []);
}

/**
 * Creates a food entry. Pass `date` (YYYY-MM-DD) or `loggedAt` to keep the selected day
 * instead of defaulting to the current timestamp.
 */
export async function createFoodEntry(foodData, options) {
  const { date, loggedAt, ...rest } = foodData;
  const body = { ...rest };

  if (loggedAt) {
    body.loggedAt = loggedAt instanceof Date ? loggedAt.toISOString() : loggedAt;
  } else if (date) {
    const key = typeof date === 'string' ? date.slice(0, 10) : dayKey(date);
    body.loggedAt = timestampForDay(key).toISOString();
  }

  const response = await apiClient.post('/api/food', body, options);
  return response.data;
}
