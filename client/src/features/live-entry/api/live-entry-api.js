import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const liveEntryApi = {
  preview: (boothToken) =>
    apiClient.get(API_ENDPOINTS.liveEntry.preview, {
      query: boothToken ? { g: boothToken } : undefined,
    }),
  challenge: (boothToken) =>
    apiClient.post(API_ENDPOINTS.liveEntry.challenge, { boothToken: boothToken || '' }),
  redeem: (entryToken) =>
    apiClient.post(API_ENDPOINTS.liveEntry.redeem, { entryToken }),
  boothUrl: () => apiClient.get(API_ENDPOINTS.liveEntry.boothUrl),
};
