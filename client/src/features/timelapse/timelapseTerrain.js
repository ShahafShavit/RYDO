/**
 * Mapbox 3D terrain (elevation mesh). Safe to call after style `load`; no-op if map missing.
 * @param {import('mapbox-gl').Map} map
 * @param {boolean} enabled
 * @param {number} exaggeration
 */
export function applyMapboxTerrain(map, enabled, exaggeration) {
  if (!map) return;
  try {
    if (!enabled) {
      map.setTerrain(null);
      return;
    }
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    map.setTerrain({
      source: 'mapbox-dem',
      exaggeration: Math.min(2, Math.max(0.3, exaggeration)),
    });
  } catch (e) {
    console.warn('Terrain setup skipped:', e);
  }
}

/**
 * @param {number} deg
 * @returns {number} 0..360
 */
export function normalizeMapboxBearing(deg) {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}
