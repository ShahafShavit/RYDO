import { usePreferences } from './useAccount';
import {
  formatDistanceFromKm,
  formatDistanceFromMeters,
  formatElevationFromMeters,
  formatElevationRangeFromMeters,
  formatShortDistanceFromMeters,
  formatSpeedFromKmh,
  formatSpeedFromMps,
  unitLabels,
} from '@/shared/utils/distance';

/**
 * Uses the signed-in user's distance preference (defaults to km while loading).
 * @returns {{
 *   formatKm: (km: number | string | null | undefined, decimals?: number) => string,
 *   formatMeters: (m: number | null | undefined, decimals?: number) => string,
 *   formatElevation: (m: number | string | null | undefined, decimals?: number) => string,
 *   formatElevationRange: (minM: number, maxM: number) => string,
 *   formatShortDistance: (m: number | null | undefined, decimals?: number) => string,
 *   formatSpeed: (mps: number | null | undefined, decimals?: number) => string,
 *   formatSpeedKmh: (kmh: number | null | undefined, decimals?: number) => string,
 *   labels: { distance: string, elevation: string },
 *   unit: 'km' | 'mi',
 *   isLoading: boolean,
 * }}
 */
export function useFormatDistance() {
  const { data: preferences, isLoading } = usePreferences();
  const unit = preferences?.distanceUnit === 'mi' ? 'mi' : 'km';

  const opts = (decimals) => (decimals !== undefined ? { decimals } : {});

  const formatKm = (km, decimals) => formatDistanceFromKm(km, unit, opts(decimals));

  const formatMeters = (m, decimals) => formatDistanceFromMeters(m, unit, opts(decimals));

  const formatElevation = (m, decimals) => formatElevationFromMeters(m, unit, opts(decimals));

  const formatElevationRange = (minM, maxM) => formatElevationRangeFromMeters(minM, maxM, unit);

  const formatShortDistance = (m, decimals) =>
    formatShortDistanceFromMeters(m, unit, opts(decimals));

  const formatSpeed = (mps, decimals) => formatSpeedFromMps(mps, unit, opts(decimals));

  const formatSpeedKmh = (kmh, decimals) => formatSpeedFromKmh(kmh, unit, opts(decimals));

  return {
    formatKm,
    formatMeters,
    formatElevation,
    formatElevationRange,
    formatShortDistance,
    formatSpeed,
    formatSpeedKmh,
    labels: unitLabels(unit),
    unit,
    isLoading,
  };
}
