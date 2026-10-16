import { useCallback, useState } from 'react';
import { addDays, dayKey } from '../utils/date.js';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const labelFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** Local-time Date at midnight for a YYYY-MM-DD key (`new Date(key)` would be UTC midnight). */
export function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const todayKey = () => dayKey(new Date());
export const shiftDayKey = (key, days) => dayKey(addDays(dateFromKey(key), days));
export const isValidDayKey = (value) => typeof value === 'string' && ISO_DAY.test(value);

/** "Today", "Yesterday", or e.g. "Wed, Oct 14". */
export function getDayLabel(key) {
  const today = todayKey();
  if (key >= today) return 'Today';
  if (key === shiftDayKey(today, -1)) return 'Yesterday';
  return labelFormatter.format(dateFromKey(key));
}

/**
 * Timestamp for an entry logged on `key`: now for today, otherwise the current wall-clock time on
 * that day, so backdated entries keep a realistic time and sort naturally within the day.
 */
export function timestampForDay(key) {
  const now = new Date();
  if (key === dayKey(now)) return now;
  const date = dateFromKey(key);
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return date;
}

const clampToToday = (key) => {
  const today = todayKey();
  return key > today ? today : key;
};

export function useSelectedDate(initialDate) {
  const [selectedDate, setSelectedDate] = useState(() => (isValidDayKey(initialDate) ? clampToToday(initialDate) : todayKey()));

  const setDate = useCallback((value) => {
    if (isValidDayKey(value)) setSelectedDate(clampToToday(value));
  }, []);
  const goToPreviousDay = useCallback(() => setSelectedDate((key) => shiftDayKey(key, -1)), []);
  const goToNextDay = useCallback(() => setSelectedDate((key) => clampToToday(shiftDayKey(key, 1))), []);

  return {
    selectedDate,
    setDate,
    goToPreviousDay,
    goToNextDay,
    isToday: selectedDate >= todayKey(),
    displayLabel: getDayLabel(selectedDate),
  };
}
