import { BIKE_TYPE_PROFILE_LABELS } from '@/features/account/constants/bikeTypes';

/**
 * @param {string | null | undefined} key
 */
export function formatBikeTypeLabel(key) {
  if (key == null || String(key).trim() === '') return '';
  const k = String(key).toLowerCase();
  if (BIKE_TYPE_PROFILE_LABELS[k]) return BIKE_TYPE_PROFILE_LABELS[k];
  return k.charAt(0).toUpperCase() + k.slice(1);
}
