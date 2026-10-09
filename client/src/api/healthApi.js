import { apiClient } from './apiClient.js';

export const healthApi = {
  check: (options) => apiClient.get('/health', { timeoutMs: 5_000, ...options }),
};
