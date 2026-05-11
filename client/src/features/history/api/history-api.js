import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const historyApi = {
  getHistory: (params = {}) => apiClient.get(API_ENDPOINTS.history.list, { query: params }),
};
