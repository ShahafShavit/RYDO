import { Geolocation } from '@capacitor/geolocation';

/** @type {Map<string, string>} */
const nativeWatchIds = new Map();
let watchCounter = 0;

/**
 * Map Capacitor position to browser GeolocationPosition shape.
 * @param {import('@capacitor/geolocation').Position} pos
 * @returns {GeolocationPosition}
 */
function toGeolocationPosition(pos) {
  const c = pos.coords;
  return {
    coords: {
      latitude: c.latitude,
      longitude: c.longitude,
      accuracy: c.accuracy ?? null,
      altitude: c.altitude ?? null,
      altitudeAccuracy: c.altitudeAccuracy ?? null,
      heading: c.heading ?? null,
      speed: c.speed ?? null,
    },
    timestamp: pos.timestamp ?? Date.now(),
  };
}

/**
 * @param {unknown} err
 * @returns {GeolocationPositionError}
 */
function toGeolocationError(err) {
  const message =
    err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
      ? err.message
      : 'Could not read GPS';
  const code =
    message.toLowerCase().includes('denied') || message.toLowerCase().includes('permission')
      ? 1
      : message.toLowerCase().includes('timeout')
        ? 3
        : 2;
  return /** @type {GeolocationPositionError} */ ({ code, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
}

/** @type {import('./types.js').GeolocationProvider} */
export const nativeGeolocation = {
  isAvailable: true,

  watchPosition(success, error, options = {}) {
    const watchOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      maximumAge: options.maximumAge ?? 2000,
      timeout: options.timeout ?? 20000,
    };

    const clientId = String(++watchCounter);
    Geolocation.watchPosition(watchOptions, (position, err) => {
      if (err) {
        error?.(toGeolocationError(err));
        return;
      }
      if (position) success(toGeolocationPosition(position));
    })
      .then((nativeId) => {
        nativeWatchIds.set(clientId, nativeId);
      })
      .catch((err) => {
        error?.(toGeolocationError(err));
      });

    return clientId;
  },

  clearWatch(watchId) {
    const nativeId = nativeWatchIds.get(String(watchId));
    if (nativeId) {
      Geolocation.clearWatch({ id: nativeId }).catch(() => {});
      nativeWatchIds.delete(String(watchId));
    }
  },

  getCurrentPosition(success, error, options = {}) {
    Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      maximumAge: options.maximumAge ?? 2000,
      timeout: options.timeout ?? 20000,
    })
      .then((pos) => success(toGeolocationPosition(pos)))
      .catch((err) => error?.(toGeolocationError(err)));
  },

  async queryPermissionState() {
    try {
      const { location } = await Geolocation.checkPermissions();
      if (location === 'granted') return 'granted';
      if (location === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unknown';
    }
  },

  async requestPermission() {
    try {
      const { location } = await Geolocation.requestPermissions();
      if (location === 'granted') return 'granted';
      if (location === 'denied') return 'denied';
      return 'unknown';
    } catch {
      return 'denied';
    }
  },
};

/** @type {import('./types.js').GeolocationProvider} */
export const webGeolocation = {
  isAvailable: typeof navigator !== 'undefined' && Boolean(navigator.geolocation),

  watchPosition(success, error, options) {
    if (!navigator.geolocation) {
      error?.(toGeolocationError(new Error('Geolocation is not available')));
      return -1;
    }
    return navigator.geolocation.watchPosition(success, error, options);
  },

  clearWatch(watchId) {
    if (navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  },

  getCurrentPosition(success, error, options) {
    if (!navigator.geolocation) {
      error?.(toGeolocationError(new Error('Geolocation is not available')));
      return;
    }
    navigator.geolocation.getCurrentPosition(success, error, options);
  },

  async queryPermissionState() {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return /** @type {'granted' | 'denied' | 'prompt'} */ (result.state);
    } catch {
      return 'unknown';
    }
  },
};

/**
 * @param {boolean} isNative
 * @returns {import('./types.js').GeolocationProvider}
 */
export function createGeolocation(isNative) {
  return isNative ? nativeGeolocation : webGeolocation;
}
