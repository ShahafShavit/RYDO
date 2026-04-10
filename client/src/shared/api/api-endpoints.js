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
