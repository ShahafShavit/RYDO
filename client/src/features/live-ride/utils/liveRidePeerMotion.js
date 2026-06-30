import {
  bearingDegrees,
  correctSyntheticTowardGps,
  getSmoothedPoseLngLat,
  offsetByHeadingMeters,
  stepDisplayEmaTowardSyn,
  syncStationaryDisplayFreeze,
  updateAcceptedKinematics,
} from '@/features/live-ride/utils/liveRideDeadReckon';
import { DEFAULT_LIVE_RIDE_MOTION_TUNING } from '@/features/live-ride/utils/liveRideMotionTuning';
import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';

/**
 * @typedef {object} PeerMotionState
 * @property {boolean} initialized
 * @property {boolean} stale
 * @property {number|null} synLat
 * @property {number|null} synLng
 * @property {number|null} displayLat
 * @property {number|null} displayLng
 * @property {number} speedMps
 * @property {number|null} extrapolateHeadingDeg
 * @property {number|null} lastRafMs
 * @property {boolean} kinematicHistory
 * @property {number|null} lastAcceptedLat
 * @property {number|null} lastAcceptedLng
 * @property {number|null} lastAcceptedMs
 * @property {number|null} lastFixMs
 * @property {number} velEastMps
 * @property {number} velNorthMps
 * @property {number|null} lastAcceptedAccuracyM
 * @property {string|null} lastWireAtUtc
 * @property {{ active: boolean, snapshot: { lat: number, lng: number, bearingDeg: number | null, accuracyM: number | null } | null }} stationary
 */

/** @returns {PeerMotionState} */
export function createPeerMotionState() {
  return {
    initialized: false,
    stale: false,
    synLat: null,
    synLng: null,
    displayLat: null,
    displayLng: null,
    speedMps: 0,
    extrapolateHeadingDeg: null,
    lastRafMs: null,
    kinematicHistory: false,
    lastAcceptedLat: null,
    lastAcceptedLng: null,
    lastAcceptedMs: null,
    lastFixMs: null,
    velEastMps: 0,
    velNorthMps: 0,
    lastAcceptedAccuracyM: null,
    lastWireAtUtc: null,
    stationary: { active: false, snapshot: null },
  };
}

/**
 * @param {Record<string, number> | null | undefined} tuning
 * @returns {Record<string, number>}
 */
function peerMotionTuning(tuning) {
  const correctionBlend = pickTuning(
    tuning,
    'PEER_CORRECTION_BLEND',
    pickTuning(tuning, 'DR_CORRECTION_BLEND', DEFAULT_LIVE_RIDE_MOTION_TUNING.DR_CORRECTION_BLEND),
  );
  const displayEma = pickTuning(
    tuning,
    'PEER_DISPLAY_EMA_ALPHA',
    pickTuning(tuning, 'DR_DISPLAY_EMA_ALPHA', DEFAULT_LIVE_RIDE_MOTION_TUNING.DR_DISPLAY_EMA_ALPHA),
  );
  return {
    ...DEFAULT_LIVE_RIDE_MOTION_TUNING,
    ...tuning,
    DR_CORRECTION_BLEND: correctionBlend,
    DR_DISPLAY_EMA_ALPHA: displayEma,
  };
}

/**
 * @param {string | null | undefined} atUtc
 * @returns {number}
 */
function parseAtUtcMs(atUtc) {
  if (!atUtc) return Date.now();
  const ms = Date.parse(atUtc);
  return Number.isFinite(ms) ? ms : Date.now();
}

/**
 * @param {number | null | undefined} headingDeg
 * @param {number | null | undefined} prevLat
 * @param {number | null | undefined} prevLng
 * @param {number} lat
 * @param {number} lng
 * @returns {number | null}
 */
function resolvePeerHeadingDeg(headingDeg, prevLat, prevLng, lat, lng) {
  if (headingDeg != null && Number.isFinite(headingDeg)) return headingDeg;
  if (prevLat != null && prevLng != null && Number.isFinite(prevLat) && Number.isFinite(prevLng)) {
    return bearingDegrees(prevLat, prevLng, lat, lng);
  }
  return null;
}

/**
 * Snap peer display to wire pose (stale or seed).
 * @param {PeerMotionState} state
 * @param {{ lat: number, lng: number, headingDeg?: number | null, accuracyM?: number | null, atUtc?: string | null }} peer
 */
function snapPeerToWire(state, peer) {
  const prevLat = state.lastAcceptedLat;
  const prevLng = state.lastAcceptedLng;
  const ts = parseAtUtcMs(peer.atUtc);
  state.synLat = peer.lat;
  state.synLng = peer.lng;
  state.displayLat = peer.lat;
  state.displayLng = peer.lng;
  state.speedMps = 0;
  state.velEastMps = 0;
  state.velNorthMps = 0;
  state.lastAcceptedLat = peer.lat;
  state.lastAcceptedLng = peer.lng;
  state.lastAcceptedMs = ts;
  state.lastFixMs = ts;
  state.lastWireAtUtc = peer.atUtc ?? null;
  if (Number.isFinite(peer.accuracyM)) state.lastAcceptedAccuracyM = peer.accuracyM;
  state.extrapolateHeadingDeg = resolvePeerHeadingDeg(peer.headingDeg, prevLat, prevLng, peer.lat, peer.lng);
  state.stationary = { active: false, snapshot: null };
  state.initialized = true;
}

/**
 * Ingest a hub pose update for one peer.
 * @param {PeerMotionState} state
 * @param {{ lat: number, lng: number, headingDeg?: number | null, accuracyM?: number | null, atUtc?: string | null, isStale?: boolean }} peer
 * @param {Record<string, number> | null | undefined} [tuning]
 */
