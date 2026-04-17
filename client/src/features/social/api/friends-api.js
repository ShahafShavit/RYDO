import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const friendsApi = {
  sendFriendRequest: (userId) => apiClient.post(API_ENDPOINTS.users.friendRequest(userId), {}),

  cancelOutgoingFriendRequest: (targetUserId) =>
    apiClient.delete(API_ENDPOINTS.users.cancelOutgoingFriendRequest(targetUserId)),

  acceptFriendRequest: (requestId) => apiClient.post(API_ENDPOINTS.users.acceptFriendRequest(requestId), {}),

  declineFriendRequest: (requestId) => apiClient.post(API_ENDPOINTS.users.declineFriendRequest(requestId), {}),

  getFriends: (userId) => apiClient.get(API_ENDPOINTS.users.friends(userId)),

  getRelationship: (userId) => apiClient.get(API_ENDPOINTS.users.relationship(userId)),

  getInbox: (params = {}) =>
    apiClient.get(API_ENDPOINTS.users.inbox, {
      query: {
        unreadOnly: params.unreadOnly,
        take: params.take,
      },
    }),

  getInboxSummary: () => apiClient.get(API_ENDPOINTS.users.inboxSummary),

  markInboxRead: (inboxItemId) => apiClient.post(API_ENDPOINTS.users.markInboxRead(inboxItemId), {}),
};
