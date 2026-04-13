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
/** rAF speed decay per second when fixes are rejected (avoids drifting on stale heading). */
export const KIN_REJECT_SPEED_DECAY_PER_S = 2.8;

/**
 * When no prior fix timestamp exists, infer Δt from distance (avoids huge implied speed on route→first-GPS jump).
 */
export function inferSeedDtSeconds(anchorLat, anchorLng, lat, lng) {
  const dM = distanceMeters(anchorLat, anchorLng, lat, lng);
  const nominal = dM / 7.5;
  return Math.max(0.35, Math.min(KIN_DT_MAX_S, nominal));
}

/**
 * Scale 0.25–1: poor reported accuracy (large meters) → smaller corrections; good accuracy → full blend.
 * @param {number|undefined|null} accuracyM `coords.accuracy` (meters), if known.
 */
export function correctionAccuracyScale(accuracyM) {
  if (!Number.isFinite(accuracyM) || accuracyM <= 0) return 1;
  return Math.min(1, Math.max(0.25, 12 / Math.max(accuracyM, 8)));
}

/**
 * Pull synthetic position toward a GPS fix (soft correction + cap per step).
 * Mutates `dr` fields `synLat` / `synLng`.
 * @param {{ accuracyM?: number|null }} [opts] — `coords.accuracy` scales blend and max step when poor GPS.
 */
export function correctSyntheticTowardGps(dr, gpsLat, gpsLng, opts = {}) {
  if (dr.synLat == null || dr.synLng == null) return;
  const d = distanceMeters(dr.synLat, dr.synLng, gpsLat, gpsLng);
  if (d < 0.05) return;
  const accScale = correctionAccuracyScale(opts.accuracyM);
  const blend = DR_CORRECTION_BLEND * accScale;
  const maxStep = DR_MAX_CORRECTION_STEP_M * accScale;
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
 * @param {number} [alpha] defaults to {@link DR_DISPLAY_EMA_ALPHA}
 */
export function stepDisplayEmaTowardSyn(dr, alpha = DR_DISPLAY_EMA_ALPHA) {
  if (dr.synLat == null || dr.synLng == null) return;
  if (dr.displayLat == null || dr.displayLng == null) {
    dr.displayLat = dr.synLat;
    dr.displayLng = dr.synLng;
    return;
  }
  const a = Math.min(1, Math.max(0, alpha));
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
export function evaluateKinematicGate(prev, incoming) {
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
  if (dtRawMs > KIN_GAP_RESEED_MS) {
    return { accept: true, reason: 'gap_reseed' };
  }

  let dtMs = dtRawMs;
  if (!Number.isFinite(dtMs) || dtMs <= 0) dtMs = 100;
  let dtS = dtMs / 1000;
  dtS = Math.min(KIN_DT_MAX_S, Math.max(KIN_DT_MIN_S, dtS));

  const { east: de, north: dn } = enuDeltaMeters(prev.lastAcceptedLat, prev.lastAcceptedLng, incoming.lat, incoming.lng);
  const dM = Math.hypot(de, dn);

  if (dM <= KIN_STATIONARY_MAX_M) {
    return { accept: true, reason: 'stationary', dtS, dM };
  }

  const vImpE = de / dtS;
  const vImpN = dn / dtS;
  const dv = Math.hypot(vImpE - prev.velEastMps, vImpN - prev.velNorthMps);
  const maxDv = KIN_A_MAX_MS2 * dtS;
  if (dv > maxDv) {
    return { accept: false, reason: 'velocity_jump', dtS, dM, dv, maxDv };
  }

  const maxDistM = KIN_V_MAX_MPS * dtS + 0.5 * KIN_A_MAX_MS2 * dtS * dtS;
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
export function updateAcceptedKinematics(dr, prevLat, prevLng, incoming, dtS, opts = {}) {
  const { east: de, north: dn } = enuDeltaMeters(prevLat, prevLng, incoming.lat, incoming.lng);
  const safeDt = Math.max(KIN_DT_MIN_S, Math.min(KIN_DT_MAX_S, dtS > 0 ? dtS : KIN_DT_MIN_S));
  let vImpE = de / safeDt;
  let vImpN = dn / safeDt;
  const maxImp = KIN_V_MAX_MPS * 1.12;
  const mag0 = Math.hypot(vImpE, vImpN);
  if (mag0 > maxImp) {
    const s = maxImp / mag0;
    vImpE *= s;
    vImpN *= s;
  }

  const a = opts.hardReseed ? 0 : KIN_VEL_SMOOTH;
  dr.velEastMps = a * dr.velEastMps + (1 - a) * vImpE;
  dr.velNorthMps = a * dr.velNorthMps + (1 - a) * vImpN;

  let speed = Math.hypot(dr.velEastMps, dr.velNorthMps);
  const hint = incoming.speedMpsHint;
  if (Number.isFinite(hint) && hint >= 0 && speed > 0.15) {
    if (Math.abs(hint - speed) < Math.max(3.5, 0.45 * Math.max(speed, hint))) {
      const blended = (1 - KIN_SPEED_HINT_BLEND) * speed + KIN_SPEED_HINT_BLEND * hint;
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
export function decaySpeedOnRejectedGps(dr, dtS) {
  if (!dr.consecutiveRejects || dr.consecutiveRejects <= 0) return;
  const k = KIN_REJECT_SPEED_DECAY_PER_S * dtS;
  dr.speedMps = Math.max(0, dr.speedMps * (1 - Math.min(0.85, k)));
}
