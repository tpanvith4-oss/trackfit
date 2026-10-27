import { apiClient } from './apiClient.js';

export const foodApi = {
  list: ({ from, to, limit } = {}, options) =>
    apiClient.get('/api/food', { ...options, query: { from, to, limit } }).then((res) => res.data),
  recommendations: ({ limit } = {}, options) =>
    apiClient.get('/api/food/recommendations', { ...options, query: { limit } }).then((res) => res.data),
  create: (entry) => apiClient.post('/api/food', entry).then((res) => res.data),
  remove: (id) => apiClient.delete(`/api/food/${encodeURIComponent(id)}`),
  /** Gemini estimate for a free-text meal: title, meal type, itemised and total macros. Nothing is saved. */
  aiParse: ({ description, localTime }, options) =>
    apiClient.post('/api/food/ai-parse', { description, localTime }, options).then((res) => res.data),
};
