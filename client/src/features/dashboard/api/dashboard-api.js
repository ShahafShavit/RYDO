import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const dashboardApi = {
  getSummary: () => apiClient.get(API_ENDPOINTS.dashboard.summary),
};
