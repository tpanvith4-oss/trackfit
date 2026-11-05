import { apiClient } from './apiClient.js';
import {
  createFoodEntry,
  getDateRangeForDay,
  getFoodLogsByDay,
  getFoodLogsRange,
} from '../services/foodApi.js';

export { createFoodEntry, getDateRangeForDay, getFoodLogsByDay, getFoodLogsRange };

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
};
