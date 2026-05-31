import { generatePath } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';

/** @param {string | null | undefined} handle */
export function normalizeHandle(handle) {
  if (handle == null) return '';
  return String(handle).replace(/^@/, '').trim().toLowerCase();
}

/** @param {string | null | undefined} handle @returns {string | null} */
export function userProfilePath(handle) {
  const h = normalizeHandle(handle);
  if (!h) return null;
  return generatePath(ROUTES.userProfile, { handle: h });
}

/** Signed-in user's profile, or account settings until handle is available. */
export function myProfilePath(userOrHandle) {
  const handle =
    userOrHandle != null && typeof userOrHandle === 'object'
      ? userOrHandle.handle
      : userOrHandle;
  return userProfilePath(handle) ?? `${ROUTES.settings}?tab=profile`;
}

/** @param {string | null | undefined} handle */
export function formatHandleDisplay(handle) {
  const h = normalizeHandle(handle);
  return h ? `@${h}` : '';
}
