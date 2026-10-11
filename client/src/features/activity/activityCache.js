import { storage } from '../../services/storageService.js';

const cacheKey = (userId) => `trackfit.activity.${userId}`;

const toAmount = (value) => (Number.isFinite(value) && value >= 0 ? value : 0);

/**
 * Today's totals as last loaded from the API, or null when nothing usable is cached for `todayKey`.
 * Totals from an earlier day are never returned, since the card shows today.
 */
export async function loadActivityCache(userId, todayKey) {
  const cached = await storage.get(cacheKey(userId));
  if (!cached || typeof cached !== 'object' || cached.dayKey !== todayKey) return null;
  const lastSyncTimestamp = typeof cached.lastSyncTimestamp === 'string' ? cached.lastSyncTimestamp : null;
  return {
    summary: {
      steps: toAmount(cached.steps),
      activeCalories: toAmount(cached.activeCalories),
      distanceKm: toAmount(cached.distanceKm),
      lastSync: lastSyncTimestamp && { source: cached.lastSyncSource, at: lastSyncTimestamp },
    },
    hasEverSynced: Boolean(cached.hasEverSynced),
  };
}

export function saveActivityCache(userId, todayKey, { summary, hasEverSynced }) {
  return storage.set(cacheKey(userId), {
    dayKey: todayKey,
    steps: summary.steps,
    activeCalories: summary.activeCalories,
    distanceKm: summary.distanceKm,
    lastSyncTimestamp: summary.lastSync?.at ?? null,
    lastSyncSource: summary.lastSync?.source ?? null,
    hasEverSynced,
  });
}
