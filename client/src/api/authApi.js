import { apiClient } from './apiClient.js';

export const authApi = {
  register: (profile) => apiClient.post('/api/auth/register', profile, { auth: false }),
  login: (credentials) => apiClient.post('/api/auth/login', credentials, { auth: false }),
  me: (options) => apiClient.get('/api/auth/me', options).then((res) => res.user),
};