export function ingestPeerFix(state, peer, tuning) {
  const tun = peerMotionTuning(tuning);
  const ts = parseAtUtcMs(peer.atUtc);
  const isNewFix = peer.atUtc != null && peer.atUtc !== state.lastWireAtUtc;

  if (peer.isStale) {
    state.stale = true;
    snapPeerToWire(state, peer);
    return;
  }

  state.stale = false;

  if (!state.initialized || !isNewFix) {
    if (!state.initialized) {
      snapPeerToWire(state, peer);
    }
    return;
  }

  const prevLat = state.lastAcceptedLat ?? state.synLat ?? peer.lat;
  const prevLng = state.lastAcceptedLng ?? state.synLng ?? peer.lng;

  if (state.synLat == null || state.synLng == null) {
    state.synLat = peer.lat;
    state.synLng = peer.lng;
  }

  const dtMin = pickTuning(tun, 'KIN_DT_MIN_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MIN_S);
  const dtMax = pickTuning(tun, 'KIN_DT_MAX_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_DT_MAX_S);
  const gapMs = pickTuning(tun, 'KIN_GAP_RESEED_MS', DEFAULT_LIVE_RIDE_MOTION_TUNING.KIN_GAP_RESEED_MS);
  const dtRawMs =
    state.lastAcceptedMs != null && Number.isFinite(state.lastAcceptedMs) ? ts - state.lastAcceptedMs : null;
  const hardReseed = dtRawMs != null && dtRawMs > gapMs;

  let dtS = dtMin;
  if (dtRawMs != null && Number.isFinite(dtRawMs) && dtRawMs > 0) {
    dtS = Math.max(dtMin, Math.min(dtMax, dtRawMs / 1000));
  }

  correctSyntheticTowardGps(state, peer.lat, peer.lng, { accuracyM: peer.accuracyM }, tun);
  updateAcceptedKinematics(
    state,
    prevLat,
    prevLng,
    {
      lat: peer.lat,
      lng: peer.lng,
      timestampMs: ts,
      speedMpsHint: 0,
      accuracyM: peer.accuracyM,
    },
    dtS,
    { hardReseed },
    tun,
  );

  const heading = resolvePeerHeadingDeg(peer.headingDeg, prevLat, prevLng, peer.lat, peer.lng);
  if (heading != null && Number.isFinite(heading)) {
    state.extrapolateHeadingDeg = heading;
  }

  stepDisplayEmaTowardSyn(
    state,
    pickTuning(tun, 'EMA_GPS_ACCEPT', DEFAULT_LIVE_RIDE_MOTION_TUNING.EMA_GPS_ACCEPT),
    tun,
  );

  state.lastFixMs = ts;
  state.lastWireAtUtc = peer.atUtc ?? null;
  state.initialized = true;
}

/**
 * Advance one peer for a single rAF tick.
 * @param {PeerMotionState} state
 * @param {number} dtSeconds
 * @param {Record<string, number> | null | undefined} [tuning]
 * @param {number} [nowMs]
 * @returns {{ lat: number, lng: number } | null}
 */
export function stepPeerMotionFrame(state, dtSeconds, tuning, nowMs = Date.now()) {
  if (!state.initialized || state.synLat == null || state.synLng == null) return null;

  const tun = peerMotionTuning(tuning);
  const drMin = pickTuning(tun, 'DR_MIN_SPEED_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.DR_MIN_SPEED_MPS);
  const maxExtrapS = pickTuning(
    tun,
    'PEER_MAX_EXTRAPOLATE_S',
    DEFAULT_LIVE_RIDE_MOTION_TUNING.PEER_MAX_EXTRAPOLATE_S,
  );

  const sinceFixMs =
    state.lastFixMs != null && Number.isFinite(state.lastFixMs) ? nowMs - state.lastFixMs : Infinity;
  const canExtrapolate = !state.stale && sinceFixMs <= maxExtrapS * 1000;

  if (canExtrapolate && state.speedMps >= drMin && state.extrapolateHeadingDeg != null) {
    const dist = state.speedMps * dtSeconds;
    if (dist > 0) {
      const o = offsetByHeadingMeters(state.synLat, state.synLng, state.extrapolateHeadingDeg, dist);
      state.synLat = o.lat;
      state.synLng = o.lng;
    }
  }

  stepDisplayEmaTowardSyn(state, undefined, tun);

  const smooth = getSmoothedPoseLngLat(state);
  syncStationaryDisplayFreeze(
    state,
    smooth,
    state.extrapolateHeadingDeg,
    state.lastAcceptedAccuracyM,
    state.stationary,
    tun,
  );

  if (state.stationary.active && state.stationary.snapshot) {
    return { lat: state.stationary.snapshot.lat, lng: state.stationary.snapshot.lng };
  }

  if (smooth.lat == null || smooth.lng == null) return null;
  return { lat: smooth.lat, lng: smooth.lng };
}

/**
 * Read current smoothed display position without advancing motion.
 * @param {PeerMotionState} state
 * @returns {{ lat: number, lng: number } | null}
 */
export function getPeerDisplayPose(state) {
  if (!state.initialized || state.synLat == null || state.synLng == null) return null;
  if (state.stationary.active && state.stationary.snapshot) {
    return { lat: state.stationary.snapshot.lat, lng: state.stationary.snapshot.lng };
  }
  const smooth = getSmoothedPoseLngLat(state);
  if (smooth.lat == null || smooth.lng == null) return null;
  return { lat: smooth.lat, lng: smooth.lng };
}
