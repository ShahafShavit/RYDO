/**
 * Resolve a numeric tuning override, or fall back to the production constant.
 * @param {Record<string, number> | null | undefined} tuning
 * @param {string} key
 * @param {number} fallback — same value as the coded default in math modules
 */
export function pickTuning(tuning, key, fallback) {
  if (tuning == null || typeof tuning !== 'object') return fallback;
  const v = tuning[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
