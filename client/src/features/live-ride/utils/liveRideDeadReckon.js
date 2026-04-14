import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';
import { DEFAULT_LIVE_RIDE_MOTION_TUNING } from '@/features/live-ride/utils/liveRideMotionTuning';

/** Earth mean radius (meters). */
const R_EARTH = 6371008.8;

/**
 * Initial bearing from point A to B in degrees, 0 = north, clockwise (navigation).
 */
export function bearingDegrees(lat0, lng0, lat1, lng1) {
  const φ1 = (lat0 * Math.PI) / 180;
  const φ2 = (lat1 * Math.PI) / 180;
  const Δλ = ((lng1 - lng0) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = (Math.atan2(y, x) * 180) / Math.PI;
  θ = (θ + 360) % 360;
  return θ;
}

/**
 * Move from (lat, lng) by `distanceM` along `headingDeg` (navigation: 0 = north).
 */
export function offsetByHeadingMeters(lat, lng, headingDeg, distanceM) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(headingDeg) || !Number.isFinite(distanceM) || distanceM <= 0) {
    return { lat, lng };
  }
  const δ = distanceM / R_EARTH;
  const θ = (headingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return {
    lat: (φ2 * 180) / Math.PI,
    lng: ((((λ2 * 180) / Math.PI) + 540) % 360) - 180,
  };
}

/**
 * Haversine distance in meters (short-range).
 */
