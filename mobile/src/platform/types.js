/**
 * @typedef {object} KeyValueStorage
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 * @property {(key: string) => void} removeItem
 */

/**
 * @typedef {object} GeolocationProvider
 * @property {boolean} isAvailable
 * @property {(
 *   success: (position: GeolocationPosition) => void,
 *   error?: (err: GeolocationPositionError) => void,
 *   options?: PositionOptions
 * ) => string | number} watchPosition
 * @property {(watchId: string | number) => void} clearWatch
 * @property {(
 *   success: (position: GeolocationPosition) => void,
 *   error?: (err: GeolocationPositionError) => void,
 *   options?: PositionOptions
 * ) => void} getCurrentPosition
 * @property {() => Promise<'granted' | 'denied' | 'prompt' | 'unknown'>} [queryPermissionState]
 * @property {() => Promise<'granted' | 'denied' | 'unknown'>} [requestPermission]
 */

/**
 * @typedef {object} PermissionsProvider
 * @property {() => Promise<{ location: 'granted' | 'denied' | 'unavailable' | 'prompt', blockingReason?: string }>} requestLocationPermission
 * @property {() => Promise<{ orientation: 'granted' | 'denied' | 'not_applicable', blockingReason?: string }>} requestOrientationPermission
 * @property {() => boolean} isOrientationPermissionRequired
 */

/**
 * @typedef {object} AppLifecycleProvider
 * @property {() => () => void} subscribeAppStateChange
 */

/**
 * @typedef {object} PlatformServices
 * @property {KeyValueStorage} storage
 * @property {GeolocationProvider} geolocation
 * @property {PermissionsProvider} permissions
 * @property {AppLifecycleProvider} [lifecycle]
 */

export {};
