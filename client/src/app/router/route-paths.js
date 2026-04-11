// MVP-only route definitions (aligned with project.md)
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',

  // User routes
  dashboard: '/dashboard',
  routes: '/routes',
  routeDetails: '/routes/:routeId',
  yourRoutes: '/your-routes',
  myRides: '/my-rides',
  settings: '/settings',
  rideEvent: '/rides/:rideId',
  clubs: '/clubs',
  clubDetails: '/clubs/:clubId',

  // Admin
  admin: '/admin',
  adminUsers: '/admin/users',
  adminRoutes: '/admin/routes',
  adminHazards: '/admin/hazards',

  // Fallback
  notFound: '/not-found',
};
