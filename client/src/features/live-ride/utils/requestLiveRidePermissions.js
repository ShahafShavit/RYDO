import { getPermissionsProvider } from '@/shared/platform/permissions-provider';

const STORAGE_KEY = 'rydoLiveRideOrientation';

/** @typedef {'granted' | 'denied' | 'not_applicable'} OrientationOutcome */
/** @typedef {'granted' | 'denied' | 'unavailable' | 'prompt'} LocationOutcome */

/**
 * Persist last orientation permission outcome for the live ride map.
 * @param {OrientationOutcome} outcome
 */
export function setStoredLiveRideOrientationOutcome(outcome) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, outcome);
    }
  } catch {
    /* ignore */
  }
}

/**
 * @returns {OrientationOutcome | null}
 */
export function getStoredLiveRideOrientationOutcome() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === 'granted' || v === 'denied' || v === 'not_applicable') return v;
    return null;
  } catch {
    return null;
  }
}

/**
 * Whether live ride needs an explicit orientation/compass permission step.
 * @returns {boolean}
 */
export function isOrientationPermissionRequired() {
  return getPermissionsProvider().isOrientationPermissionRequired();
}

/**
 * @returns {Promise<'granted' | 'denied' | 'prompt' | 'unknown'>}
 */
export async function queryGeolocationPermissionState() {
  return getPermissionsProvider().queryLocationPermissionState();
}

/**
 * Request location permission via the platform provider.
 * @returns {Promise<{ location: LocationOutcome, blockingReason?: string }>}
 */
export async function requestLiveRideLocationPermission() {
  return getPermissionsProvider().requestLocationPermission();
}

/**
 * Request device orientation / native compass permission (user gesture on web iOS).
 * @returns {Promise<{ orientation: OrientationOutcome, blockingReason?: string }>}
 */
export async function requestLiveRideOrientationPermission() {
  return getPermissionsProvider().requestOrientationPermission();
}

/**
 * @typedef {object} EnsureLiveRidePermissionsResult
 * @property {LocationOutcome} location
 * @property {OrientationOutcome} orientation
 * @property {boolean} ok
 * @property {string | undefined} blockingReason
 */

/**
 * Ensure all required live-ride permissions are granted.
 * @param {{ requestOrientation?: boolean }} [opts]
 * @returns {Promise<EnsureLiveRidePermissionsResult>}
 */
export async function ensureLiveRidePermissions(opts = {}) {
  const requestOrientation = opts.requestOrientation ?? isOrientationPermissionRequired();

  const locationResult = await requestLiveRideLocationPermission();
  if (locationResult.location === 'unavailable' || locationResult.location === 'denied') {
    return {
      location: locationResult.location,
      orientation: 'not_applicable',
      ok: false,
      blockingReason: locationResult.blockingReason,
    };
  }

  if (!requestOrientation) {
    return {
      location: 'granted',
      orientation: 'not_applicable',
      ok: true,
    };
  }

  const orientationResult = await requestLiveRideOrientationPermission();
  if (orientationResult.orientation === 'denied') {
    return {
      location: 'granted',
      orientation: 'denied',
      ok: false,
      blockingReason: orientationResult.blockingReason,
    };
  }

  return {
    location: 'granted',
    orientation: orientationResult.orientation,
    ok: true,
  };
}

/**
 * @deprecated Use ensureLiveRidePermissions during boot instead.
 * @returns {Promise<{ orientation: OrientationOutcome }>}
 */
export async function requestLiveRidePermissions() {
  const result = await ensureLiveRidePermissions({ requestOrientation: true });
  return { orientation: result.orientation };
}