export function distanceMeters(lat0, lng0, lat1, lng1) {
  const φ1 = (lat0 * Math.PI) / 180;
  const φ2 = (lat1 * Math.PI) / 180;
  const Δφ = ((lat1 - lat0) * Math.PI) / 180;
  const Δλ = ((lng1 - lng0) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_EARTH * c;
}

/** Local ENU offset in meters from (lat0,lng0) to (lat1,lng1); small distances only. */
export function enuDeltaMeters(lat0, lng0, lat1, lng1) {
  const dLat = ((lat1 - lat0) * Math.PI) / 180;
  const dLng = ((lng1 - lng0) * Math.PI) / 180;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  const north = dLat * R_EARTH;
  const east = dLng * R_EARTH * cosLat;
  return { east, north };
}

/**
 * Shortest signed angle from `fromDeg` to `toDeg` (degrees, navigation clockwise), in (-180, 180].
 */
export function shortestSignedAngleDeg(fromDeg, toDeg) {
  if (!Number.isFinite(fromDeg) || !Number.isFinite(toDeg)) return 0;
  let d = toDeg - fromDeg;
  d = ((d + 540) % 360) - 180;
  return d;
}

/**
 * Rotate `currentDeg` toward `targetDeg` by a fraction `alpha` of the shortest arc (0–1).
 * Returns normalized heading in [0, 360).
 */
export function stepAngleTowardDeg(currentDeg, targetDeg, alpha) {
  if (!Number.isFinite(targetDeg)) return Number.isFinite(currentDeg) ? ((currentDeg % 360) + 360) % 360 : null;
  if (!Number.isFinite(currentDeg)) return ((targetDeg % 360) + 360) % 360;
  const a = Math.min(1, Math.max(0, alpha));
  const delta = shortestSignedAngleDeg(currentDeg, targetDeg);
  let next = currentDeg + a * delta;
  next = ((next % 360) + 360) % 360;
  return next;
}

/** Below this smoothed speed (m/s), freeze puck/camera/hub jitter (~2 km/h). */
export const MIN_MAP_MOTION_SPEED_MPS = 2 / 3.6;
/** Leave stationary display when speed exceeds this (hysteresis, ~1.15× {@link MIN_MAP_MOTION_SPEED_MPS}). */
export const MIN_MAP_MOTION_SPEED_EXIT_MPS = MIN_MAP_MOTION_SPEED_MPS * 1.15;
/**
 * Heading display smoothing: fraction of the shortest turn per “nominal” 60 Hz frame.
 * Scaled by `dt` in {@link stepDisplayHeadingTowardTarget} for frame-rate independence.
 */
export const HEADING_DISPLAY_SMOOTH = 0.02;

/**
 * Low-pass `dr.displayHeadingDeg` toward `dr.extrapolateHeadingDeg` (call from rAF with real `dtSeconds`).
 * Mutates `dr.displayHeadingDeg`; leaves it unset if there is no valid target.
 */
export function stepDisplayHeadingTowardTarget(dr, dtSeconds, tuning) {
  const hds = pickTuning(tuning, 'HEADING_DISPLAY_SMOOTH', DEFAULT_LIVE_RIDE_MOTION_TUNING.HEADING_DISPLAY_SMOOTH);
  const target = dr.extrapolateHeadingDeg;
  if (target == null || !Number.isFinite(target)) {
    return;
  }
  const dt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? dtSeconds : 1 / 60;
  const a = Math.min(1, hds * (dt / (1 / 60)));
  if (dr.displayHeadingDeg == null || !Number.isFinite(dr.displayHeadingDeg)) {
    dr.displayHeadingDeg = ((target % 360) + 360) % 360;
    return;
  }
  dr.displayHeadingDeg = stepAngleTowardDeg(dr.displayHeadingDeg, target, a);
}

/**
 * Hysteresis for map/camera/hub freeze when smoothed speed is near stationary.
 * Mutates `state` `{ active: boolean, snapshot: { lat, lng, bearingDeg, accuracyM } | null }`.
 */
export function syncStationaryDisplayFreeze(dr, pose, bearingDeg, accuracyM, state, tuning) {
  const v = Number.isFinite(dr.speedMps) ? dr.speedMps : 0;
  const minIn = pickTuning(tuning, 'MIN_MAP_MOTION_SPEED_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.MIN_MAP_MOTION_SPEED_MPS);
  const minOut = pickTuning(tuning, 'MIN_MAP_MOTION_SPEED_EXIT_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.MIN_MAP_MOTION_SPEED_EXIT_MPS);
  if (!state.active) {
    if (v < minIn) {
      state.active = true;
      state.snapshot = {
        lat: pose.lat,
        lng: pose.lng,
        bearingDeg,
        accuracyM: accuracyM ?? null,
      };
    }
  } else if (v >= minOut) {
    state.active = false;
    state.snapshot = null;
  }
  return state.active;
}

export const DR_MIN_SPEED_MPS = 0.35;
/** Base fraction of error closed toward GPS per accepted fix (scaled by accuracy in `correctSyntheticTowardGps`). */
export const DR_CORRECTION_BLEND = 0.42;
/** Base max meters moved toward GPS in one fix (scaled by accuracy). */
export const DR_MAX_CORRECTION_STEP_M = 16;
/**
 * Per-frame EMA toward `syn*` for puck / camera / sendPose (rAF). Higher = snappier, lower = smoother.
 */
export const DR_DISPLAY_EMA_ALPHA = 0.2;

/** ~2.5g lateral/longitudinal cap for plausible cyclist acceleration (m/s²). */
export const KIN_A_MAX_MS2 = 24.5;
export const KIN_DT_MIN_S = 0.05;
export const KIN_DT_MAX_S = 8;
/** After this gap (ms), accept next fix and re-seed velocity (app background / GPS stall). */
export const KIN_GAP_RESEED_MS = 10_000;
/** Cycling-oriented speed ceiling for max displacement bound (m/s). */
export const KIN_V_MAX_MPS = 35;
/** Ignore sub-meter jitter as “stationary” for gating. */
export const KIN_STATIONARY_MAX_M = 2;
/** Smoothing for velocity components after an accepted fix (0 = only implied, 1 = keep old). */
export const KIN_VEL_SMOOTH = 0.42;
/** When GPS speed agrees with implied speed (m/s), blend toward GPS magnitude. */
export const KIN_SPEED_HINT_BLEND = 0.38;
/** Ignore speed-hint blending when both implied and hinted speeds are near-stationary. */
export const KIN_SPEED_HINT_MIN_MPS = 0.9;
/** rAF speed decay per second when fixes are rejected (avoids drifting on stale heading). */
export const KIN_REJECT_SPEED_DECAY_PER_S = 2.8;

/**
 * When no prior fix timestamp exists, infer Δt from distance (avoids huge implied speed on route→first-GPS jump).
 */
export function inferSeedDtSeconds(anchorLat, anchorLng, lat, lng, tuning) {
  const dM = distanceMeters(anchorLat, anchorLng, lat, lng);
  const vImpl = pickTuning(tuning, 'INFER_SEED_IMPLIED_SPEED_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.INFER_SEED_IMPLIED_SPEED_MPS);
  const floor = pickTuning(tuning, 'INFER_SEED_DT_FLOOR_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.INFER_SEED_DT_FLOOR_S);
  const dtMax = pickTuning(tuning, 'KIN_DT_MAX_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MAX_S);
  const nominal = dM / Math.max(0.5, vImpl);
  return Math.max(floor, Math.min(dtMax, nominal));
}

/**
 * Scale 0.25–1: poor reported accuracy (large meters) → smaller corrections; good accuracy → full blend.
 * @param {number|undefined|null} accuracyM `coords.accuracy` (meters), if known.
 */
export function correctionAccuracyScale(accuracyM, tuning) {
  const num = pickTuning(tuning, 'ACC_SCALE_NUMERATOR', DEFAULT_LIVE_RIDE_MOTION_TUNING.ACC_SCALE_NUMERATOR);
  const floor = pickTuning(tuning, 'ACC_SCALE_FLOOR_M', DEFAULT_LIVE_RIDE_MOTION_TUNING.ACC_SCALE_FLOOR_M);
  const lo = pickTuning(tuning, 'ACC_SCALE_MIN', DEFAULT_LIVE_RIDE_MOTION_TUNING.ACC_SCALE_MIN);
  if (!Number.isFinite(accuracyM) || accuracyM <= 0) return 1;
  return Math.min(1, Math.max(lo, num / Math.max(accuracyM, floor)));
}

/**
 * Pull synthetic position toward a GPS fix (soft correction + cap per step).
 * Mutates `dr` fields `synLat` / `synLng`.
 * @param {{ accuracyM?: number|null }} [opts] — `coords.accuracy` scales blend and max step when poor GPS.
 */
export function correctSyntheticTowardGps(dr, gpsLat, gpsLng, opts = {}, tuning) {
  if (dr.synLat == null || dr.synLng == null) return;
  const d = distanceMeters(dr.synLat, dr.synLng, gpsLat, gpsLng);
  if (d < 0.05) return;
  const accScale = correctionAccuracyScale(opts.accuracyM, tuning);
  const drBlend = pickTuning(tuning, 'DR_CORRECTION_BLEND', DEFAULT_LIVE_RIDE_MOTION_TUNING.DR_CORRECTION_BLEND);
  const drMax = pickTuning(tuning, 'DR_MAX_CORRECTION_STEP_M', DEFAULT_LIVE_RIDE_MOTION_TUNING.DR_MAX_CORRECTION_STEP_M);
  const blend = drBlend * accScale;
  const maxStep = drMax * accScale;
  const step = Math.min(d * blend, maxStep);
  const b = bearingDegrees(dr.synLat, dr.synLng, gpsLat, gpsLng);
  const o = offsetByHeadingMeters(dr.synLat, dr.synLng, b, step);
  dr.synLat = o.lat;
  dr.synLng = o.lng;
}

/**
 * Smoothed lat/lng for display and hub; follows `syn*` with EMA in `stepDisplayEmaTowardSyn`.
 */
export function getSmoothedPoseLngLat(dr) {
  const lat = dr.displayLat ?? dr.synLat;
  const lng = dr.displayLng ?? dr.synLng;
  return { lat, lng };
}

/**
 * Low-pass display position toward kinematic `syn*` (call from rAF).
 * @param {number | undefined} [alpha] explicit blend; if omitted, uses `DR_DISPLAY_EMA_ALPHA` from `tuning` or default.
 * @param {Record<string, number> | null | undefined} [tuning] preview overrides (`/live` panel).
 */
export function stepDisplayEmaTowardSyn(dr, alpha, tuning) {
  const defA = pickTuning(tuning, 'DR_DISPLAY_EMA_ALPHA', DEFAULT_LIVE_RIDE_MOTION_TUNING.DR_DISPLAY_EMA_ALPHA);
  const aIn = alpha != null && Number.isFinite(alpha) ? alpha : defA;
  if (dr.synLat == null || dr.synLng == null) return;
  if (dr.displayLat == null || dr.displayLng == null) {
    dr.displayLat = dr.synLat;
    dr.displayLng = dr.synLng;
    return;
  }
  const a = Math.min(1, Math.max(0, aIn));
  dr.displayLat += a * (dr.synLat - dr.displayLat);
  dr.displayLng += a * (dr.synLng - dr.displayLng);
}

/**
 * @typedef {object} KinematicPrev
 * @property {boolean} kinematicHistory
 * @property {number|null} lastAcceptedLat
 * @property {number|null} lastAcceptedLng
 * @property {number|null} lastAcceptedMs
 * @property {number} velEastMps
 * @property {number} velNorthMps
 */

/**
 * @typedef {object} KinematicIncoming
 * @property {number} lat
 * @property {number} lng
 * @property {number} timestampMs
 * @property {number} speedMpsHint
 */

/**
 * @returns {{ accept: boolean, reason: string, dtS?: number, dM?: number, dv?: number, maxDv?: number, maxDistM?: number }}
 */
export function evaluateKinematicGate(prev, incoming, tuning) {
  const gapMs = pickTuning(tuning, 'KIN_GAP_RESEED_MS', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_GAP_RESEED_MS);
  const dtMin = pickTuning(tuning, 'KIN_DT_MIN_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MIN_S);
  const dtMax = pickTuning(tuning, 'KIN_DT_MAX_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MAX_S);
  const statM = pickTuning(tuning, 'KIN_STATIONARY_MAX_M', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_STATIONARY_MAX_M);
  const aMax = pickTuning(tuning, 'KIN_A_MAX_MS2', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_A_MAX_MS2);
  const vMax = pickTuning(tuning, 'KIN_V_MAX_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_V_MAX_MPS);

  if (!prev.kinematicHistory) {
    return { accept: true, reason: 'seed' };
  }
  if (
    prev.lastAcceptedLat == null ||
    prev.lastAcceptedLng == null ||
    prev.lastAcceptedMs == null ||
    !Number.isFinite(prev.lastAcceptedMs)
  ) {
    return { accept: true, reason: 'seed_state' };
  }

  const dtRawMs = incoming.timestampMs - prev.lastAcceptedMs;
  if (dtRawMs > gapMs) {
    return { accept: true, reason: 'gap_reseed' };
  }

  let dtMs = dtRawMs;
  if (!Number.isFinite(dtMs) || dtMs <= 0) dtMs = 100;
  let dtS = dtMs / 1000;
  dtS = Math.min(dtMax, Math.max(dtMin, dtS));

  const { east: de, north: dn } = enuDeltaMeters(prev.lastAcceptedLat, prev.lastAcceptedLng, incoming.lat, incoming.lng);
  const dM = Math.hypot(de, dn);

  if (dM <= statM) {
    return { accept: true, reason: 'stationary', dtS, dM };
  }

  const vImpE = de / dtS;
  const vImpN = dn / dtS;
  const dv = Math.hypot(vImpE - prev.velEastMps, vImpN - prev.velNorthMps);
  const maxDv = aMax * dtS;
  if (dv > maxDv) {
    return { accept: false, reason: 'velocity_jump', dtS, dM, dv, maxDv };
  }

  const maxDistM = vMax * dtS + 0.5 * aMax * dtS * dtS;
  if (dM > maxDistM) {
    return { accept: false, reason: 'distance_jump', dtS, dM, maxDistM };
  }

  return { accept: true, reason: 'ok', dtS, dM };
}

/**
 * After an accepted GPS fix: update last accepted point, smoothed ENU velocity, and scalar speed for rAF.
 * Mutates `dr` (syn* already corrected). `prevLat`/`prevLng` are last accepted position before this fix.
 * @param {{ hardReseed?: boolean }} [opts] — after a long gap, set `hardReseed` so velocity follows implied motion, not stale smoothing.
 */
export function updateAcceptedKinematics(dr, prevLat, prevLng, incoming, dtS, opts = {}, tuning) {
  const dtMin = pickTuning(tuning, 'KIN_DT_MIN_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MIN_S);
  const dtMax = pickTuning(tuning, 'KIN_DT_MAX_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MAX_S);
  const vMax = pickTuning(tuning, 'KIN_V_MAX_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_V_MAX_MPS);
  const vMaxScale = pickTuning(tuning, 'KIN_V_MAX_HINT_SCALE', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_V_MAX_HINT_SCALE);
  const velSm = pickTuning(tuning, 'KIN_VEL_SMOOTH', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_VEL_SMOOTH);
  const hintBlend = pickTuning(tuning, 'KIN_SPEED_HINT_BLEND', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_SPEED_HINT_BLEND);
  const hintMin = pickTuning(tuning, 'KIN_SPEED_HINT_MIN_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_SPEED_HINT_MIN_MPS);
  const agreeBase = pickTuning(tuning, 'KIN_HINT_AGREE_MAX_DV_BASE', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_HINT_AGREE_MAX_DV_BASE);
  const agreeFrac = pickTuning(tuning, 'KIN_HINT_AGREE_FRAC', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_HINT_AGREE_FRAC);

  const { east: de, north: dn } = enuDeltaMeters(prevLat, prevLng, incoming.lat, incoming.lng);
  const safeDt = Math.max(dtMin, Math.min(dtMax, dtS > 0 ? dtS : dtMin));
  let vImpE = de / safeDt;
  let vImpN = dn / safeDt;
  const maxImp = vMax * vMaxScale;
  const mag0 = Math.hypot(vImpE, vImpN);
  if (mag0 > maxImp) {
    const s = maxImp / mag0;
    vImpE *= s;
    vImpN *= s;
  }

  const a = opts.hardReseed ? 0 : velSm;
  dr.velEastMps = a * dr.velEastMps + (1 - a) * vImpE;
  dr.velNorthMps = a * dr.velNorthMps + (1 - a) * vImpN;

  let speed = Math.hypot(dr.velEastMps, dr.velNorthMps);
  const hint = incoming.speedMpsHint;
  if (Number.isFinite(hint) && hint >= hintMin && speed >= hintMin) {
    if (Math.abs(hint - speed) < Math.max(agreeBase, agreeFrac * Math.max(speed, hint))) {
      const blended = (1 - hintBlend) * speed + hintBlend * hint;
      const scale = blended / speed;
      dr.velEastMps *= scale;
      dr.velNorthMps *= scale;
      speed = blended;
    }
  }

  dr.speedMps = speed;
  dr.lastAcceptedLat = dr.synLat;
  dr.lastAcceptedLng = dr.synLng;
  dr.lastAcceptedMs = incoming.timestampMs;
  if (Number.isFinite(incoming.accuracyM)) {
    dr.lastAcceptedAccuracyM = incoming.accuracyM;
  }
  dr.kinematicHistory = true;
  dr.consecutiveRejects = 0;
}

/**
 * Apply rAF decay to speed when recent fixes were rejected (mutates dr.speedMps).
 */
export function decaySpeedOnRejectedGps(dr, dtS, tuning) {
  if (!dr.consecutiveRejects || dr.consecutiveRejects <= 0) return;
  const decay = pickTuning(tuning, 'KIN_REJECT_SPEED_DECAY_PER_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_REJECT_SPEED_DECAY_PER_S);
  const cap = pickTuning(tuning, 'DECAY_REJECT_BLEND_CAP', DEFAULT_LIVE_RIDE_MOTION_TUNING.DECAY_REJECT_BLEND_CAP);
  const k = decay * dtS;
  dr.speedMps = Math.max(0, dr.speedMps * (1 - Math.min(cap, k)));
}
