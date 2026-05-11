import { SUGGESTED_DURATION_SPEED_KMH } from '@/features/routes/utils/gpxAnalysis';

/** Matches server `RouteDurationSource` / API `estimatedDurationSource`. */
export const ESTIMATED_DURATION_SOURCE = {
  GPX_TIMESTAMPS: 'gpx_timestamps',
  ESTIMATED_PACE: 'estimated_pace',
  ESTIMATED: 'estimated',
  USER: 'user',
  UNKNOWN: 'unknown',
};

/**
 * Human-readable explanation of how route duration was chosen.
 * - Recorded: from GPX `<time>` span.
 * - Inferred (pace): distance ÷ assumed average speed — no GPX clock.
 * - Inferred (other): fallback when we could not use timestamps or pace the same way.
 */
export function durationSourceLabel(source) {
  switch (source) {
    case ESTIMATED_DURATION_SOURCE.GPX_TIMESTAMPS:
      return 'Recorded — from GPX clock times on the track';
    case ESTIMATED_DURATION_SOURCE.ESTIMATED_PACE:
      return `Inferred at ${SUGGESTED_DURATION_SPEED_KMH} km/h average (no GPX clock)`;
    case ESTIMATED_DURATION_SOURCE.USER:
      return 'Entered manually (not derived from GPX clock)';
    case ESTIMATED_DURATION_SOURCE.ESTIMATED:
    case ESTIMATED_DURATION_SOURCE.UNKNOWN:
    default:
      return 'Inferred (no GPX clock)';
  }
}

/** @deprecated Use `durationSourceLabel` — same behavior, clearer name. */
export const durationSourceShortLabel = durationSourceLabel;
