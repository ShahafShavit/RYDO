import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const leaderboardsApi = {
  getLeaderboards: () => apiClient.get(API_ENDPOINTS.leaderboards.list),
};
