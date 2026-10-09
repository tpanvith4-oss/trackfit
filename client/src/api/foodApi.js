import { apiClient } from './apiClient.js';

export const foodApi = {
  list: ({ from, to, limit } = {}, options) =>
    apiClient.get('/api/food', { ...options, query: { from, to, limit } }).then((res) => res.data),
  create: (entry) => apiClient.post('/api/food', entry).then((res) => res.data),
  remove: (id) => apiClient.delete(`/api/food/${encodeURIComponent(id)}`),
};
