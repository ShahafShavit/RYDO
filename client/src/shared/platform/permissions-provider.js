import { createPermissionsProvider } from '@/shared/platform/create-permissions-provider';
import { getGeolocationProvider } from '@/shared/platform/geolocation-provider';

/**
 * @typedef {object} PermissionsProvider
 * @property {() => Promise<'granted' | 'denied' | 'prompt' | 'unknown'>} queryLocationPermissionState
 * @property {() => Promise<{ location: 'granted' | 'denied' | 'unavailable' | 'prompt', blockingReason?: string }>} requestLocationPermission
 * @property {() => Promise<{ orientation: 'granted' | 'denied' | 'not_applicable', blockingReason?: string }>} requestOrientationPermission
 * @property {() => boolean} isOrientationPermissionRequired
 */

/** @type {PermissionsProvider | null} */
let provider = null;

/** @type {PermissionsProvider | null} */
let defaultProvider = null;

/**
 * @param {PermissionsProvider} next
 */
export function setPermissionsProvider(next) {
  provider = next;
}

/**
 * @returns {PermissionsProvider}
 */
export function getPermissionsProvider() {
  if (provider) return provider;
  if (!defaultProvider) {
    defaultProvider = createPermissionsProvider({ geo: getGeolocationProvider() });
  }
  return defaultProvider;
}
