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
 * @returns {{ lat: number, lon: number, ele: number | null }[]}
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
    out.push({ lat, lon, ele });
  }
  return out;
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
 * Full analysis from GPX DOM (same points used for distance, gain, and profile).
 */
export function analyzeGpxTrack(gpxDom) {
  const points = extractTrackPointsFromGpx(gpxDom);
  if (points.length < 2) {
    return {
      error: 'No track points found in GPX (need at least 2 trkpt elements).',
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
