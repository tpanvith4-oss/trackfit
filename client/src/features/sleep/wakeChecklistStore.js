import { storage } from '../../services/storageService.js';
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

/** @returns {Promise<Record<string, boolean>>} */
export async function loadWakeChecklist(userId, date = new Date()) {
  const checked = await storage.get(storageKey(userId, date));
  return checked && typeof checked === 'object' ? checked : {};
}

export function saveWakeChecklist(userId, checked, date = new Date()) {
  listeners.forEach((listener) => listener(userId, checked));
  return storage.set(storageKey(userId, date), checked);
}
