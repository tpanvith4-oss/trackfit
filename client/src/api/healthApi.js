import { apiClient } from './apiClient.js';

// Match apiClient's default so a sleeping Render instance can finish waking (up to ~1 min).
const HEALTH_TIMEOUT_MS = 70_000;

export const healthApi = {
  check: (options) => apiClient.get('/health', { timeoutMs: HEALTH_TIMEOUT_MS, auth: false, ...options }),
};
