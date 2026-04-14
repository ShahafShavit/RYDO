/** Below this ground speed (km/h), heading follows compass only (when available). */
export const HEADING_BLEND_LOW_KMH = 5;
/** At and above this speed (km/h), heading follows GPS / course only (when available). */
export const HEADING_BLEND_HIGH_KMH = 10;

/**
 * Piecewise blend: compass below {@link HEADING_BLEND_LOW_KMH}, GPS at/above {@link HEADING_BLEND_HIGH_KMH},
 * circular interpolation in between. Uses unit vectors (not arithmetic mean of degrees).
 *
 * @param {number | null | undefined} compassDeg navigation heading from device compass, 0–360
 * @param {number | null | undefined} gpsDeg heading from GPS or course-over-ground, 0–360
 * @param {number | null | undefined} speedKmh smoothed ground speed (km/h)
 * @returns {number | null} blended heading, or null if neither source is valid
 */
export function blendHeadingBySpeedKmh(compassDeg, gpsDeg, speedKmh) {
  const c =
    compassDeg != null && Number.isFinite(compassDeg) ? ((compassDeg % 360) + 360) % 360 : null;
  const g = gpsDeg != null && Number.isFinite(gpsDeg) ? ((gpsDeg % 360) + 360) % 360 : null;
  if (c == null) return g;
  if (g == null) return c;

  const v = Number.isFinite(speedKmh) && speedKmh >= 0 ? speedKmh : 0;
  let w;
  if (v < HEADING_BLEND_LOW_KMH) w = 0;
  else if (v >= HEADING_BLEND_HIGH_KMH) w = 1;
  else {
    w =
      (v - HEADING_BLEND_LOW_KMH) /
      (HEADING_BLEND_HIGH_KMH - HEADING_BLEND_LOW_KMH);
  }

  const cr = (c * Math.PI) / 180;
  const gr = (g * Math.PI) / 180;
  const y = w * Math.sin(gr) + (1 - w) * Math.sin(cr);
  const x = w * Math.cos(gr) + (1 - w) * Math.cos(cr);
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}
