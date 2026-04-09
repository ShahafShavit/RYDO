import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const authApi = {
  login: (payload) => apiClient.post(API_ENDPOINTS.auth.login, payload),
  register: (payload) => apiClient.post(API_ENDPOINTS.auth.register, payload),
};
