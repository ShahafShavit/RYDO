/**
 * First preview point is GeoJSON order [longitude, latitude].
 * @param {{ preview?: { coordinates?: number[][] } } | null | undefined} route
 * @returns {{ lat: number, lng: number } | null}
 */
export function getRouteStartLatLng(route) {
  const coords = route?.preview?.coordinates;
  if (!Array.isArray(coords) || coords.length < 1) return null;
  const first = coords[0];
  if (!Array.isArray(first) || first.length < 2) return null;
  const lng = Number(first[0]);
  const lat = Number(first[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
