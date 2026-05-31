import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const rideChatApi = {
  getSummary: () => apiClient.get(API_ENDPOINTS.users.rideChatSummary),
  getMessages: (rideId, query) => apiClient.get(API_ENDPOINTS.rides.chatMessages(rideId), { query }),
  postMessage: (rideId, payload) => apiClient.post(API_ENDPOINTS.rides.chatSend(rideId), payload),
  postRead: (rideId, payload) => apiClient.post(API_ENDPOINTS.rides.chatRead(rideId), payload),
};
