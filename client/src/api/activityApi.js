import { API_BASE_URL, apiClient } from './apiClient.js';

/** Where iOS Shortcuts (or any external sync) POST daily totals. */
export const HEALTH_SYNC_URL = `${API_BASE_URL}/api/sync/health`;

export const activityApi = {
  list: ({ startDate, endDate } = {}, options) =>
    apiClient.get('/api/activity', { ...options, query: { startDate, endDate } }).then((res) => res.data),
  logManual: (entry) => apiClient.post('/api/activity/manual', entry).then((res) => res.data),
  remove: (id) => apiClient.delete(`/api/activity/${encodeURIComponent(id)}`),
  /** Mints a long-lived token that can only post to the sync URL. */
  createSyncToken: () => apiClient.post('/api/sync/token').then((res) => res.data),
};
