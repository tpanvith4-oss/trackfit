import { apiClient } from './apiClient.js';

export const mealTemplatesApi = {
  list: (options) => apiClient.get('/api/meal-templates', options).then((res) => res.data),
};
