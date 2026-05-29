import { requestDeviceOrientationPermission } from '@/features/live-ride/utils/liveRideCompass';
import { getPermissionsProvider } from '@/shared/platform/permissions-provider';

const STORAGE_KEY = 'rydoLiveRideOrientation';

/** @typedef {'granted' | 'denied' | 'not_applicable'} OrientationOutcome */
/** @typedef {'granted' | 'denied' | 'unavailable' | 'prompt'} LocationOutcome */

const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 };

const LOCATION_BLOCKED_MSG =
  'Location access is required for live ride. Enable location for this site in your browser settings, then try again.';
const LOCATION_UNAVAILABLE_MSG = 'Geolocation is not available in this browser.';
const ORIENTATION_BLOCKED_MSG =
  'Motion and orientation access is required on this device for live ride direction. Allow access when prompted, or enable it in browser settings.';

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
 * iOS Safari requires an explicit orientation permission prompt.
 * @returns {boolean}
 */
export function isOrientationPermissionRequired() {
  const platform = getPermissionsProvider();
  if (platform) return platform.isOrientationPermissionRequired();
  const Ctor = typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined;
  return Boolean(Ctor && typeof Ctor.requestPermission === 'function');
}

/**
 * @returns {Promise<'granted' | 'denied' | 'prompt' | 'unknown'>}
 */
export async function queryGeolocationPermissionState() {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return /** @type {'granted' | 'denied' | 'prompt'} */ (result.state);
  } catch {
    return 'unknown';
  }
}

/**
 * Request location permission via a one-shot GPS read.
 * @returns {Promise<{ location: LocationOutcome, blockingReason?: string }>}
 */
export async function requestLiveRideLocationPermission() {
  const platform = getPermissionsProvider();
  if (platform) return platform.requestLocationPermission();

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { location: 'unavailable', blockingReason: LOCATION_UNAVAILABLE_MSG };
  }

  const permState = await queryGeolocationPermissionState();
  if (permState === 'denied') {
    return { location: 'denied', blockingReason: LOCATION_BLOCKED_MSG };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ location: 'granted' }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ location: 'denied', blockingReason: LOCATION_BLOCKED_MSG });
          return;
        }
        // Timeout / unavailable still means permission was not explicitly denied.
        resolve({ location: 'granted' });
      },
      GEO_OPTIONS,
    );
  });
}

/**
 * Request device orientation permission (must be called from a user gesture on iOS).
 * @returns {Promise<{ orientation: OrientationOutcome, blockingReason?: string }>}
 */
export async function requestLiveRideOrientationPermission() {
  const platform = getPermissionsProvider();
  if (platform) return platform.requestOrientationPermission();

  if (!isOrientationPermissionRequired()) {
    setStoredLiveRideOrientationOutcome('not_applicable');
    return { orientation: 'not_applicable' };
  }

  const outcome = await requestDeviceOrientationPermission();
  setStoredLiveRideOrientationOutcome(outcome);

  if (outcome === 'granted') {
    return { orientation: 'granted' };
  }
  if (outcome === 'denied') {
    return { orientation: 'denied', blockingReason: ORIENTATION_BLOCKED_MSG };
  }
  return { orientation: 'not_applicable' };
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
