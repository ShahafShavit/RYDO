/**
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatAdminDeltaPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

/**
 * @param {number | null | undefined} value
 */
export function adminDeltaTone(value) {
  if (value == null || Number.isNaN(value)) return 'text-fg-subtle';
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-rose-400';
  return 'text-fg-subtle';
}
