/**
 * GPX parsing and route stats aligned along the recorded track.
 * Elevation gain uses smoothed samples + a noise threshold (reduces GPS jitter).
 */

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reads first GPX &lt;time&gt; child on a trkpt/rtept/wpt (ISO 8601).
 * @param {Element} pt
 * @returns {number | null} Unix ms
 */
function readGpxTimeMs(pt) {
  const times = pt.getElementsByTagName('time');
  if (times.length === 0) return null;
  const txt = times[0].textContent?.trim();
  if (!txt) return null;
  const ms = Date.parse(txt);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Wall-clock duration from GPX timestamps: span between earliest and latest time on track points
 * (or route points if the file has no track). Returns null if fewer than two valid timestamps.
 *
 * @param {Document} gpxDom
 * @returns {number | null} Whole minutes, at least 1 when defined
 */
export function deriveDurationMinutesFromGpx(gpxDom) {
  const collected = [];
  const trkpts = gpxDom.getElementsByTagName('trkpt');
  for (let i = 0; i < trkpts.length; i++) {
    const ms = readGpxTimeMs(trkpts[i]);
    if (ms != null) collected.push(ms);
  }
  if (collected.length < 2) {
    const rtepts = gpxDom.getElementsByTagName('rtept');
    for (let i = 0; i < rtepts.length; i++) {
      const ms = readGpxTimeMs(rtepts[i]);
      if (ms != null) collected.push(ms);
    }
  }
  if (collected.length < 2) return null;

  let minT = collected[0];
  let maxT = collected[0];
  for (const t of collected) {
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
  }
  const spanMs = maxT - minT;
  if (spanMs <= 0) return null;
  return Math.max(1, Math.round(spanMs / 60000));
}

/** Assumed average moving speed when inferring duration from track length (GPX has no timestamps). */
export const SUGGESTED_DURATION_SPEED_KMH = 20;

/** Keep numeric values aligned with server `GpxTrackParser.Validation.cs`. */
export const GPX_PLAUSIBILITY = {
  maxGainPerKm: 350,
  maxAggregateGainM: 15000,
  minAggregateGainFloorM: 200,
  spikeVerticalM: 150,
  spikeHorizontalM: 40,
  minHorizontalForGradeM: 40,
  maxAbsGrade: 0.5,
  maxHorizontalSpeedMps: 45,
  sameTimestampTeleportM: 50,
};

/**
 * Whole minutes from Haversine path length and an assumed average speed (no GPX timestamps required).
 *
 * @param {number} distanceM
 * @param {number} [speedKmh=SUGGESTED_DURATION_SPEED_KMH]
 * @returns {number | null}
 */
export function deriveDurationMinutesFromDistance(distanceM, speedKmh = SUGGESTED_DURATION_SPEED_KMH) {
  if (!(distanceM > 0) || !(speedKmh > 0)) return null;
  const hours = (distanceM / 1000) / speedKmh;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * @returns {{ lat: number, lon: number, ele: number | null, timeMs: number | null }[]}
 */
export function extractTrackPointsFromGpx(gpxDom) {
  const pts = gpxDom.getElementsByTagName('trkpt');
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const lat = parseFloat(pt.getAttribute('lat'));
    const lon = parseFloat(pt.getAttribute('lon'));
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    let ele = null;
    const eleNodes = pt.getElementsByTagName('ele');
    if (eleNodes.length > 0) {
      const v = parseFloat(eleNodes[0].textContent);
      if (!Number.isNaN(v)) ele = v;
    }
    const timeMs = readGpxTimeMs(pt);
    out.push({ lat, lon, ele, timeMs });
  }
  return out;
}

function computeSequentialElevationGainM(points) {
  let lastEle = null;
  let gain = 0;
  for (const p of points) {
    if (p.ele == null || Number.isNaN(p.ele)) continue;
    if (lastEle != null && p.ele > lastEle) gain += p.ele - lastEle;
    lastEle = p.ele;
  }
  return gain;
}

/**
 * Mirrors server `GpxTrackParser.IsTrackPlausible` for upload UX.
 *
 * @param {{ lat: number, lon: number, ele: number | null, timeMs: number | null }[]} points
 * @returns {string | null} null if plausible, else user-facing error message
 */
export function validateTrackPlausibility(points) {
  const c = GPX_PLAUSIBILITY;
  if (points.length < 2) {
    return 'No track points found in GPX (need at least 2 trkpt elements).';
  }

  let distanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    distanceKm +=
      haversineM(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon) / 1000;
  }

  const elevationGainM = computeSequentialElevationGainM(points);
  const maxAllowedGain = Math.min(
    c.maxAggregateGainM,
    Math.max(c.minAggregateGainFloorM, distanceKm * c.maxGainPerKm),
  );
  if (elevationGainM > maxAllowedGain) {
    return 'This GPX has unrealistic total elevation gain for its distance (possible corrupt elevation data).';
  }

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const horizM = haversineM(a.lat, a.lon, b.lat, b.lon);

    if (a.ele != null && !Number.isNaN(a.ele) && b.ele != null && !Number.isNaN(b.ele)) {
      const dEle = Math.abs(b.ele - a.ele);
      if (dEle > c.spikeVerticalM && horizM < c.spikeHorizontalM) {
        return 'This GPX contains a near-instantaneous elevation jump (possible corrupt elevation data).';
      }
      if (horizM >= c.minHorizontalForGradeM && dEle / horizM > c.maxAbsGrade) {
        return 'This GPX contains an impossible slope between two points (possible corrupt data).';
      }
    }

    const ta = a.timeMs;
    const tb = b.timeMs;
    if (ta != null && tb != null) {
      const dtSec = (tb - ta) / 1000;
      if (dtSec <= 0 && horizM > c.sameTimestampTeleportM) {
        return 'This GPX shows large movement with zero or negative time between points (possible corrupt timestamps).';
      }
      if (dtSec > 0 && horizM / dtSec > c.maxHorizontalSpeedMps) {
        return 'This GPX implies impossible speed between two points (possible corrupt timestamps or positions).';
      }
    }
  }

  return null;
}

