/** Statute miles per kilometer (international). */
export const KM_PER_MI = 1.609344;

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
 * @param {number | null | undefined} distanceM
 * @param {'km' | 'mi'} unit
 * @param {{ decimals?: number }} [options]
 */
export function formatDistanceFromMeters(distanceM, unit, options = {}) {
  if (distanceM == null || !Number.isFinite(distanceM)) return '—';
  return formatDistanceFromKm(distanceM / 1000, unit, options);
}
