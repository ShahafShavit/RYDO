import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const gamificationApi = {
  getMe() {
    return apiClient.get(API_ENDPOINTS.gamification.me);
  },
  getMyChallenges() {
    return apiClient.get(API_ENDPOINTS.gamification.myChallenges);
  },
  getRecentXp(take = 20) {
    return apiClient.get(`${API_ENDPOINTS.gamification.xpRecent}?take=${take}`);
  },
  setPinnedChallenge(instanceId) {
    return apiClient.put(API_ENDPOINTS.gamification.pinnedChallenge, { instanceId });
  },
  acknowledgeLevel() {
    return apiClient.patch(API_ENDPOINTS.gamification.acknowledgeLevel);
  },
};
