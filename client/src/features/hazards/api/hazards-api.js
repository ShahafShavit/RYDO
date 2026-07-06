import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const hazardsApi = {
  listForRoute: (routeId) => apiClient.get(API_ENDPOINTS.routes.hazards(routeId)),
  createOnRide: (rideId, payload) => apiClient.post(API_ENDPOINTS.rides.hazards(rideId), payload),
  vote: (hazardId, payload) => apiClient.put(API_ENDPOINTS.hazards.vote(hazardId), payload),
};
