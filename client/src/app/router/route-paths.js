import { env } from '@/shared/config/env';

// MVP-only route definitions (aligned with project.md)
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',

  // User routes
  dashboard: '/dashboard',
  leaderboards: '/leaderboards',
  challenges: '/challenges',
  routes: '/routes',
  routeDetails: '/routes/:routeId',
  myRoutes: '/my-routes',
  myRides: '/my-rides',
  settings: '/settings',
  findPeople: '/find-people',
  inbox: '/inbox',
  userProfile: '/users/:handle',
  rideEvent: '/ride/:rideId',
  rideLive: '/ride/:rideId/live',
  clubs: '/clubs',
  clubDetails: '/clubs/:clubId',

  // Admin
  admin: '/admin',
  adminUsers: '/admin/users',
  adminRoutes: '/admin/routes',
  adminHazards: '/admin/hazards',
  adminChallenges: '/admin/challenges',

  // Live Ride (Mapbox simulator; public for desktop QA)
  live: '/live',
  timelapse: '/timelapse',

  // Fallback
  notFound: '/not-found',
};

/** Web marketing home (`/`); signed-in app home on Capacitor (`/dashboard`). */
export function getAppHomeRoute() {
  return env.isNativeApp ? ROUTES.dashboard : ROUTES.home;
}
