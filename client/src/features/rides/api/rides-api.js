import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const ridesApi = {
  getMyRides: () => apiClient.get(API_ENDPOINTS.users.myRides),
  getRideDetails: (rideId) => apiClient.get(API_ENDPOINTS.rides.details(rideId)),
  createClubRide: (clubId, payload) => apiClient.post(API_ENDPOINTS.clubs.createRide(clubId), payload),
  joinRide: (rideId) => apiClient.post(API_ENDPOINTS.rides.join(rideId)),
  leaveRide: (rideId) => apiClient.post(API_ENDPOINTS.rides.leave(rideId)),
};
