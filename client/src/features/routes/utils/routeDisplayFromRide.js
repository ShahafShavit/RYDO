/** Build display metadata from a ride API payload for edit forms. */
export function routeDisplayFromRide(ride) {
  if (ride?.routeId == null) return null;
  return {
    id: ride.routeId,
    title: ride.routeTitle || `Route #${ride.routeId}`,
    preview: ride.routePreview ?? null,
  };
}
