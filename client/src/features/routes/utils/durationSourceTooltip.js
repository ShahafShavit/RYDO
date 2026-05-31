import { helpTooltip } from '@/shared/content/help-tooltips';
import { durationSourceLabel } from '@/features/routes/utils/durationSource';
import { SUGGESTED_DURATION_SPEED_KMH } from '@/features/routes/utils/gpxAnalysis';

/**
 * Full estimated-time tooltip: base copy + source-specific line.
 * @param {string | null | undefined} source
 * @param {'km' | 'mi'} [unit]
 */
export function estimatedTimeTooltip(source, unit = 'km') {
  const sourceLine = durationSourceLabel(source, unit);
  return `${helpTooltip('estimatedTimeBase')} ${sourceLine}`;
}

/**
 * Upload preview duration tile copy from suggestion source.
 * @param {'timestamps' | 'pace' | 'none' | null} suggestionSource
 * @param {(n: number) => string} formatSpeedKmh
 */
export function uploadDurationTileHint(suggestionSource, formatSpeedKmh) {
  switch (suggestionSource) {
    case 'timestamps':
      return `${helpTooltip('estimatedTimeBase')} Recorded — from GPX clock times (first to last point with times).`;
    case 'pace':
      return `${helpTooltip('estimatedTimeBase')} Inferred at ${formatSpeedKmh(SUGGESTED_DURATION_SPEED_KMH)} average (no GPX clock).`;
    case 'none':
    default:
      return `${helpTooltip('estimatedTimeBase')} Inferred (no GPX clock) — default 60 min until you change it below.`;
  }
}
