/** @typedef {import('@/shared/platform/geolocation-provider').GeolocationProvider} GeolocationProvider */

/** @type {GeolocationProvider | null} */
let provider = null;

/**
 * Inject geolocation implementation (Capacitor on native, browser on web).
 * @param {GeolocationProvider} next
 */
export function setGeolocationProvider(next) {
  provider = next;
}

/**
 * @returns {GeolocationProvider}
 */
export function getGeolocationProvider() {
  if (provider) return provider;

  const browser =
    typeof navigator !== 'undefined' && navigator.geolocation
      ? {
          isAvailable: true,
          watchPosition: (...args) => navigator.geolocation.watchPosition(...args),
          clearWatch: (id) => navigator.geolocation.clearWatch(id),
          getCurrentPosition: (...args) => navigator.geolocation.getCurrentPosition(...args),
          queryPermissionState: async () => {
            if (!navigator.permissions?.query) return 'unknown';
            try {
              const result = await navigator.permissions.query({ name: 'geolocation' });
              return /** @type {'granted' | 'denied' | 'prompt'} */ (result.state);
            } catch {
              return 'unknown';
            }
          },
        }
      : {
          isAvailable: false,
          watchPosition: (_s, error) => {
            error?.({ code: 2, message: 'Geolocation is not available', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
            return -1;
          },
          clearWatch: () => {},
          getCurrentPosition: (_s, error) => {
            error?.({ code: 2, message: 'Geolocation is not available', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
          },
        };

  return browser;
}
