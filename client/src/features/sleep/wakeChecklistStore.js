import { dayKey } from '../../utils/date.js';

export const WAKE_CHECKLIST_ITEMS = [
  { id: 'water', label: 'Drank 500 ml water', hint: 'Rehydrates after ~8 hours without fluids.' },
  { id: 'daylight', label: 'Morning daylight (10 min)', hint: 'Outdoor light anchors your body clock for tonight’s sleep.' },
];

const storageKey = (userId, date) => `trackfit.wake.${userId}.${dayKey(date)}`;
const listeners = new Set();

export function subscribeWakeChecklist(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadWakeChecklist(userId, date = new Date()) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId, date))) ?? {};
  } catch {
    return {};
  }
}

export function saveWakeChecklist(userId, checked, date = new Date()) {
  try {
    localStorage.setItem(storageKey(userId, date), JSON.stringify(checked));
  } catch {
    // Storage can be full or disabled; the checklist still works for this session.
  }
  listeners.forEach((listener) => listener(userId, checked));
}
