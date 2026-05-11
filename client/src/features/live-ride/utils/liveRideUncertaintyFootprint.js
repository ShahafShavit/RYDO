import { offsetByHeadingMeters } from '@/features/live-ride/utils/liveRideDeadReckon';
import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';
import { DEFAULT_LIVE_RIDE_MOTION_TUNING } from '@/features/live-ride/utils/liveRideMotionTuning';

/**
 * @param {number} t
 * @param {number} a
 * @param {number} b
 */
function lerp(t, a, b) {
  return a + (b - a) * t;
}

/**
 * @param {number} x
 * @param {number} edge0
 * @param {number} edge1
 */
function smoothstep(x, edge0, edge1) {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Preview-only uncertainty footprint: circle when speed is below the stationary threshold; otherwise a circular
 * sector (cone) aligned with `bearingDeg`. If `bearingDeg` is null while moving, falls back to a circle.
 *
 * @param {object} p
 * @param {number} p.lat
 * @param {number} p.lng
 * @param {number | null | undefined} p.bearingDeg navigation CW from north
 * @param {number | null | undefined} p.speedMps smoothed speed (DR)
 * @param {Record<string, number> | null | undefined} [p.tuning]
 * @returns {import('geojson').Feature<import('geojson').Polygon> | null}
 */
export function buildUncertaintyFootprintPolygon({ lat, lng, bearingDeg, speedMps, tuning }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const tun = tuning ?? DEFAULT_LIVE_RIDE_MOTION_TUNING;
  const stopMps = pickTuning(tun, 'MIN_MAP_MOTION_SPEED_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.MIN_MAP_MOTION_SPEED_MPS);
  const fullMps = pickTuning(
    tun,
    'PREVIEW_UNCERTAINTY_SPEED_FULL_MPS',
    DEFAULT_LIVE_RIDE_MOTION_TUNING.PREVIEW_UNCERTAINTY_SPEED_FULL_MPS,
  );
  const v = Number.isFinite(speedMps) && speedMps >= 0 ? speedMps : 0;

  const diam = pickTuning(
    tun,
    'PREVIEW_UNCERTAINTY_STATIONARY_DIAMETER_M',
    DEFAULT_LIVE_RIDE_MOTION_TUNING.PREVIEW_UNCERTAINTY_STATIONARY_DIAMETER_M,
  );
  const rCircle = Math.max(1, diam * 0.5);

  if (v < stopMps || bearingDeg == null || !Number.isFinite(bearingDeg)) {
    return circlePolygonFeature(lat, lng, rCircle);
  }

  const tMove = smoothstep(v, stopMps, fullMps);
  const halfMin = pickTuning(
    tun,
    'PREVIEW_UNCERTAINTY_HALF_ANGLE_MIN_DEG',
    DEFAULT_LIVE_RIDE_MOTION_TUNING.PREVIEW_UNCERTAINTY_HALF_ANGLE_MIN_DEG,
  );
  const halfMax = pickTuning(
    tun,
    'PREVIEW_UNCERTAINTY_HALF_ANGLE_MAX_DEG',
    DEFAULT_LIVE_RIDE_MOTION_TUNING.PREVIEW_UNCERTAINTY_HALF_ANGLE_MAX_DEG,
  );
  const rangeM = lerp(
    tMove,
    pickTuning(tun, 'PREVIEW_UNCERTAINTY_RANGE_MIN_M', DEFAULT_LIVE_RIDE_MOTION_TUNING.PREVIEW_UNCERTAINTY_RANGE_MIN_M),
    pickTuning(tun, 'PREVIEW_UNCERTAINTY_RANGE_MAX_M', DEFAULT_LIVE_RIDE_MOTION_TUNING.PREVIEW_UNCERTAINTY_RANGE_MAX_M),
  );

  const halfAngle = lerp(tMove, halfMax, halfMin);
  const half = Math.max(1, Math.min(89, halfAngle));

  const steps = Math.max(8, Math.ceil((2 * half) / 4));
  /** @type {[number, number][]} */
  const ring = [[lng, lat]];

  const b0 = bearingDeg - half;
  const b1 = bearingDeg + half;
  for (let i = 0; i <= steps; i += 1) {
    const b = b0 + ((b1 - b0) * i) / steps;
    const o = offsetByHeadingMeters(lat, lng, b, rangeM);
    ring.push([o.lng, o.lat]);
  }
  ring.push([lng, lat]);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusM
 * @returns {import('geojson').Feature<import('geojson').Polygon>}
 */
function circlePolygonFeature(lat, lng, radiusM) {
  const n = 48;
  /** @type {[number, number][]} */
  const ring = [];
  for (let i = 0; i <= n; i += 1) {
    const bearing = (360 * i) / n;
    const o = offsetByHeadingMeters(lat, lng, bearing, radiusM);
    ring.push([o.lng, o.lat]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}
