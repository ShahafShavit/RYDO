import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const clubsApi = {
  list: () => apiClient.get(API_ENDPOINTS.clubs.list),
  create: (payload) => apiClient.post(API_ENDPOINTS.clubs.create, payload),
  getById: (clubId) => apiClient.get(API_ENDPOINTS.clubs.details(clubId)),
  getMembers: (clubId) => apiClient.get(API_ENDPOINTS.clubs.members(clubId)),
  getJoinRequests: (clubId) => apiClient.get(API_ENDPOINTS.clubs.joinRequests(clubId)),
  join: (clubId) => apiClient.post(API_ENDPOINTS.clubs.join(clubId)),
  leave: (clubId) => apiClient.post(API_ENDPOINTS.clubs.leave(clubId)),
  approveRequest: (clubId, userId) => apiClient.post(API_ENDPOINTS.clubs.approveRequest(clubId, userId)),
  rejectRequest: (clubId, userId) => apiClient.post(API_ENDPOINTS.clubs.rejectRequest(clubId, userId)),
  createInvite: (clubId) => apiClient.post(API_ENDPOINTS.clubs.createInvite(clubId)),
  redeemInvite: (token) => apiClient.post(API_ENDPOINTS.clubs.redeemInvite, { token }),
  patch: (clubId, payload) => apiClient.patch(API_ENDPOINTS.clubs.patch(clubId), payload),
  uploadAvatar: (clubId, file) =>
    apiClient.uploadFile(API_ENDPOINTS.clubs.avatarUpload(clubId), file, {}, { fileFieldName: 'file' }),
  promote: (clubId, userId) => apiClient.post(API_ENDPOINTS.clubs.promote(clubId, userId)),
  demote: (clubId, userId) => apiClient.post(API_ENDPOINTS.clubs.demote(clubId, userId)),
  removeMember: (clubId, userId) => apiClient.delete(API_ENDPOINTS.clubs.removeMember(clubId, userId)),
  getRides: (clubId) => apiClient.get(API_ENDPOINTS.clubs.rides(clubId)),
};
