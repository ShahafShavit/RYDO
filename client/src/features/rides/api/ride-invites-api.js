import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const rideInvitesApi = {
  sendInvites: (rideId, userIds) =>
    apiClient.post(API_ENDPOINTS.rides.sendInvites(rideId), { userIds }),

  acceptInvite: (rideId, inviteId) =>
    apiClient.post(API_ENDPOINTS.rides.acceptInvite(rideId, inviteId), {}),

  declineInvite: (rideId, inviteId) =>
    apiClient.post(API_ENDPOINTS.rides.declineInvite(rideId, inviteId), {}),
};
