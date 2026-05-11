import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';
import { DEFAULT_LIVE_RIDE_MOTION_TUNING } from '@/features/live-ride/utils/liveRideMotionTuning';

/** Below this ground speed (km/h), heading follows compass only (when available). */
export const HEADING_BLEND_LOW_KMH = 5;
/** At and above this speed (km/h), heading follows GPS / course only (when available). */
export const HEADING_BLEND_HIGH_KMH = 10;

/**
 * GPS / course weight in [0, 1] for the circular blend (0 = compass only, 1 = GPS only).
 * Matches breakpoints in {@link blendHeadingBySpeedKmh}.
 *
 * @param {number | null | undefined} speedKmh
 * @param {Record<string, number> | null | undefined} [tuning]
 * @returns {number}
 */
export function getHeadingBlendWeight(speedKmh, tuning) {
  const low = pickTuning(tuning, 'HEADING_BLEND_LOW_KMH', DEFAULT_LIVE_RIDE_MOTION_TUNING.HEADING_BLEND_LOW_KMH);
  const high = pickTuning(tuning, 'HEADING_BLEND_HIGH_KMH', DEFAULT_LIVE_RIDE_MOTION_TUNING.HEADING_BLEND_HIGH_KMH);
  const v = Number.isFinite(speedKmh) && speedKmh >= 0 ? speedKmh : 0;
  if (v < low) return 0;
  if (v >= high) return 1;
  return (v - low) / Math.max(1e-6, high - low);
}

/**
 * Piecewise blend: compass below {@link HEADING_BLEND_LOW_KMH}, GPS at/above {@link HEADING_BLEND_HIGH_KMH},
 * circular interpolation in between. Uses unit vectors (not arithmetic mean of degrees).
 *
 * Below the low speed threshold, only device compass is used; if compass is unavailable, returns `null`
 * (no GPS/course fallback — matches `/live` replay without compass).
 *
 * @param {number | null | undefined} compassDeg navigation heading from device compass, 0–360
 * @param {number | null | undefined} gpsDeg heading from GPS or course-over-ground, 0–360
 * @param {number | null | undefined} speedKmh smoothed ground speed (km/h)
 * @param {Record<string, number> | null | undefined} [tuning]
 * @returns {number | null} blended heading, or null if neither source is valid at this speed
 */
export function blendHeadingBySpeedKmh(compassDeg, gpsDeg, speedKmh, tuning) {
  const low = pickTuning(tuning, 'HEADING_BLEND_LOW_KMH', DEFAULT_LIVE_RIDE_MOTION_TUNING.HEADING_BLEND_LOW_KMH);
  const high = pickTuning(tuning, 'HEADING_BLEND_HIGH_KMH', DEFAULT_LIVE_RIDE_MOTION_TUNING.HEADING_BLEND_HIGH_KMH);
  const c =
    compassDeg != null && Number.isFinite(compassDeg) ? ((compassDeg % 360) + 360) % 360 : null;
  const g = gpsDeg != null && Number.isFinite(gpsDeg) ? ((gpsDeg % 360) + 360) % 360 : null;

  const v = Number.isFinite(speedKmh) && speedKmh >= 0 ? speedKmh : 0;

  if (v < low) {
    return c;
  }

  if (c == null) return g;
  if (g == null) return c;

  const w = v >= high ? 1 : (v - low) / Math.max(1e-6, high - low);

  const cr = (c * Math.PI) / 180;
  const gr = (g * Math.PI) / 180;
  const y = w * Math.sin(gr) + (1 - w) * Math.sin(cr);
  const x = w * Math.cos(gr) + (1 - w) * Math.cos(cr);
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}
