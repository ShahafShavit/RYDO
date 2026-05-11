/**
 * Device orientation → navigation heading (0° = north, clockwise), or null if unknown.
 * @param {DeviceOrientationEvent} e
 * @returns {number | null}
 */
export function navigationHeadingFromDeviceOrientation(e) {
  const wh = /** @type {number | undefined} */ (e.webkitCompassHeading);
  if (wh != null && Number.isFinite(wh)) {
    return ((wh % 360) + 360) % 360;
  }
  if (e.absolute && e.alpha != null && Number.isFinite(e.alpha)) {
    let h = 360 - e.alpha;
    return ((h % 360) + 360) % 360;
  }
  return null;
}

/**
 * iOS 13+ Safari: must be called from a user gesture. Resolves permission state.
 * @returns {Promise<'granted' | 'denied' | 'not_applicable'>}
 */
export async function requestDeviceOrientationPermission() {
  const Ctor = typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined;
  if (!Ctor || typeof Ctor.requestPermission !== 'function') {
    return 'not_applicable';
  }
  try {
    const result = await Ctor.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Subscribe to device orientation (absolute when the browser supports it).
 * @param {(headingDeg: number) => void} onHeading
 * @returns {() => void} unsubscribe
 */
export function subscribeDeviceCompass(onHeading) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let lastTs = 0;
  /** @param {DeviceOrientationEvent} e */
  const handler = (e) => {
    const ts = Number.isFinite(e.timeStamp) ? e.timeStamp : 0;
    if (ts > 0 && ts === lastTs) return;
    lastTs = ts;
    const h = navigationHeadingFromDeviceOrientation(e);
    if (h != null && Number.isFinite(h)) onHeading(h);
  };

  // Listen to both: some browsers emit one more frequently than the other.
  window.addEventListener('deviceorientationabsolute', handler, true);
  window.addEventListener('deviceorientation', handler, true);
  return () => {
    window.removeEventListener('deviceorientationabsolute', handler, true);
    window.removeEventListener('deviceorientation', handler, true);
  };
}
