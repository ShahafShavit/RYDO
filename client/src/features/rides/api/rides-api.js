import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const ridesApi = {
  getMyRides: (params = {}) => {
    const query = {};
    if (params.q) query.q = params.q;
    if (params.when) query.when = params.when;
    return apiClient.get(API_ENDPOINTS.users.myRides, { query });
  },
  createPersonalRide: (payload) => apiClient.post(API_ENDPOINTS.users.myRides, payload),
  getRideDetails: (rideId) => apiClient.get(API_ENDPOINTS.rides.details(rideId)),
  createClubRide: (clubId, payload) => apiClient.post(API_ENDPOINTS.clubs.createRide(clubId), payload),
  joinRide: (rideId) => apiClient.post(API_ENDPOINTS.rides.join(rideId)),
  leaveRide: (rideId) => apiClient.post(API_ENDPOINTS.rides.leave(rideId)),
};
