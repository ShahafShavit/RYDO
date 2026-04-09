// client/src/shared/api/api-endpoints.js
// export const API_ENDPOINTS = {
//   auth: {
//     login: '/auth/login',
//     register: '/auth/register',
//   },
//   dashboard: {
//     summary: '/dashboard/summary',
//   },
//   routes: {
//     list: '/routes',
//     details: (routeId) => `/routes/${routeId}`,
//     upload: '/routes',
//     uploadGpx: '/routes/upload',
//     saved: '/routes/saved',
//     save: (routeId) => `/routes/${routeId}/save`,
//     unsave: (routeId) => `/routes/${routeId}/save`,
//   },
//   rides: {
//     groups: '/rides/groups',
//     details: (rideId) => `/rides/events/${rideId}`,
//   },
//   chat: {
//     messages: (rideId) => `/chat/${rideId}`,
//   },
//   hazards: {
//     list: '/hazards',
//     create: '/hazards',
//   },
//   challenges: {
//     list: '/challenges',
//   },
//   history: {
//     list: '/history',
//   },
//   admin: {
//     users: '/admin/users',
//     routes: '/admin/routes',
//     hazards: '/admin/hazards',
//   },
// };
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
    details: (rideId) => `/rides/events/${rideId}`,
  },
  chat: {
    messages: (rideId) => `/chat/${rideId}`,
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
    routes: '/admin/routes',
    hazards: '/admin/hazards',
  },
  account: {
    changePassword: '/account/password',
    preferences: '/account/preferences',
    profile: '/account/profile',
  },
};
