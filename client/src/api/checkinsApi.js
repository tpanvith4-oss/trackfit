import { apiClient } from './apiClient.js';

export const checkinsApi = {
  get: (date, options) =>
    apiClient.get('/api/checkins', { ...options, query: { date } }).then((res) => res.data),
  update: (patch) => apiClient.patch('/api/checkins', patch).then((res) => res.data),
  energy: (query, options) =>
    apiClient.get('/api/checkins/energy', { ...options, query }).then((res) => res.data),
};
