const MEDIAN_WINDOW = 3;
const EMA_ALPHA = 0.45;
const ZERO_ENTER_MPS = 0.55;
const ZERO_EXIT_MPS = 0.7;

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : 0.5 * (s[mid - 1] + s[mid]);
}

/**
 * @typedef {{ samples: number[], ema: number, zeroLatched: boolean }} SpeedFilterState
 */

/**
 * @returns {SpeedFilterState}
 */
export function createSpeedFilterState() {
  return { samples: [], ema: 0, zeroLatched: true };
}

/**
 * Balanced speed filter: median-of-5 + EMA + zero hysteresis.
 * @param {SpeedFilterState} state
 * @param {number | null | undefined} rawSpeedMps
 * @returns {number}
 */
export function updateFilteredSpeedMps(state, rawSpeedMps) {
  if (!state) return 0;
  const s = Number.isFinite(rawSpeedMps) && rawSpeedMps >= 0 ? rawSpeedMps : 0;
  state.samples.push(s);
  if (state.samples.length > MEDIAN_WINDOW) state.samples.shift();

  const med = median(state.samples);
  state.ema = state.ema + EMA_ALPHA * (med - state.ema);

  if (state.zeroLatched) {
    if (state.ema >= ZERO_EXIT_MPS) state.zeroLatched = false;
  } else if (state.ema <= ZERO_ENTER_MPS) {
    state.zeroLatched = true;
  }

  return state.zeroLatched ? 0 : state.ema;
}
