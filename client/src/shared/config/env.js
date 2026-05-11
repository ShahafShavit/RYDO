const apiMode = import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'real';

/**
 * When testing from a phone via LAN (https://10.x.x.x:5173), `VITE_API_BASE_URL` that points at
 * localhost/127.0.0.1 still resolves on the phone to the phone itself — not the dev PC — so login
 * fails with "Failed to fetch". In dev, drop to same-origin `/api` (Vite proxy) instead.
 */
function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL || '';
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return raw;
  }
  const pageHost = window.location.hostname;
  if (pageHost === 'localhost' || pageHost === '127.0.0.1' || pageHost === '[::1]') {
    return raw;
  }
  if (!raw) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      console.warn(
        '[rydo] VITE_API_BASE_URL points at',
        h,
        'but the app was opened from',
        pageHost,
        '— on a phone, localhost is the phone, not your PC. Using same-origin /api (set VITE_API_BASE_URL empty in .env.local for LAN + Vite proxy).',
      );
      return '';
    }
  } catch {
    /* ignore malformed */
  }
  return raw;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  apiMode,
  isMockApi: apiMode === 'mock',
  devAuthEnabled: import.meta.env.DEV && apiMode === 'mock' && import.meta.env.VITE_DEV_AUTH_ENABLED === 'true',
  devRole: import.meta.env.VITE_DEV_ROLE || 'user',
};
