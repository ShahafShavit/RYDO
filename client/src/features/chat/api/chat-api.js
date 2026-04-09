import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const chatApi = {
  getMessages: (rideId) => apiClient.get(API_ENDPOINTS.chat.messages(rideId)),
};
