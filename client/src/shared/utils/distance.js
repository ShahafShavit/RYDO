/** Statute miles per kilometer (international). */
export const KM_PER_MI = 1.609344;

/** Meters per foot (international). */
export const METERS_PER_FT = 0.3048;

/** @param {'km' | 'mi'} unit */
export function unitLabels(unit) {
  return {
    distance: unit === 'mi' ? 'Miles' : 'Kilometres',
    elevation: unit === 'mi' ? 'Feet up' : 'Metres up',
  };
}

/**
 * @param {number | string | null | undefined} km
 * @param {'km' | 'mi'} unit
 * @param {{ decimals?: number }} [options]
 */
export function formatDistanceFromKm(km, unit, options = {}) {
  if (km == null || km === '') return '—';
  const n = Number(km);
  if (!Number.isFinite(n)) return '—';
  const decimals = options.decimals ?? 1;
  if (unit === 'mi') {
    const mi = n / KM_PER_MI;
    return `${mi.toFixed(decimals)} mi`;
  }
  return `${n.toFixed(decimals)} km`;
}

/**
 * Horizontal distance along a track (not vertical elevation).
 * @param {number | null | undefined} distanceM
 * @param {'km' | 'mi'} unit
 * @param {{ decimals?: number }} [options]
 */
export function formatDistanceFromMeters(distanceM, unit, options = {}) {
  if (distanceM == null || !Number.isFinite(distanceM)) return '—';
  return formatDistanceFromKm(distanceM / 1000, unit, options);
}

/**
 * Elevation range label, e.g. "85–287 m" or "279–942 ft".
 * @param {number} minM
 * @param {number} maxM
 * @param {'km' | 'mi'} unit
 */
export function formatElevationRangeFromMeters(minM, maxM, unit) {
  if (!Number.isFinite(minM) || !Number.isFinite(maxM)) return '—';
  if (unit === 'mi') {
    const minFt = Math.round(minM / METERS_PER_FT);
    const maxFt = Math.round(maxM / METERS_PER_FT);
    return `${minFt}–${maxFt} ft`;
  }
  return `${Math.round(minM)}–${Math.round(maxM)} m`;
}

/**
 * Vertical elevation gain (m → m or ft, not horizontal km/mi).
 * @param {number | string | null | undefined} elevationM
 * @param {'km' | 'mi'} unit
 * @param {{ decimals?: number }} [options]
 */
export function formatElevationFromMeters(elevationM, unit, options = {}) {
  if (elevationM == null || elevationM === '') return '—';
  const n = Number(elevationM);
  if (!Number.isFinite(n)) return '—';
  const decimals = options.decimals ?? 0;
  if (unit === 'mi') {
    const ft = n / METERS_PER_FT;
    const value = decimals === 0 ? Math.round(ft) : Number(ft.toFixed(decimals));
    return `${value} ft`;
  }
  const value = decimals === 0 ? Math.round(n) : Number(n.toFixed(decimals));
  return `${value} m`;
}

/**
 * Short-range horizontal distance (peer proximity, HUD gaps).
 * @param {number | null | undefined} distanceM
 * @param {'km' | 'mi'} unit
 * @param {{ decimals?: number }} [options]
 */
export function formatShortDistanceFromMeters(distanceM, unit, options = {}) {
  if (distanceM == null || !Number.isFinite(distanceM)) return '';
  const m = Number(distanceM);
  if (unit === 'mi') {
    const ft = m / METERS_PER_FT;
    if (ft < 528) return `${Math.round(ft)} ft`;
    return formatDistanceFromKm(m / 1000, unit, { decimals: options.decimals ?? 1 });
  }
  if (m < 1000) return `${Math.round(m)} m`;
  return formatDistanceFromKm(m / 1000, unit, { decimals: options.decimals ?? 1 });
}

/**
 * @param {number | null | undefined} speedMps
 * @param {'km' | 'mi'} unit
 * @param {{ decimals?: number }} [options]
 */
export function formatSpeedFromMps(speedMps, unit, options = {}) {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) return '—';
  const decimals = options.decimals ?? 1;
  if (unit === 'mi') {
    return `${(Number(speedMps) * 2.2369362921).toFixed(decimals)} mph`;
  }
  return `${(Number(speedMps) * 3.6).toFixed(decimals)} km/h`;
}

/**
 * @param {number | null | undefined} speedKmh
 * @param {'km' | 'mi'} unit
 * @param {{ decimals?: number }} [options]
 */
export function formatSpeedFromKmh(speedKmh, unit, options = {}) {
  if (speedKmh == null || !Number.isFinite(speedKmh)) return '—';
  const decimals = options.decimals ?? 1;
  if (unit === 'mi') {
    return `${(Number(speedKmh) / KM_PER_MI).toFixed(decimals)} mph`;
  }
  return `${Number(speedKmh).toFixed(decimals)} km/h`;
}
