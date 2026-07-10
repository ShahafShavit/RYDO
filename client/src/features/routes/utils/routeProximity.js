import { haversineDistanceM } from '@/shared/lib/geoDistance';
import { collectLinePointsFromGeoJson, cumulativeDistancesM } from '@/features/routes/utils/gpxAnalysis';

/**
 * Closest point on a segment [a,b] to (lat,lng) via ternary search on t ∈ [0,1].
 * @returns {{ t: number, distanceM: number }}
 */
function closestOnSegmentM(lat, lng, a, b) {
  let lo = 0;
  let hi = 1;
  for (let iter = 0; iter < 20; iter += 1) {
    const t1 = lo + (hi - lo) / 3;
    const t2 = hi - (hi - lo) / 3;
    const lat1 = a.lat + t1 * (b.lat - a.lat);
    const lng1 = a.lon + t1 * (b.lon - a.lon);
    const lat2 = a.lat + t2 * (b.lat - a.lat);
    const lng2 = a.lon + t2 * (b.lon - a.lon);
    const d1 = haversineDistanceM(lat, lng, lat1, lng1);
    const d2 = haversineDistanceM(lat, lng, lat2, lng2);
    if (d1 < d2) hi = t2;
    else lo = t1;
  }
  const t = (lo + hi) / 2;
  const closestLat = a.lat + t * (b.lat - a.lat);
  const closestLng = a.lon + t * (b.lon - a.lon);
  return { t, distanceM: haversineDistanceM(lat, lng, closestLat, closestLng) };
}

/**
 * Nearest point on the route polyline to (lat,lng).
 * Uses the same vertex order as elevation profile / scrub marker placement.
 *
 * @param {unknown} geoJson
 * @param {number} lat
 * @param {number} lng
 * @returns {{ distanceAlongM: number, distanceToRouteM: number } | null}
 */
export function snapPointToRoutePolyline(geoJson, lat, lng) {
  const points = collectLinePointsFromGeoJson(geoJson);
  if (points.length < 2) return null;

  const cum = cumulativeDistancesM(points);
  let bestDist = Infinity;
  let bestAlong = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const { t, distanceM } = closestOnSegmentM(lat, lng, a, b);
    if (distanceM < bestDist) {
      bestDist = distanceM;
      const span = cum[i + 1] - cum[i];
      bestAlong = cum[i] + t * span;
    }
  }

  if (!Number.isFinite(bestDist)) return null;
  return { distanceAlongM: bestAlong, distanceToRouteM: bestDist };
}

/**
 * Hazards near enough to the route to plot on the elevation chart.
 *
 * @param {unknown} geoJson
 * @param {Array<{ id?: number, location?: { lat?: number, lng?: number } }>} hazards
 * @param {number} maxDistanceM
 * @returns {Array<{ distanceAlongM: number, distanceToRouteM: number } & object>}
 */
export function hazardsForElevationChart(geoJson, hazards, maxDistanceM) {
  if (!Array.isArray(hazards) || hazards.length === 0) return [];

  const out = [];
  for (const hazard of hazards) {
    const lat = hazard.location?.lat;
    const lng = hazard.location?.lng;
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) continue;

    const storedFromRouteM = hazard.distanceFromRouteM;
    const storedAlongRouteM = hazard.distanceAlongRouteM;
    const hasStoredDistances =
      storedFromRouteM != null
      && storedAlongRouteM != null
      && Number.isFinite(storedFromRouteM)
      && Number.isFinite(storedAlongRouteM);

    if (hasStoredDistances) {
      if (storedFromRouteM > maxDistanceM) continue;
      out.push({
        ...hazard,
        distanceAlongM: storedAlongRouteM,
        distanceToRouteM: storedFromRouteM,
      });
      continue;
    }

    const snap = snapPointToRoutePolyline(geoJson, lat, lng);
    if (!snap || snap.distanceToRouteM > maxDistanceM) continue;

    out.push({
      ...hazard,
      distanceAlongM: snap.distanceAlongM,
      distanceToRouteM: snap.distanceToRouteM,
    });
  }

  return out.sort((a, b) => a.distanceAlongM - b.distanceAlongM);
}
