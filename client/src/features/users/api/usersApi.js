import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const usersApi = {
  getProfile: (userId) => apiClient.get(API_ENDPOINTS.users.profile(userId)),

  search: (params = {}) =>
    apiClient.get(API_ENDPOINTS.users.search, {
      query: {
        q: params.q,
        take: params.take,
      },
    }),
};
