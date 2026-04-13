import { lineString } from '@turf/helpers';

/**
 * Flattens route geometry from upload-style GeoJSON into a single LineString for Turf.
 * @param {unknown} geoJson FeatureCollection or single Feature from togeojson / API
 * @returns {import('geojson').Feature<import('geojson').LineString> | null}
 */
export function normalizeTrackToLineString(geoJson) {
  if (!geoJson || typeof geoJson !== 'object') return null;

  /** @type {import('geojson').Position[]} */
  const coords = [];

  const pushRing = (ring) => {
    if (!Array.isArray(ring)) return;
    for (const c of ring) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const lon = Number(c[0]);
      const lat = Number(c[1]);
      if (Number.isNaN(lon) || Number.isNaN(lat)) continue;
      coords.push([lon, lat]);
    }
  };

  const absorbGeometry = (g) => {
    if (!g) return;
    if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
      pushRing(g.coordinates);
    } else if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
      for (const line of g.coordinates) pushRing(line);
    }
  };

  if (geoJson.type === 'FeatureCollection' && Array.isArray(geoJson.features)) {
    for (const f of geoJson.features) absorbGeometry(f?.geometry);
  } else if (geoJson.type === 'Feature') {
    absorbGeometry(geoJson.geometry);
  }

  if (coords.length < 2) return null;

  return lineString(coords, { name: 'live-track' });
}
