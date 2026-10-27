import { apiClient } from './apiClient.js';

export const workoutsApi = {
  defaultSplit: (options) => apiClient.get('/api/workouts/default-split', options).then((res) => res.data),
  template: (splitDay, options) =>
    apiClient.get(`/api/workouts/template/${encodeURIComponent(splitDay)}`, options).then((res) => res.data),
  recovery: (options) => apiClient.get('/api/workouts/recovery', options).then((res) => res.data),
  list: (options) => apiClient.get('/api/workouts', options).then((res) => res.data),
  create: (payload) => apiClient.post('/api/workouts', payload).then((res) => res.data),
  complete: (id, payload = {}) =>
    apiClient.patch(`/api/workouts/${encodeURIComponent(id)}/complete`, payload).then((res) => res.data),
};
