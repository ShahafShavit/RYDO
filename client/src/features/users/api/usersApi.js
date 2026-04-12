import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const usersApi = {
  getProfile: (userId) => apiClient.get(API_ENDPOINTS.users.profile(userId)),

  /** Paginated routes uploaded by the user (same shape as explore list). */
  getUserRoutes: (userId, params = {}) =>
    apiClient.get(API_ENDPOINTS.users.userRoutes(userId), {
      query: {
        skip: params.skip,
        take: params.take,
        q: params.q,
      },
    }),

  /** Paginated rides the user participates in (public visibility rules). */
  getUserRides: (userId, params = {}) =>
    apiClient.get(API_ENDPOINTS.users.userRides(userId), {
      query: {
        skip: params.skip,
        take: params.take,
        q: params.q,
      },
    }),

  search: (params = {}) =>
    apiClient.get(API_ENDPOINTS.users.search, {
      query: {
        q: params.q,
        take: params.take,
      },
    }),
};
