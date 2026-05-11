import { pickTuning } from '@/features/live-ride/utils/liveRideTuningPick';
import {
  DEFAULT_LIVE_RIDE_MOTION_TUNING,
} from '@/features/live-ride/utils/liveRideMotionTuning';

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : 0.5 * (s[mid - 1] + s[mid]);
}

/**
 * @typedef {{ samples: number[], ema: number, zeroLatched: boolean, medianWindow: number }} SpeedFilterState
 */

/**
 * @param {Record<string, number> | null | undefined} [tuning]
 * @returns {SpeedFilterState}
 */
export function createSpeedFilterState(tuning) {
  const w = Math.max(
    1,
    Math.min(
      9,
      Math.round(pickTuning(tuning, 'SPEED_FILTER_MEDIAN_WINDOW', DEFAULT_LIVE_RIDE_MOTION_TUNING.SPEED_FILTER_MEDIAN_WINDOW)) | 0,
    ),
  );
  return { samples: [], ema: 0, zeroLatched: true, medianWindow: w };
}

/**
 * Balanced speed filter: median-of-5 + EMA + zero hysteresis.
 * @param {SpeedFilterState} state
 * @param {number | null | undefined} rawSpeedMps
 * @returns {number}
 */
export function updateFilteredSpeedMps(state, rawSpeedMps, tuning) {
  if (!state) return 0;
  const win =
    state.medianWindow ??
    Math.max(
      1,
      Math.min(
        9,
        Math.round(pickTuning(tuning, 'SPEED_FILTER_MEDIAN_WINDOW', DEFAULT_LIVE_RIDE_MOTION_TUNING.SPEED_FILTER_MEDIAN_WINDOW)) | 0,
      ),
    );
  const emaA = pickTuning(tuning, 'SPEED_FILTER_EMA_ALPHA', DEFAULT_LIVE_RIDE_MOTION_TUNING.SPEED_FILTER_EMA_ALPHA);
  const zIn = pickTuning(tuning, 'SPEED_FILTER_ZERO_ENTER_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.SPEED_FILTER_ZERO_ENTER_MPS);
  const zOut = pickTuning(tuning, 'SPEED_FILTER_ZERO_EXIT_MPS', DEFAULT_LIVE_RIDE_MOTION_TUNING.SPEED_FILTER_ZERO_EXIT_MPS);

  const s = Number.isFinite(rawSpeedMps) && rawSpeedMps >= 0 ? rawSpeedMps : 0;
  state.samples.push(s);
  if (state.samples.length > win) state.samples.shift();

  const med = median(state.samples);
  state.ema = state.ema + emaA * (med - state.ema);

  if (state.zeroLatched) {
    if (state.ema >= zOut) state.zeroLatched = false;
  } else if (state.ema <= zIn) {
    state.zeroLatched = true;
  }

  return state.zeroLatched ? 0 : state.ema;
}
