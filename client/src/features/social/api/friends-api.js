import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const friendsApi = {
  sendFriendRequest: (handle) =>
    apiClient.post(API_ENDPOINTS.users.friendRequest(normalizeHandle(handle)), {}),

  cancelOutgoingFriendRequest: (targetHandle) =>
    apiClient.delete(API_ENDPOINTS.users.cancelOutgoingFriendRequest(normalizeHandle(targetHandle))),

  acceptFriendRequest: (requestId) => apiClient.post(API_ENDPOINTS.users.acceptFriendRequest(requestId), {}),

  declineFriendRequest: (requestId) => apiClient.post(API_ENDPOINTS.users.declineFriendRequest(requestId), {}),

  getFriends: (handle) => apiClient.get(API_ENDPOINTS.users.friends(normalizeHandle(handle))),

  getRelationship: (handle) => apiClient.get(API_ENDPOINTS.users.relationship(normalizeHandle(handle))),

  getInbox: (params = {}) =>
    apiClient.get(API_ENDPOINTS.users.inbox, {
      query: {
        tab: params.tab,
        unreadOnly: params.unreadOnly,
        take: params.take,
      },
    }),

  getInboxSummary: () => apiClient.get(API_ENDPOINTS.users.inboxSummary),

  markInboxRead: (inboxItemId) => apiClient.post(API_ENDPOINTS.users.markInboxRead(inboxItemId), {}),
};
