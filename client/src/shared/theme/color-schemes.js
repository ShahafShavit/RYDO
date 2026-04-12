/** @type {readonly string[]} */
export const COLOR_SCHEME_IDS = [
  'midnight',
  'evergreen',
  'abyss',
  'daylight',
  'sage',
  'dune',
];

export const COLOR_SCHEME_STORAGE_KEY = 'rydo-color-scheme';

export const DEFAULT_COLOR_SCHEME = 'midnight';

/** @param {string | null | undefined} value */
export function normalizeColorSchemeId(value) {
  if (value != null && COLOR_SCHEME_IDS.includes(value)) {
    return value;
  }
  return DEFAULT_COLOR_SCHEME;
}

/** @param {string} schemeId */
export function applyColorSchemeToDocument(schemeId) {
  const id = normalizeColorSchemeId(schemeId);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = id;
  }
  return id;
}
