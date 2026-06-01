import { requestDeviceOrientationPermission } from '@/features/live-ride/utils/liveRideCompass';
import { setStoredLiveRideOrientationOutcome } from '@/features/live-ride/utils/requestLiveRidePermissions';
import { getCompassProvider } from '@/shared/platform/compass-provider';

const LOCATION_BLOCKED_MSG_NATIVE =
  'Location access is required for live ride. Enable location for this app in Settings, then try again.';
const LOCATION_BLOCKED_MSG_WEB =
  'Location access is required for live ride. Enable location for this site in your browser settings, then try again.';
const LOCATION_UNAVAILABLE_MSG_NATIVE = 'Geolocation is not available on this device.';
const LOCATION_UNAVAILABLE_MSG_WEB = 'Geolocation is not available in this browser.';
const ORIENTATION_BLOCKED_MSG_NATIVE =
  'Compass access is required for live ride direction. Allow access when prompted, or enable location in Settings.';
const ORIENTATION_BLOCKED_MSG_WEB =
  'Motion and orientation access is required on this device for live ride direction. Allow access when prompted, or enable it in browser settings.';

/**
 * @returns {boolean}
 */
function isCapacitorNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
}

/**
 * @returns {boolean}
 */
function webOrientationRequired() {
  const Ctor = typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined;
  return Boolean(Ctor && typeof Ctor.requestPermission === 'function');
}

/**
 * @param {import('@/shared/platform/geolocation-provider').GeolocationProvider} geo
 * @param {import('@/shared/platform/compass-provider').CompassProvider} compass
 * @returns {import('@/shared/platform/permissions-provider').PermissionsProvider}
 */
export function createPermissionsProvider({ geo, compass = getCompassProvider() } = {}) {
  if (!geo) {
    throw new Error('createPermissionsProvider requires a GeolocationProvider');
  }

  const isNative = isCapacitorNative();
  const locationBlockedMsg = isNative ? LOCATION_BLOCKED_MSG_NATIVE : LOCATION_BLOCKED_MSG_WEB;
  const locationUnavailableMsg = isNative ? LOCATION_UNAVAILABLE_MSG_NATIVE : LOCATION_UNAVAILABLE_MSG_WEB;
  const orientationBlockedMsg = isNative ? ORIENTATION_BLOCKED_MSG_NATIVE : ORIENTATION_BLOCKED_MSG_WEB;

  return {
    isOrientationPermissionRequired() {
      if (compass.isNative) return true;
      return webOrientationRequired();
    },

    async queryLocationPermissionState() {
      if (geo.queryPermissionState) {
        return geo.queryPermissionState();
      }
      return 'unknown';
    },

    async requestLocationPermission() {
      if (!geo.isAvailable) {
        return { location: 'unavailable', blockingReason: locationUnavailableMsg };
      }

      const permState = geo.queryPermissionState ? await geo.queryPermissionState() : 'unknown';
      if (permState === 'denied') {
        return { location: 'denied', blockingReason: locationBlockedMsg };
      }

      if (isNative && geo.requestPermission) {
        const outcome = await geo.requestPermission();
        if (outcome === 'denied') {
          return { location: 'denied', blockingReason: locationBlockedMsg };
        }
      }

      return new Promise((resolve) => {
        geo.getCurrentPosition(
          () => resolve({ location: 'granted' }),
          (err) => {
            if (err?.code === 1) {
              resolve({ location: 'denied', blockingReason: locationBlockedMsg });
              return;
            }
            resolve({ location: 'granted' });
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
        );
      });
    },

    async requestOrientationPermission() {
      if (!this.isOrientationPermissionRequired()) {
        setStoredLiveRideOrientationOutcome('not_applicable');
        return { orientation: 'not_applicable' };
      }

      if (compass.isNative && compass.requestPermission) {
        const outcome = await compass.requestPermission();
        const stored = outcome === 'granted' ? 'granted' : outcome === 'denied' ? 'denied' : 'not_applicable';
        setStoredLiveRideOrientationOutcome(stored);

        if (outcome === 'granted') return { orientation: 'granted' };
        if (outcome === 'denied') {
          return { orientation: 'denied', blockingReason: orientationBlockedMsg };
        }
        return { orientation: 'not_applicable' };
      }

      const outcome = await requestDeviceOrientationPermission();
      setStoredLiveRideOrientationOutcome(outcome);

      if (outcome === 'granted') return { orientation: 'granted' };
      if (outcome === 'denied') {
        return { orientation: 'denied', blockingReason: orientationBlockedMsg };
      }
      return { orientation: 'not_applicable' };
    },
  };
}
