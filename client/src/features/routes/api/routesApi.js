import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const routeKeys = {
  all: ['routes'],
  lists: () => [...routeKeys.all, 'list'],
  list: (filters) => [...routeKeys.lists(), { filters }],
  details: () => [...routeKeys.all, 'detail'],
  detail: (id) => [...routeKeys.details(), id],
  savedRoot: () => [...routeKeys.all, 'saved'],
  saved: (filters = {}) => [...routeKeys.savedRoot(), { filters }],
  myRoot: () => [...routeKeys.all, 'my'],
  my: (filters = {}) => [...routeKeys.myRoot(), { filters }],
};

export const routesApi = {
  list: (params = {}) => apiClient.get(API_ENDPOINTS.routes.list, { query: params }),
  getById: (routeId) => apiClient.get(API_ENDPOINTS.routes.details(routeId)),
  upload: ({ file, ...metadata }) =>
    apiClient.uploadFile(API_ENDPOINTS.routes.uploadGpx, file, metadata, { fileFieldName: 'gpxFile' }),
  getSaved: (params = {}) => apiClient.get(API_ENDPOINTS.routes.saved, { query: params }),
  getMine: (params = {}) => apiClient.get(API_ENDPOINTS.routes.my, { query: params }),
  save: (routeId) => apiClient.post(API_ENDPOINTS.routes.save(routeId)),
  unsave: (routeId) => apiClient.delete(API_ENDPOINTS.routes.unsave(routeId)),
};
