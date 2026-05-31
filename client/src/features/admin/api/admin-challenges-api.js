import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const adminChallengesApi = {
  getTemplates() {
    return apiClient.get(API_ENDPOINTS.admin.challengeTemplates);
  },
  getInstances(params = {}) {
    const q = new URLSearchParams();
    if (params.skip != null) q.set('skip', String(params.skip));
    if (params.take != null) q.set('take', String(params.take));
    if (params.status) q.set('status', params.status);
    const suffix = q.toString() ? `?${q}` : '';
    return apiClient.get(`${API_ENDPOINTS.admin.challengeInstances}${suffix}`);
  },
  getProgress(id, params = {}) {
    const q = new URLSearchParams();
    if (params.skip != null) q.set('skip', String(params.skip));
    if (params.take != null) q.set('take', String(params.take));
    const suffix = q.toString() ? `?${q}` : '';
    return apiClient.get(`${API_ENDPOINTS.admin.challengeInstanceProgress(id)}${suffix}`);
  },
  createInstance(body) {
    return apiClient.post(API_ENDPOINTS.admin.challengeInstances, body);
  },
  patchInstance(id, body) {
    return apiClient.patch(API_ENDPOINTS.admin.challengeInstance(id), body);
  },
  patchTemplate(id, body) {
    return apiClient.patch(API_ENDPOINTS.admin.challengeTemplate(id), body);
  },
  deleteInstance(id) {
    return apiClient.delete(API_ENDPOINTS.admin.challengeInstance(id));
  },
};
