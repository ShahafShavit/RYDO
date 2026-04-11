/**
 * Builds a GeoJSON FeatureCollection for Leaflet from API preview data.
 * Coordinate pairs must be GeoJSON order [longitude, latitude].
 *
 * @param {{ geoJson?: unknown, coordinates?: number[][] } | null | undefined} preview
 */
export function buildRoutePreviewFeatureCollection(preview) {
  if (!preview) return null;

  if (preview.geoJson?.type === 'FeatureCollection') {
    return preview.geoJson;
  }

  if (preview.geoJson) {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: preview.geoJson }],
    };
  }

  if (Array.isArray(preview.coordinates) && preview.coordinates.length > 1) {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: preview.coordinates,
          },
        },
      ],
    };
  }

  return null;
}
