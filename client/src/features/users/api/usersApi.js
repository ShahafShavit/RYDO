import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const usersApi = {
  checkHandleAvailable: (handle) =>
    apiClient.get(API_ENDPOINTS.users.handleAvailable, {
      query: { handle: normalizeHandle(handle) },
    }),

  getProfile: (handle) => apiClient.get(API_ENDPOINTS.users.profile(normalizeHandle(handle))),

  getUserRoutes: (handle, params = {}) =>
    apiClient.get(API_ENDPOINTS.users.userRoutes(normalizeHandle(handle)), {
      query: {
        skip: params.skip,
        take: params.take,
        q: params.q,
      },
    }),

  getUserRides: (handle, params = {}) =>
    apiClient.get(API_ENDPOINTS.users.userRides(normalizeHandle(handle)), {
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
