import { CapgoCompass } from '@capgo/capacitor-compass';

/** @type {number} */
let subscriberCount = 0;

/**
 * @param {number} value
 * @returns {number}
 */
function normalizeHeading(value) {
  return ((value % 360) + 360) % 360;
}

/** @type {import('@/shared/platform/compass-provider').CompassProvider} */
export const nativeCompass = {
  isNative: true,

  async queryPermissionState() {
    try {
      const { compass } = await CapgoCompass.checkPermissions();
      if (compass === 'granted') return 'granted';
      if (compass === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unknown';
    }
  },

  async requestPermission() {
    try {
      const { compass } = await CapgoCompass.requestPermissions();
      if (compass === 'granted') return 'granted';
      if (compass === 'denied') return 'denied';
      return 'unknown';
    } catch {
      return 'denied';
    }
  },

  subscribe(onHeading) {
    subscriberCount += 1;
    let removed = false;

    const listenerPromise = CapgoCompass.addListener('headingChange', (event) => {
      if (Number.isFinite(event.value)) {
        onHeading(normalizeHeading(event.value));
      }
    });

    if (subscriberCount === 1) {
      CapgoCompass.startListening().catch(() => {});
    }

    return () => {
      if (removed) return;
      removed = true;
      subscriberCount -= 1;
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
      if (subscriberCount <= 0) {
        subscriberCount = 0;
        CapgoCompass.stopListening().catch(() => {});
      }
    };
  },
};
