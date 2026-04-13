// MVP-only route definitions (aligned with project.md)
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',

  // User routes
  dashboard: '/dashboard',
  leaderboards: '/leaderboards',
  routes: '/routes',
  routeDetails: '/routes/:routeId',
  myRoutes: '/my-routes',
  myRides: '/my-rides',
  settings: '/settings',
  findPeople: '/find-people',
  userProfile: '/users/:userId',
  rideEvent: '/ride/:rideId',
  rideLive: '/ride/:rideId/live',
  clubs: '/clubs',
  clubDetails: '/clubs/:clubId',

  // Admin
  admin: '/admin',
  adminUsers: '/admin/users',
  adminRoutes: '/admin/routes',
  adminHazards: '/admin/hazards',

  // Live Ride (Mapbox simulator; public for desktop QA)
  live: '/live',

  // Fallback
  notFound: '/not-found',
};
