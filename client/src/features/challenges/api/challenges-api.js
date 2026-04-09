import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const challengesApi = {
  getChallenges: () => apiClient.get(API_ENDPOINTS.challenges.list),
};
