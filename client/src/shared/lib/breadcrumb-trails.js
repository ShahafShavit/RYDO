import { generatePath, matchPath } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';

/** @typedef {{ label: string, to?: string }} BreadcrumbItem */

const DASHBOARD_HOME = { label: 'Home', to: ROUTES.dashboard };

/**
 * @param {string} pathname
 * @param {string | null} [detailLabel]
 * @returns {BreadcrumbItem[]}
 */
export function buildDashboardBreadcrumbTrail(pathname, detailLabel = null) {
  const detail = detailLabel && String(detailLabel).trim() !== '' ? String(detailLabel).trim() : null;

  /** @type {Array<{ path: string, end?: boolean, build: (params: import('react-router').Params<string>) => BreadcrumbItem[] }>} */
  const rules = [
    {
      path: ROUTES.rideLive,
      end: true,
      build: (params) => {
        const rideId = params.rideId ?? '';
        const eventTo = rideId ? generatePath(ROUTES.rideEvent, { rideId }) : ROUTES.myRides;
        return [
          DASHBOARD_HOME,
          { label: 'My Rides', to: ROUTES.myRides },
          { label: detail || 'Ride', to: eventTo },
          { label: 'Live', to: undefined },
        ];
      },
    },
    {
      path: ROUTES.rideEvent,
      end: true,
      build: () => [
        DASHBOARD_HOME,
        { label: 'My Rides', to: ROUTES.myRides },
        { label: detail || 'Ride', to: undefined },
      ],
    },
    {
      path: ROUTES.routeDetails,
      end: true,
      build: () => [
        DASHBOARD_HOME,
        { label: 'Explore', to: ROUTES.routes },
        { label: detail || 'Route', to: undefined },
      ],
    },
    {
      path: ROUTES.clubDetails,
      end: true,
      build: () => [
        DASHBOARD_HOME,
        { label: 'Clubs', to: ROUTES.clubs },
        { label: detail || 'Club', to: undefined },
      ],
    },
    {
      path: ROUTES.userProfile,
      end: true,
      build: () => [
        DASHBOARD_HOME,
        { label: 'Profile', to: undefined },
        { label: detail || 'User', to: undefined },
      ],
    },
    {
      path: ROUTES.dashboard,
      end: true,
      build: () => [{ label: 'Home', to: undefined }],
    },
    {
      path: ROUTES.leaderboards,
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'Leaderboards', to: undefined }],
    },
    {
      path: ROUTES.routes,
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'Explore', to: undefined }],
    },
    {
      path: ROUTES.myRoutes,
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'My Routes', to: undefined }],
    },
    {
      path: '/your-routes',
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'My Routes', to: undefined }],
    },
    {
      path: ROUTES.myRides,
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'My Rides', to: undefined }],
    },
    {
      path: ROUTES.clubs,
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'Clubs', to: undefined }],
    },
    {
      path: ROUTES.settings,
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'Settings', to: undefined }],
    },
    {
      path: ROUTES.inbox,
      end: true,
      build: () => [DASHBOARD_HOME, { label: 'Inbox', to: undefined }],
    },
  ];

  for (const rule of rules) {
    const m = matchPath({ path: rule.path, end: rule.end ?? true }, pathname);
    if (m) return rule.build(m.params);
  }

  return [DASHBOARD_HOME];
}

/**
 * @param {string} pathname
 * @returns {BreadcrumbItem[]}
 */
export function buildAdminBreadcrumbTrail(pathname) {
  const rules = [
    {
      path: ROUTES.adminUsers,
      end: true,
      build: () => [
        { label: 'Admin', to: ROUTES.admin },
        { label: 'Users', to: undefined },
      ],
    },
    {
      path: ROUTES.adminRoutes,
      end: true,
      build: () => [
        { label: 'Admin', to: ROUTES.admin },
        { label: 'Routes', to: undefined },
      ],
    },
    {
      path: ROUTES.adminHazards,
      end: true,
      build: () => [
        { label: 'Admin', to: ROUTES.admin },
        { label: 'Hazards', to: undefined },
      ],
    },
    {
      path: ROUTES.admin,
      end: true,
      build: () => [{ label: 'Admin', to: undefined }],
    },
  ];

  for (const rule of rules) {
    const m = matchPath({ path: rule.path, end: rule.end ?? true }, pathname);
    if (m) return rule.build();
  }

  return [{ label: 'Admin', to: ROUTES.admin }];
}

/**
 * @param {string} pathname
 * @returns {BreadcrumbItem[] | null} null = hide breadcrumbs
 */
export function buildPublicBreadcrumbTrail(pathname) {
  if (pathname === ROUTES.home) return null;

  if (pathname === ROUTES.login) {
    return [
      { label: 'Home', to: ROUTES.home },
      { label: 'Login', to: undefined },
    ];
  }
  if (pathname === ROUTES.register) {
    return [
      { label: 'Home', to: ROUTES.home },
      { label: 'Register', to: undefined },
    ];
  }

  return [{ label: 'Home', to: ROUTES.home }];
}

/**
 * @param {string} pathname
 * @returns {BreadcrumbItem[]}
 */
export function buildToolBreadcrumbTrail(pathname) {
  if (pathname === ROUTES.live) {
    return [
      { label: 'Home', to: ROUTES.home },
      { label: 'Live replay', to: undefined },
    ];
  }
  if (pathname === ROUTES.timelapse) {
    return [
      { label: 'Home', to: ROUTES.home },
      { label: 'Timelapse', to: undefined },
    ];
  }
  return [{ label: 'Home', to: ROUTES.home }];
}
