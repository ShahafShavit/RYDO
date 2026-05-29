import { Capacitor } from '@capacitor/core';
import { requestDeviceOrientationPermission } from '@/features/live-ride/utils/liveRideCompass';
import { setStoredLiveRideOrientationOutcome } from '@/features/live-ride/utils/requestLiveRidePermissions';
import { createGeolocation } from './geolocation';

const LOCATION_BLOCKED_MSG =
  'Location access is required for live ride. Enable location for this app in Settings, then try again.';
const LOCATION_UNAVAILABLE_MSG = 'Geolocation is not available on this device.';
const ORIENTATION_BLOCKED_MSG =
  'Motion and orientation access is required for live ride direction. Allow access when prompted, or enable it in Settings.';

function webOrientationRequired() {
  const Ctor = typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined;
  return Boolean(Ctor && typeof Ctor.requestPermission === 'function');
}

/**
 * @param {import('./types.js').GeolocationProvider} geo
 * @returns {import('./types.js').PermissionsProvider}
 */
export function createPermissionsProvider(geo) {
  return {
    isOrientationPermissionRequired() {
      if (Capacitor.isNativePlatform()) {
        return Capacitor.getPlatform() === 'ios';
      }
      return webOrientationRequired();
    },

    async requestLocationPermission() {
      if (!geo.isAvailable) {
        return { location: 'unavailable', blockingReason: LOCATION_UNAVAILABLE_MSG };
      }

      const permState = geo.queryPermissionState ? await geo.queryPermissionState() : 'unknown';
      if (permState === 'denied') {
        return { location: 'denied', blockingReason: LOCATION_BLOCKED_MSG };
      }

      if (Capacitor.isNativePlatform() && geo.requestPermission) {
        const outcome = await geo.requestPermission();
        if (outcome === 'denied') {
          return { location: 'denied', blockingReason: LOCATION_BLOCKED_MSG };
        }
      }

      return new Promise((resolve) => {
        geo.getCurrentPosition(
          () => resolve({ location: 'granted' }),
          (err) => {
            if (err?.code === 1) {
              resolve({ location: 'denied', blockingReason: LOCATION_BLOCKED_MSG });
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

      const outcome = await requestDeviceOrientationPermission();
      setStoredLiveRideOrientationOutcome(outcome);

      if (outcome === 'granted') return { orientation: 'granted' };
      if (outcome === 'denied') {
        return { orientation: 'denied', blockingReason: ORIENTATION_BLOCKED_MSG };
      }
      return { orientation: 'not_applicable' };
    },
  };
}

/** Default web permissions provider (uses browser geolocation). */
export const webPermissions = createPermissionsProvider(createGeolocation(false));
