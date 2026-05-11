import { usePreferences } from './useAccount';
import { formatDistanceFromKm, formatDistanceFromMeters } from '@/shared/utils/distance';

/**
 * Uses the signed-in user's distance preference (defaults to km while loading).
 * @returns {{ formatKm: (km: number | string | null | undefined, decimals?: number) => string, formatMeters: (m: number | null | undefined, decimals?: number) => string, unit: 'km' | 'mi', isLoading: boolean }}
 */
export function useFormatDistance() {
  const { data: preferences, isLoading } = usePreferences();
  const unit = preferences?.distanceUnit === 'mi' ? 'mi' : 'km';

  const formatKm = (km, decimals) =>
    formatDistanceFromKm(km, unit, decimals !== undefined ? { decimals } : {});

  const formatMeters = (m, decimals) =>
    formatDistanceFromMeters(m, unit, decimals !== undefined ? { decimals } : {});

  return { formatKm, formatMeters, unit, isLoading };
}