/**
 * Linearly interpolate missing elevations along track index.
 * @param {(number|null)[]} series
 * @returns {number[]}
 */
export function interpolateElevationSeries(series) {
  const n = series.length;
  if (n === 0) return [];
  const arr = series.map((v) => (v != null && !Number.isNaN(v) ? v : null));
  let i = 0;
  while (i < n) {
    if (arr[i] != null) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && arr[j] == null) j++;
    const leftIdx = i - 1;
    const rightIdx = j < n ? j : -1;
    const left = leftIdx >= 0 ? arr[leftIdx] : null;
    const right = rightIdx >= 0 ? arr[rightIdx] : null;
    if (left != null && right != null) {
      const gap = j - i;
      for (let k = 0; k < gap; k++) {
        arr[i + k] = left + ((right - left) * (k + 1)) / (gap + 1);
      }
    } else if (left != null) {
      for (let k = i; k < j; k++) arr[k] = left;
    } else if (right != null) {
      for (let k = i; k < j; k++) arr[k] = right;
    } else {
      for (let k = i; k < j; k++) arr[k] = 0;
    }
    i = j;
  }
  return arr.map((v) => (v == null ? 0 : v));
}

function movingAverage(values, windowSize) {
  if (windowSize <= 1) return values.slice();
  const half = Math.floor(windowSize / 2);
  const out = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      sum += values[j];
      c++;
    }
    out[i] = sum / c;
  }
  return out;
}

/**
 * Total climb: sum of positive differences on smoothed series, ignoring noise below thresholdM.
 */
export function totalElevationGainM(smoothedElevations, noiseThresholdM = 0.5) {
  let gain = 0;
  for (let i = 1; i < smoothedElevations.length; i++) {
    const d = smoothedElevations[i] - smoothedElevations[i - 1];
    if (d > noiseThresholdM) gain += d;
  }
  return gain;
}

/**
 * Cumulative distance along track (meters).
 */
export function cumulativeDistancesM(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const d = haversineM(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    cum.push(cum[i - 1] + d);
  }
  return cum;
}

/**
 * @param {{ lat: number, lon: number, ele: number | null }[]} points
 * @param {number[]} elevationsM - same length, interpolated
 * @returns {{ distanceM: number, elevationM: number }[]}
 */
export function buildElevationProfile(points, elevationsM) {
  const cum = cumulativeDistancesM(points);
  return points.map((_, i) => ({
    distanceM: cum[i],
    elevationM: elevationsM[i],
  }));
}

/**
 * Duration hints for upload UI: prefers GPX timestamps, else pace from path length.
 * @param {Document} gpxDom
 * @param {number} totalM
 */
