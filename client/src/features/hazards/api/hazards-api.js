import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const hazardsApi = {
  getHazards: () => apiClient.get(API_ENDPOINTS.hazards.list),
  createHazard: (payload) => apiClient.post(API_ENDPOINTS.hazards.create, payload),
};
