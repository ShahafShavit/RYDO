import { subscribeDeviceCompass } from '@/features/live-ride/utils/liveRideCompass';

/**
 * @typedef {object} CompassProvider
 * @property {boolean} [isNative]
 * @property {() => Promise<'granted' | 'denied' | 'prompt' | 'unknown'>} [queryPermissionState]
 * @property {() => Promise<'granted' | 'denied' | 'unknown'>} [requestPermission]
 * @property {(onHeading: (headingDeg: number) => void) => () => void} subscribe
 */

/** @type {CompassProvider | null} */
let provider = null;

/**
 * @param {CompassProvider} next
 */
export function setCompassProvider(next) {
  provider = next;
}

/** @type {CompassProvider} */
const webCompass = {
  isNative: false,
  subscribe: subscribeDeviceCompass,
};

/**
 * @returns {CompassProvider}
 */
export function getCompassProvider() {
  if (provider) return provider;
  return webCompass;
}
