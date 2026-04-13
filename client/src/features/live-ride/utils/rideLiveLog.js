/**
 * Verbose ride-live tracing (SignalR + map peers). Enable any of:
 * - Vite dev server (`npm run dev`)
 * - Build with `VITE_LOG_RIDE_LIVE=true` (e.g. Docker build-arg)
 * - `localStorage.setItem('rydo_debug_ride_live', '1')` then reload
 * - Append `?debugRideLive=1` to the live map URL once (sets the localStorage key)
 */

export function enableRideLiveDebugFromQuery() {
  if (typeof window === 'undefined') return false;
  try {
    const v = new URLSearchParams(window.location.search).get('debugRideLive');
    if (v === '1' || v === 'true') {
      window.localStorage.setItem('rydo_debug_ride_live', '1');
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function isRideLiveLogEnabled() {
  if (import.meta.env.DEV) return true;
  if (import.meta.env.VITE_LOG_RIDE_LIVE === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem('rydo_debug_ride_live') === '1';
  } catch {
    return false;
  }
}

export function rideLiveLog(...args) {
  if (!isRideLiveLogEnabled()) return;
  console.info('[rydo:ride-live]', ...args);
}

export function rideLiveWarn(...args) {
  if (!isRideLiveLogEnabled()) return;
  console.warn('[rydo:ride-live]', ...args);
}

export function rideLiveError(...args) {
  if (!isRideLiveLogEnabled()) return;
  console.error('[rydo:ride-live]', ...args);
}
