import { requestDeviceOrientationPermission } from '@/features/live-ride/utils/liveRideCompass';

const STORAGE_KEY = 'rydoLiveRideOrientation';

/** @typedef {'granted' | 'denied' | 'not_applicable'} OrientationOutcome */

/**
 * Persist last orientation permission outcome for the live ride map (e.g. deep-link UX).
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

const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 };

/**
 * Warm up geolocation (prompt if needed) and request device orientation permission on iOS.
 * Safe to call multiple times; failures are non-fatal (user can fix on the map).
 * @returns {Promise<{ orientation: OrientationOutcome }>}
 */
export async function requestLiveRidePermissions() {
  const orientation = await requestDeviceOrientationPermission();
  setStoredLiveRideOrientationOutcome(orientation);

  await new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      GEO_OPTIONS,
    );
  });

  return { orientation };
}
