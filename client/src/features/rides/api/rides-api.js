import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const ridesApi = {
  getGroups: () => apiClient.get(API_ENDPOINTS.rides.groups),
  getRideDetails: (rideId) => apiClient.get(API_ENDPOINTS.rides.details(rideId)),
  createRide: (payload) => apiClient.post(API_ENDPOINTS.rides.create, payload),
  joinRide: (rideId) => apiClient.post(API_ENDPOINTS.rides.join(rideId)),
  leaveRide: (rideId) => apiClient.post(API_ENDPOINTS.rides.leave(rideId)),
};
