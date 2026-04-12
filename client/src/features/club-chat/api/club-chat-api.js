import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const clubChatApi = {
  getSummary: () => apiClient.get(API_ENDPOINTS.clubs.clubChatSummary),
  getMessages: (clubId, query) => apiClient.get(API_ENDPOINTS.clubs.chatMessages(clubId), { query }),
  postMessage: (clubId, payload) => apiClient.post(API_ENDPOINTS.clubs.chatSend(clubId), payload),
  postRead: (clubId, payload) => apiClient.post(API_ENDPOINTS.clubs.chatRead(clubId), payload),
  getMentionables: (clubId, q) =>
    apiClient.get(API_ENDPOINTS.clubs.chatMentionables(clubId), { query: q ? { q } : undefined }),
};
