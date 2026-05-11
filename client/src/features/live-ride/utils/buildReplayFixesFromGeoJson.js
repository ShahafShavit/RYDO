import { bearingDegrees, distanceMeters } from '@/features/live-ride/utils/liveRideDeadReckon';
import { DEFAULT_LIVE_RIDE_MOTION_TUNING } from '@/features/live-ride/utils/liveRideMotionTuning';
import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';

/** @typedef {{ lat: number, lng: number, timestampMs: number, offsetMs: number, speedMps: number, heading: number | null, accuracyM: number }} ReplayFix */

/**
 * @param {string} xml
 * @returns {{ lat: number, lng: number, timeMs: number | null }[]}
 */
export function parseGpxTrackPointsWithTime(xml) {
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  if (dom.getElementsByTagName('parsererror').length > 0) return [];
  const pts = dom.getElementsByTagName('trkpt');
  /** @type {{ lat: number, lng: number, timeMs: number | null }[]} */
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const el = pts[i];
    const lat = Number(el.getAttribute('lat'));
    const lon = Number(el.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const timeEl = el.getElementsByTagName('time')[0];
    let timeMs = null;
    if (timeEl?.textContent) {
      const t = Date.parse(timeEl.textContent.trim());
      if (Number.isFinite(t)) timeMs = t;
    }
    out.push({ lat, lng: lon, timeMs });
  }
  return out;
}

/**
 * @param {{ lat: number, lng: number, timeMs: number | null }[]} raw
 * @returns {ReplayFix[]}
 */
function buildFixesFromTimedPoints(raw, tuning) {
  if (raw.length < 2) return [];
  const stepMs = pickTuning(tuning, 'REPLAY_DEFAULT_STEP_MS_NO_TIME', DEFAULT_LIVE_RIDE_MOTION_TUNING.REPLAY_DEFAULT_STEP_MS_NO_TIME);
  const minDt = pickTuning(tuning, 'REPLAY_MIN_DT_S', DEFAULT_LIVE_RIDE_MOTION_TUNING.REPLAY_MIN_DT_S);
  const accM = pickTuning(tuning, 'REPLAY_ACCURACY_M', DEFAULT_LIVE_RIDE_MOTION_TUNING.REPLAY_ACCURACY_M);
  const hasAnyTime = raw.some((p) => p.timeMs != null);
  /** @type {ReplayFix[]} */
  const fixes = [];
  const t0 = hasAnyTime && raw[0].timeMs != null ? raw[0].timeMs : 0;

  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    let offsetMs;
    let timestampMs;
    if (hasAnyTime && p.timeMs != null) {
      timestampMs = p.timeMs;
      offsetMs = p.timeMs - (raw[0].timeMs ?? p.timeMs);
    } else {
      offsetMs = i * stepMs;
      timestampMs = Date.now() + offsetMs;
    }

    let speedMps = 0;
    let heading = null;
    if (i > 0) {
      const prev = raw[i - 1];
      const dM = distanceMeters(prev.lat, prev.lng, p.lat, p.lng);
      let dtS;
      if (hasAnyTime && prev.timeMs != null && p.timeMs != null) {
        dtS = Math.max(minDt, (p.timeMs - prev.timeMs) / 1000);
      } else {
        dtS = stepMs / 1000;
      }
      speedMps = dM / dtS;
      heading = bearingDegrees(prev.lat, prev.lng, p.lat, p.lng);
    }

    fixes.push({
      lat: p.lat,
      lng: p.lng,
      timestampMs,
      offsetMs,
      speedMps: Number.isFinite(speedMps) ? speedMps : 0,
      heading,
      accuracyM: accM,
    });
  }

  if (!hasAnyTime) {
    const base = Date.now();
    for (let j = 0; j < fixes.length; j++) {
      fixes[j].timestampMs = base + fixes[j].offsetMs;
    }
  } else if (raw[0].timeMs == null) {
    let acc = 0;
    for (let j = 0; j < fixes.length; j++) {
      if (raw[j].timeMs != null) break;
      acc += stepMs;
      fixes[j].offsetMs = acc;
      fixes[j].timestampMs = t0 + acc;
    }
  }

  return fixes;
}

/**
 * @param {import('geojson').Position[]} ring
 * @returns {ReplayFix[]}
 */
function fixesFromLonLatRing(ring, tuning) {
  if (!Array.isArray(ring) || ring.length < 2) return [];
  /** @type {{ lat: number, lng: number, timeMs: null }[]} */
  const raw = [];
  for (const c of ring) {
    if (!Array.isArray(c) || c.length < 2) continue;
    const lng = Number(c[0]);
    const lat = Number(c[1]);
    if (Number.isNaN(lng) || Number.isNaN(lat)) continue;
    raw.push({ lat, lng, timeMs: null });
  }
  return buildFixesFromTimedPoints(raw, tuning);
}

function collectRingsFromGeoJson(geoJson) {
  /** @type {import('geojson').Position[][]} */
  const rings = [];

  const absorb = (g) => {
    if (!g) return;
    if (g.type === 'LineString' && Array.isArray(g.coordinates)) rings.push(g.coordinates);
    else if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
      for (const line of g.coordinates) rings.push(line);
    }
  };

  if (geoJson?.type === 'FeatureCollection' && Array.isArray(geoJson.features)) {
    for (const f of geoJson.features) absorb(f?.geometry);
  } else if (geoJson?.type === 'Feature') {
    absorb(geoJson.geometry);
  }

  return rings;
}

/**
 * GPX XML text → replay fixes (uses `<time>` when present).
 * @param {string} gpxXml
 * @returns {ReplayFix[]}
 */
export function buildReplayFixesFromGpxXml(gpxXml, tuning) {
  const domPts = parseGpxTrackPointsWithTime(gpxXml);
  if (domPts.length >= 2) return buildFixesFromTimedPoints(domPts, tuning);
  return [];
}

/**
 * GeoJSON (e.g. from togeojson.kml / .gpx) → replay fixes; no per-point times → uniform steps.
 * @param {unknown} geoJson
 * @returns {ReplayFix[]}
 */
export function buildReplayFixesFromGeoJson(geoJson, tuning) {
  const rings = collectRingsFromGeoJson(geoJson);
  if (rings.length === 0) return [];
  const longest = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0]);
  return fixesFromLonLatRing(longest, tuning);
}

/**
 * @param {string} lowerName
 * @param {string} text file contents
 * @param {unknown} geoJson from togeojson
 * @returns {ReplayFix[]}
 */
export function buildReplayFixesForUpload(lowerName, text, geoJson, tuning) {
  if (lowerName.endsWith('.gpx')) {
    const fromXml = buildReplayFixesFromGpxXml(text, tuning);
    if (fromXml.length >= 2) return fromXml;
  }
  return buildReplayFixesFromGeoJson(geoJson, tuning);
}
