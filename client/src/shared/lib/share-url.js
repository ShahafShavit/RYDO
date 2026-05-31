import { generatePath } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { userProfilePath } from '@/shared/lib/user-paths';

const PUBLIC_ORIGIN = 'https://rydo.bike';

/**
 * Absolute URL for sharing SPA routes (profiles, routes, rides).
 * Native builds default to rydo.bike; web dev uses window.location.origin.
 * @param {string | null | undefined} path
 * @returns {string | null}
 */
export function buildShareUrl(path) {
  if (!path) return null;
  const base =
    import.meta.env.VITE_APP_BASE_URL?.replace(/\/$/, '') ||
    (import.meta.env.VITE_PLATFORM === 'native' ? PUBLIC_ORIGIN : null) ||
    (typeof window !== 'undefined' ? window.location.origin : PUBLIC_ORIGIN);
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

/** @param {string | null | undefined} handle */
export function profileShareUrl(handle) {
  return buildShareUrl(userProfilePath(handle));
}

/** @param {string | number | null | undefined} routeId */
export function routeShareUrl(routeId) {
  if (routeId == null || routeId === '') return null;
  return buildShareUrl(generatePath(ROUTES.routeDetails, { routeId: String(routeId) }));
}

/** @param {string | number | null | undefined} rideId */
export function rideShareUrl(rideId) {
  if (rideId == null || rideId === '') return null;
  return buildShareUrl(generatePath(ROUTES.rideEvent, { rideId: String(rideId) }));
}
