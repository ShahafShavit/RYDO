const LABELS = {
  road: 'Road bike',
  mountain: 'Mountain bike',
  gravel: 'Gravel bike',
  hybrid: 'Hybrid',
};

/**
 * @param {string | null | undefined} key
 */
export function formatBikeTypeLabel(key) {
  if (key == null || String(key).trim() === '') return '';
  const k = String(key).toLowerCase();
  if (LABELS[k]) return LABELS[k];
  return k.charAt(0).toUpperCase() + k.slice(1);
}
