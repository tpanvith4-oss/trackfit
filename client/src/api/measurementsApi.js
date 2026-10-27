import { apiClient } from './apiClient.js';

export const measurementsApi = {
  list: (options) => apiClient.get('/api/measurements', options).then((res) => res.data),
  trajectory: (options) => apiClient.get('/api/measurements/trajectory', options).then((res) => res.data),
  create: (payload) => apiClient.post('/api/measurements', payload).then((res) => res.data),
};
