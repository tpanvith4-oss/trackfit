import { apiClient } from './apiClient.js';

// Allow a sleeping Render instance to finish waking (proxy can take up to ~1 min).
const HEALTH_TIMEOUT_MS = 70_000;

export const healthApi = {
  check: (options) => apiClient.get('/api/health', { timeoutMs: HEALTH_TIMEOUT_MS, auth: false, ...options }),
};
