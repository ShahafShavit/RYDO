import bearing from '@turf/bearing';
import { point } from '@turf/helpers';

const EARTH_RADIUS_M = 6371000;

/**
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
export function haversineDistanceM(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, a)));
}

/**
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function initialsFromDisplayName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() || '?';
}

/** @param {number} forwardDeg @param {number} targetBearingDeg @returns {number} in [-180, 180] */
export function relativeBearingDeg(forwardDeg, targetBearingDeg) {
  return ((targetBearingDeg - forwardDeg + 540) % 360) - 180;
}

/**
 * @param {object} params
 * @param {number | null | undefined} params.selfLat
 * @param {number | null | undefined} params.selfLng
 * @param {number | null | undefined} params.headingDeg device heading, degrees
 * @param {number | null | undefined} [params.speedKmh]
 * @param {number} [params.coneMinSpeedKmh]
 * @param {boolean} [params.forceDisableCone]
 * @param {{ lat: number, lng: number } | null | undefined} params.previousFix
 * @param {Iterable<{ userId: number, lat: number, lng: number, displayName?: string, avatarUrl?: string | null, isStale?: boolean }>} params.peers
 */
export function nearestPeersAheadBehind({
  selfLat,
  selfLng,
  headingDeg,
  speedKmh,
  coneMinSpeedKmh = 7,
  forceDisableCone = false,
  previousFix,
  peers,
}) {
  const list = [...peers].filter((p) => !p.isStale);
  if (
    selfLat == null ||
    selfLng == null ||
    !Number.isFinite(selfLat) ||
    !Number.isFinite(selfLng) ||
    list.length === 0
  ) {
    return { mode: 'empty' };
  }

  const withDist = list.map((p) => ({
    peer: p,
    distanceM: haversineDistanceM(selfLat, selfLng, p.lat, p.lng),
  }));

  let forwardDeg = null;
  const coneEnabled =
    !forceDisableCone &&
    Number.isFinite(speedKmh) &&
    speedKmh >= coneMinSpeedKmh;
  if (!coneEnabled) {
    return {
      mode: 'unknown',
      nearest: topPeersByDistance(selfLat, selfLng, peers, 4),
    };
  }

  if (headingDeg != null && Number.isFinite(headingDeg)) {
    forwardDeg = headingDeg;
  } else if (
    previousFix &&
    Number.isFinite(previousFix.lat) &&
    Number.isFinite(previousFix.lng) &&
    (previousFix.lat !== selfLat || previousFix.lng !== selfLng)
  ) {
    forwardDeg = bearing(
      point([previousFix.lng, previousFix.lat]),
      point([selfLng, selfLat]),
    );
  }

  if (forwardDeg == null || !Number.isFinite(forwardDeg)) {
    return {
      mode: 'unknown',
      nearest: topPeersByDistance(selfLat, selfLng, peers, 4),
    };
  }

  const ahead = [];
  const behind = [];
  const selfPt = point([selfLng, selfLat]);
  for (const row of withDist) {
    const b = bearing(selfPt, point([row.peer.lng, row.peer.lat]));
    const rel = relativeBearingDeg(forwardDeg, b);
    const entry = { ...row.peer, distanceM: row.distanceM };
    if (rel > -90 && rel < 90) ahead.push(entry);
    else behind.push(entry);
  }
  ahead.sort((a, b) => a.distanceM - b.distanceM);
  behind.sort((a, b) => a.distanceM - b.distanceM);
  return {
    mode: 'aheadBehind',
    aheadNearest: ahead[0] ?? null,
    behindNearest: behind[0] ?? null,
  };
}

/**
 * Peers sorted by distance: live first (nearest first), then stale (nearest first), capped at `limit`.
 * @param {number | null | undefined} selfLat
 * @param {number | null | undefined} selfLng
 * @param {Iterable<{ userId: number, lat: number, lng: number, displayName?: string, isStale?: boolean }>} peers
 * @param {number} [limit]
 */
export function topPeersByDistance(selfLat, selfLng, peers, limit = 4) {
  const all = [...peers];
  if (all.length === 0) return [];

  const hasSelf =
    selfLat != null &&
    selfLng != null &&
    Number.isFinite(selfLat) &&
    Number.isFinite(selfLng);

  const withDist = all.map((p) => ({
    ...p,
    distanceM: hasSelf ? haversineDistanceM(selfLat, selfLng, p.lat, p.lng) : null,
  }));

  const live = withDist.filter((p) => !p.isStale);
  const stale = withDist.filter((p) => p.isStale);

  live.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  stale.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));

  return [...live, ...stale].slice(0, limit);
}
