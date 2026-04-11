// client/src/shared/api/api-endpoints.js
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
  },
  dashboard: {
    summary: '/dashboard/summary',
  },
  routes: {
    list: '/routes',
    details: (routeId) => `/routes/${routeId}`,
    upload: '/routes',
    uploadGpx: '/routes/upload',
    saved: '/routes/saved',
    my: '/routes/my',
    save: (routeId) => `/routes/${routeId}/save`,
    unsave: (routeId) => `/routes/${routeId}/save`,
  },
  rides: {
    groups: '/rides/groups',
    create: '/rides/groups',
    details: (rideId) => `/rides/events/${rideId}`,
    join: (rideId) => `/rides/groups/${rideId}/join`,
    leave: (rideId) => `/rides/groups/${rideId}/leave`,
  },
  clubs: {
    list: '/clubs',
    create: '/clubs',
    details: (clubId) => `/clubs/${clubId}`,
    members: (clubId) => `/clubs/${clubId}/members`,
    join: (clubId) => `/clubs/${clubId}/join`,
    leave: (clubId) => `/clubs/${clubId}/leave`,
    joinRequests: (clubId) => `/clubs/${clubId}/join-requests`,
    approveRequest: (clubId, userId) => `/clubs/${clubId}/join-requests/${userId}/approve`,
    rejectRequest: (clubId, userId) => `/clubs/${clubId}/join-requests/${userId}/reject`,
    createInvite: (clubId) => `/clubs/${clubId}/invites`,
    redeemInvite: '/clubs/invites/redeem',
    patch: (clubId) => `/clubs/${clubId}`,
    promote: (clubId, userId) => `/clubs/${clubId}/members/${userId}/promote`,
    demote: (clubId, userId) => `/clubs/${clubId}/members/${userId}/demote`,
    removeMember: (clubId, userId) => `/clubs/${clubId}/members/${userId}`,
    rides: (clubId) => `/clubs/${clubId}/rides`,
  },
  chat: {
    messages: (rideId) => `/chat/${rideId}`,
    send: (rideId) => `/chat/${rideId}`,
  },
  hazards: {
    list: '/hazards',
    create: '/hazards',
  },
  challenges: {
    list: '/challenges',
  },
  history: {
    list: '/history',
  },
  admin: {
    summary: '/admin/summary',
    users: '/admin/users',
    deleteUser: (userId) => `/admin/users/${userId}`,
    routes: '/admin/routes',
    moderateRoute: (routeId) => `/admin/routes/${routeId}/moderation`,
    deleteRoute: (routeId) => `/admin/routes/${routeId}`,
    hazards: '/admin/hazards',
    updateHazardStatus: (hazardId) => `/admin/hazards/${hazardId}/status`,
  },
  account: {
    changePassword: '/account/password',
    preferences: '/account/preferences',
    profile: '/account/profile',
  },
};
