export const MAX_RIDE_NAME_LENGTH = 40;
export const MAX_ROUTE_TITLE_LENGTH = 40;

export function clampText(value, maxLength) {
  const trimmed = String(value ?? '').trim();
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength);
}

export function clampRideName(value) {
  return clampText(value, MAX_RIDE_NAME_LENGTH);
}

export function clampRouteTitle(value) {
  return clampText(value, MAX_ROUTE_TITLE_LENGTH);
}

export function defaultRideNameFromRoute(routeTitle, suffix = ' — ride') {
  return clampRideName(`${routeTitle}${suffix}`);
}
