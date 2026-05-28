import { isRideLiveLogEnabled, rideLiveLog, rideLiveWarn } from '@/features/live-ride/utils/rideLiveLog';
import { POSE_HEARTBEAT_MS } from '@/features/live-ride/connectivity/rideLiveTiming';

/** @typedef {'idle'|'disabled'|'no_token'|'connecting'|'syncing'|'joined'|'reconnecting'|'offline'|'error'} TransportState */

/**
 * @param {TransportState} state
 * @returns {boolean}
 */
export function canSendPose(state) {
  return state === 'joined';
}

/**
 * @param {TransportState} state
 * @returns {boolean}
 */
export function peersSnapshotUncertain(state) {
  return state === 'syncing' || state === 'reconnecting';
}

/**
 * @param {TransportState} state
 * @returns {string | null}
 */
export function hubChipLabel(state) {
  switch (state) {
    case 'joined':
      return 'Live';
    case 'connecting':
      return 'Connecting…';
    case 'syncing':
      return 'Syncing riders…';
    case 'reconnecting':
      return 'Reconnecting…';
    case 'offline':
      return 'Disconnected';
    case 'error':
      return 'Connection failed';
    case 'no_token':
    case 'disabled':
      return 'No Connection';
    default:
      return 'Connecting…';
  }
}

/**
 * @param {TransportState} state
 * @param {{ type: string, reason?: string }} event
 * @returns {TransportState}
 */
export function transportReducer(state, event) {
  const next = transportReducerCore(state, event);
  if (next !== state && isRideLiveLogEnabled() && isSignificantTransportTransition(state, next)) {
    rideLiveLog('transport state', {
      machine: 'transport',
      from: state,
      to: next,
      event: event.type,
      reason: event.reason ?? event.type,
    });
  }
  return next;
}

/** @param {TransportState} from @param {TransportState} to */
function isSignificantTransportTransition(from, to) {
  if (to === 'reconnecting' || to === 'offline' || to === 'error') return true;
  if (to === 'joined' && (from === 'reconnecting' || from === 'offline' || from === 'error' || from === 'syncing'))
    return true;
  return false;
}

/**
 * @param {TransportState} state
 * @param {{ type: string }} event
 * @returns {TransportState}
 */
function transportReducerCore(state, event) {
  switch (event.type) {
    case 'DISABLE':
      return 'disabled';
    case 'NO_TOKEN':
      return 'no_token';
    case 'START':
      return state === 'idle' || state === 'offline' || state === 'error' ? 'connecting' : state;
    case 'SIGNALR_STARTED':
      return 'syncing';
    case 'JOIN_OK':
      return 'joined';
    case 'JOIN_FAIL':
      return 'error';
    case 'RECONNECTING':
      return 'reconnecting';
    case 'RECONNECTED':
      return 'syncing';
    case 'CLOSED':
      return 'offline';
    case 'RETRY':
      return 'connecting';
    case 'CLEANUP':
      return 'idle';
    default:
      return state;
  }
}

function isValidPoseCoords(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/** SignalR may use camelCase or PascalCase depending on server JSON options. */
export function normalizeHubRider(r) {
  if (r == null) return null;
  const userId = r.userId ?? r.UserId;
  if (userId == null) return null;
  const lat = Number(r.lat ?? r.Lat);
  const lng = Number(r.lng ?? r.Lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    if (isRideLiveLogEnabled()) {
      rideLiveWarn('normalizeHubRider dropped rider (bad lat/lng)', {
        userId,
        lat: r.lat ?? r.Lat,
        lng: r.lng ?? r.Lng,
        keys: r && typeof r === 'object' ? Object.keys(r) : [],
      });
    }
    return null;
  }
  const rawStale = r.isStale ?? r.IsStale;
  const isStale = rawStale === true || rawStale === 'true';
  return {
    userId: Number(userId),
    displayName: r.displayName ?? r.DisplayName ?? '',
    avatarUrl: r.avatarUrl ?? r.AvatarUrl ?? null,
    lat,
    lng,
    headingDeg: r.headingDeg ?? r.HeadingDeg ?? null,
    accuracyM: r.accuracyM ?? r.AccuracyM ?? null,
    atUtc: r.atUtc ?? r.AtUtc ?? null,
    isStale,
  };
}

/**
 * @param {unknown} payload
 * @param {number | null} myId
 */
export function peersFromRidersState(payload, myId) {
  const riders = Array.isArray(payload?.riders) ? payload.riders : [];
  const m = new Map();
  for (const r of riders) {
    const n = normalizeHubRider(r);
    if (n == null) continue;
    if (myId != null && n.userId === myId) continue;
    m.set(n.userId, n);
  }
  return m;
}

/**
 * @param {Map<number, object>} prev
 * @param {unknown} rider
 * @param {number | null} myId
 */
export function mergePeer(prev, rider, myId) {
  const n = normalizeHubRider(rider);
  if (n == null) return prev;
  if (myId != null && n.userId === myId) return prev;
  const next = new Map(prev);
  next.set(n.userId, n);
  return next;
}

/**
 * @param {Map<number, object>} prev
 * @param {number} userId
 */
export function removePeer(prev, userId) {
  const next = new Map(prev);
  next.delete(userId);
  return next;
}

/**
 * @param {{ invokeUpdatePose: (lat: number, lng: number, headingDeg: number | null, accuracyM: number | null, atUtc: string) => Promise<void>, getTransportState: () => TransportState }} opts
 */
export function createPosePublisher({ invokeUpdatePose, getTransportState }) {
  /** @type {{ lat: number, lng: number, headingDeg: number | null, accuracyM: number | null, atUtc: string } | null} */
  let pending = null;
  let lastSentMs = 0;
  let sendLogCount = 0;

  function pendingForJoin() {
    if (pending == null || !isValidPoseCoords(pending.lat, pending.lng)) return null;
    return pending;
  }

  function tryFlush(now = Date.now()) {
    if (!canSendPose(getTransportState()) || pending == null) return false;
    if (now - lastSentMs < POSE_HEARTBEAT_MS) return false;

    const { lat, lng, headingDeg, accuracyM } = pending;
    const atUtc = new Date().toISOString();
    lastSentMs = now;

    if (isRideLiveLogEnabled()) {
      sendLogCount += 1;
      const n = sendLogCount;
      if (n <= 3 || n % 12 === 0) {
        rideLiveLog('→ UpdatePose', { n, lat, lng, headingDeg, accuracyM, atUtc });
      }
    }

    invokeUpdatePose(lat, lng, headingDeg ?? null, accuracyM ?? null, atUtc).catch((err) => {
      rideLiveWarn('UpdatePose invoke failed', err);
    });
    return true;
  }

  return {
    offerPose(lat, lng, headingDeg, accuracyM) {
      if (isValidPoseCoords(lat, lng)) {
        pending = {
          lat,
          lng,
          headingDeg: headingDeg ?? null,
          accuracyM: accuracyM ?? null,
          atUtc: new Date().toISOString(),
        };
      }

      if (!canSendPose(getTransportState())) {
        if (isRideLiveLogEnabled()) {
          rideLiveLog('offerPose buffered', { buffered: pending != null });
        }
        return;
      }

      tryFlush();
    },

    /** @returns {{ hadPendingPose: boolean, pending: typeof pending }} */
    joinArgs() {
      const p = pendingForJoin();
      return { hadPendingPose: p != null, pending: p };
    },

    markJoinSent(hadPendingPose) {
      lastSentMs = hadPendingPose ? Date.now() : 0;
    },

    reset() {
      pending = null;
      lastSentMs = 0;
      sendLogCount = 0;
    },
  };
}
