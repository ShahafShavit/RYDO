// client/src/shared/api/api-endpoints.js
// API routes are under /api so the SPA can use the same host for static HTML routes (/routes, /clubs, …).
const P = '/api';

export const API_ENDPOINTS = {
  auth: {
    login: `${P}/auth/login`,
    register: `${P}/auth/register`,
  },
  dashboard: {
    summary: `${P}/dashboard/summary`,
  },
  routes: {
    list: `${P}/routes`,
    details: (routeId) => `${P}/routes/${routeId}`,
    upload: `${P}/routes`,
    uploadGpx: `${P}/routes/upload`,
    saved: `${P}/routes/saved`,
    my: `${P}/routes/my`,
    save: (routeId) => `${P}/routes/${routeId}/save`,
    unsave: (routeId) => `${P}/routes/${routeId}/save`,
  },
  users: {
    myRides: `${P}/users/me/rides`,
    profile: (userId) => `${P}/users/${userId}/profile`,
    search: `${P}/users/search`,
  },
  rides: {
    details: (rideId) => `${P}/rides/${rideId}`,
    update: (rideId) => `${P}/rides/${rideId}`,
    join: (rideId) => `${P}/rides/${rideId}/join`,
    leave: (rideId) => `${P}/rides/${rideId}/leave`,
  },
  clubs: {
    list: `${P}/clubs`,
    create: `${P}/clubs`,
    details: (clubId) => `${P}/clubs/${clubId}`,
    members: (clubId) => `${P}/clubs/${clubId}/members`,
    join: (clubId) => `${P}/clubs/${clubId}/join`,
    leave: (clubId) => `${P}/clubs/${clubId}/leave`,
    joinRequests: (clubId) => `${P}/clubs/${clubId}/join-requests`,
    approveRequest: (clubId, userId) => `${P}/clubs/${clubId}/join-requests/${userId}/approve`,
    rejectRequest: (clubId, userId) => `${P}/clubs/${clubId}/join-requests/${userId}/reject`,
    createInvite: (clubId) => `${P}/clubs/${clubId}/invites`,
    redeemInvite: `${P}/clubs/invites/redeem`,
    patch: (clubId) => `${P}/clubs/${clubId}`,
    promote: (clubId, userId) => `${P}/clubs/${clubId}/members/${userId}/promote`,
    demote: (clubId, userId) => `${P}/clubs/${clubId}/members/${userId}/demote`,
    removeMember: (clubId, userId) => `${P}/clubs/${clubId}/members/${userId}`,
    rides: (clubId) => `${P}/clubs/${clubId}/rides`,
    createRide: (clubId) => `${P}/clubs/${clubId}/rides`,
  },
  chat: {
    messages: (rideId) => `${P}/chat/${rideId}`,
    send: (rideId) => `${P}/chat/${rideId}`,
  },
  hazards: {
    list: `${P}/hazards`,
    create: `${P}/hazards`,
  },
  challenges: {
    list: `${P}/challenges`,
  },
  history: {
    list: `${P}/history`,
  },
  admin: {
    summary: `${P}/admin/summary`,
    users: `${P}/admin/users`,
    deleteUser: (userId) => `${P}/admin/users/${userId}`,
    routes: `${P}/admin/routes`,
    moderateRoute: (routeId) => `${P}/admin/routes/${routeId}/moderation`,
    deleteRoute: (routeId) => `${P}/admin/routes/${routeId}`,
    hazards: `${P}/admin/hazards`,
    updateHazardStatus: (hazardId) => `${P}/admin/hazards/${hazardId}/status`,
  },
  account: {
    changePassword: `${P}/account/password`,
    preferences: `${P}/account/preferences`,
    profile: `${P}/account/profile`,
  },
};