function buildDurationHints(gpxDom, totalM) {
  const derivedDurationMinutes = deriveDurationMinutesFromGpx(gpxDom);
  const paceDerivedDurationMinutes =
    derivedDurationMinutes == null ? deriveDurationMinutesFromDistance(totalM) : null;
  const suggestedDurationMinutes = derivedDurationMinutes ?? paceDerivedDurationMinutes ?? null;

  let durationSuggestionSource = 'none';
  if (derivedDurationMinutes != null) durationSuggestionSource = 'timestamps';
  else if (paceDerivedDurationMinutes != null) durationSuggestionSource = 'pace';

  return {
    derivedDurationMinutes,
    paceDerivedDurationMinutes,
    suggestedDurationMinutes,
    durationSuggestionSource,
  };
}

/**
 * Full analysis from GPX DOM (same points used for distance, gain, and profile).
 */
export function analyzeGpxTrack(gpxDom) {
  const points = extractTrackPointsFromGpx(gpxDom);
  if (points.length < 2) {
    return {
      error: 'No track points found in GPX (need at least 2 trkpt elements).',
      ...buildDurationHints(gpxDom, 0),
    };
  }

  const plausibilityError = validateTrackPlausibility(points);
  if (plausibilityError) {
    return {
      error: plausibilityError,
      ...buildDurationHints(gpxDom, 0),
    };
  }

  const rawSeries = points.map((p) => p.ele);
  const hasAnyEle = rawSeries.some((v) => v != null && !Number.isNaN(v));
  if (!hasAnyEle) {
    const cum = cumulativeDistancesM(points);
    const totalM = cum[cum.length - 1];
    return {
      points,
      distanceM: totalM,
      elevationGainM: 0,
      elevationProfile: points.map((_, i) => ({ distanceM: cum[i], elevationM: 0 })),
      missingElevation: true,
      ...buildDurationHints(gpxDom, totalM),
    };
  }

  const filled = interpolateElevationSeries(rawSeries);
  const smoothed = movingAverage(filled, Math.min(9, Math.max(3, Math.floor(points.length / 50) * 2 + 1)));
  const gain = totalElevationGainM(smoothed, 0.5);
  const cum = cumulativeDistancesM(points);
  const totalM = cum[cum.length - 1];
  const elevationProfile = buildElevationProfile(points, smoothed);

  return {
    points,
    distanceM: totalM,
    elevationGainM: gain,
    elevationProfile,
    missingElevation: false,
    ...buildDurationHints(gpxDom, totalM),
  };
}

/**
 * Collects track points from GeoJSON LineString / MultiLineString features (GeoJSON order: lon, lat, optional elevation).
 * @param {unknown} geoJson
 * @returns {{ lat: number, lon: number, ele: number | null }[]}
 */
function collectLinePointsFromGeoJson(geoJson) {
  if (!geoJson || geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
    return [];
  }

  const pushCoord = (c, out) => {
    if (!Array.isArray(c) || c.length < 2) return;
    const lon = Number(c[0]);
    const lat = Number(c[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    let ele = null;
    if (c.length >= 3 && typeof c[2] === 'number' && !Number.isNaN(c[2])) {
      ele = c[2];
    }
    out.push({ lat, lon, ele });
  };

  const out = [];
  for (const f of geoJson.features) {
    const g = f?.geometry;
    if (!g) continue;
    if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
      for (const c of g.coordinates) pushCoord(c, out);
    } else if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
      for (const line of g.coordinates) {
        if (!Array.isArray(line)) continue;
        for (const c of line) pushCoord(c, out);
      }
    }
  }
  return out;
}

/**
 * Elevation profile from stored route preview GeoJSON (needs per-point elevation as third coordinate).
 * Returns null if the line is too short or has no elevation samples (matches upload UX: no misleading flat chart).
 *
 * @param {unknown} geoJson
 * @returns {{ distanceM: number, elevationM: number }[] | null}
 */
export function buildElevationProfileFromGeoJson(geoJson) {
  const points = collectLinePointsFromGeoJson(geoJson);
  if (points.length < 2) return null;

  const rawSeries = points.map((p) => p.ele);
  const hasAnyEle = rawSeries.some((v) => v != null && !Number.isNaN(v));
  if (!hasAnyEle) return null;

  const filled = interpolateElevationSeries(rawSeries);
  const win = Math.min(9, Math.max(3, Math.floor(points.length / 50) * 2 + 1));
  const smoothed = movingAverage(filled, win);
  return buildElevationProfile(points, smoothed);
}
