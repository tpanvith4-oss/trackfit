import { enqueueRequest, isRetryableError } from '../services/syncQueue.js';
import { createId } from '../utils/id.js';
import { API_BASE_URL, apiClient } from './apiClient.js';

/** Where iOS Shortcuts (or any external sync) POST daily totals. */
export const HEALTH_SYNC_URL = `${API_BASE_URL}/api/sync/health`;

const MANUAL_ENDPOINT = '/api/activity/manual';

export const activityApi = {
  list: ({ startDate, endDate } = {}, options) =>
    apiClient.get('/api/activity', { ...options, query: { startDate, endDate } }).then((res) => res.data),

  /**
   * Logs a workout, or queues it when the backend can't be reached so it syncs later.
   * The date and idempotency key are fixed now, so a replay lands on the right day exactly once.
   * @returns {Promise<{ queued: false, entry: object } | { queued: true, item: object }>}
   */
  async logManual(entry) {
    const payload = { date: new Date().toISOString(), clientId: createId(), ...entry };
    if (navigator.onLine === false) return { queued: true, item: await enqueueRequest(MANUAL_ENDPOINT, 'POST', payload) };
    try {
      const { data } = await apiClient.post(MANUAL_ENDPOINT, payload);
      return { queued: false, entry: data };
    } catch (error) {
      if (!isRetryableError(error)) throw error;
      return { queued: true, item: await enqueueRequest(MANUAL_ENDPOINT, 'POST', payload) };
    }
  },

  remove: (id) => apiClient.delete(`/api/activity/${encodeURIComponent(id)}`),
  /** Mints a long-lived token that can only post to the sync URL. Needs a live response, so it is never queued. */
  createSyncToken: () => apiClient.post('/api/sync/token').then((res) => res.data),
};
