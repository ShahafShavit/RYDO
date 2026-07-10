import { formatShortDistanceFromMeters } from '@/shared/utils/distance';

/**
 * @param {number | null | undefined} distanceM
 * @param {'km' | 'mi'} [unit='km']
 * @returns {string}
 */
export function formatDistanceFromRoute(distanceM, unit = 'km') {
  if (distanceM == null || !Number.isFinite(distanceM)) return '—';
  const formatted = formatShortDistanceFromMeters(distanceM, unit);
  return formatted ? `${formatted} from route` : '—';
}

/**
 * @param {number | null | undefined} distanceM
 * @param {'km' | 'mi'} [unit='km']
 * @returns {string}
 */
export function formatDistanceAlongRoute(distanceM, unit = 'km') {
  if (distanceM == null || !Number.isFinite(distanceM)) return '—';
  const formatted = formatShortDistanceFromMeters(distanceM, unit);
  return formatted ? `${formatted} along route` : '—';
}
