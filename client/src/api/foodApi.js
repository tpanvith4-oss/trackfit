import { API_BASE_URL, apiClient } from './apiClient.js';
import {
  createFoodEntry,
  getDateRangeForDay,
  getFoodLogsByDay,
  getFoodLogsRange,
} from '../services/foodApi.js';

export { createFoodEntry, getDateRangeForDay, getFoodLogsByDay, getFoodLogsRange };

export function getLiveWsUrl(token) {
  const base = new URL(API_BASE_URL);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = '/api/live';
  base.search = '';
  if (token) base.searchParams.set('token', token);
  return base.toString();
}

/** Facade used across the app; day queries go through timezone-safe helpers. */
export const foodApi = {
  getDateRangeForDay,
  getFoodLogsByDay,
  getFoodLogsRange,
  createFoodEntry,

  list: ({ from, to, limit } = {}, options) =>
    apiClient.get('/api/food', { ...options, query: { from, to, limit } }).then((res) => res.data),

  listByDay: (dateString, limit = 200, options) =>
    getFoodLogsByDay(dateString, limit, options).then((res) => res.data),

  recommendations: ({ limit } = {}, options) =>
    apiClient.get('/api/food/recommendations', { ...options, query: { limit } }).then((res) => res.data),

  create: (entry, options) => createFoodEntry(entry, options),

  remove: (id) => apiClient.delete(`/api/food/${encodeURIComponent(id)}`),

  aiParse: ({ description, localTime }, options) =>
    apiClient.post('/api/food/ai-parse', { description, localTime }, options).then((res) => res.data),

  transcribe: ({ audioBase64, mimeType }, options) =>
    apiClient.post('/api/food/transcribe', { audioBase64, mimeType }, options).then((res) => res.data),
};
