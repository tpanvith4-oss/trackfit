import { apiClient } from './apiClient.js';

export const weightApi = {
  list: ({ from, to, limit } = {}, options) =>
    apiClient.get('/api/weight', { ...options, query: { from, to, limit } }).then((res) => res.data),
  create: (entry) => apiClient.post('/api/weight', entry).then((res) => res.data),
  remove: (id) => apiClient.delete(`/api/weight/${encodeURIComponent(id)}`),
};
