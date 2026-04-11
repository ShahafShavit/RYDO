import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const adminKeys = {
  all: ['admin'],
  summary: () => [...adminKeys.all, 'summary'],
  users: () => [...adminKeys.all, 'users'],
  userList: (filters) => [...adminKeys.users(), filters],
  routes: () => [...adminKeys.all, 'routes'],
  routeList: (filters) => [...adminKeys.routes(), filters],
  hazards: () => [...adminKeys.all, 'hazards'],
  hazardList: (filters) => [...adminKeys.hazards(), filters],
};

export const adminApi = {
  getSummary: () => apiClient.get(API_ENDPOINTS.admin.summary),
  getUsers: (params = {}) => apiClient.get(API_ENDPOINTS.admin.users, { query: params }),
  deleteUser: (userId) => apiClient.delete(API_ENDPOINTS.admin.deleteUser(userId)),
  getRoutes: (params = {}) => apiClient.get(API_ENDPOINTS.admin.routes, { query: params }),
  deleteRoute: (routeId) => apiClient.delete(API_ENDPOINTS.admin.deleteRoute(routeId)),
  moderateRoute: (routeId, payload) => apiClient.patch(API_ENDPOINTS.admin.moderateRoute(routeId), payload),
  getHazards: (params = {}) => apiClient.get(API_ENDPOINTS.admin.hazards, { query: params }),
  updateHazardStatus: (hazardId, payload) => apiClient.patch(API_ENDPOINTS.admin.updateHazardStatus(hazardId), payload),
};
