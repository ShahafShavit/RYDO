import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { APP_STATE_EVENT } from '@/shared/platform/app-lifecycle';

/**
 * @typedef {'active' | 'background'} AppState
 */

/**
 * Subscribe to foreground/background transitions.
 * Dispatches `rydo:app-state-change` on `window` for hooks that prefer DOM events.
 * @returns {() => void}
 */
function subscribeNativeAppStateChange() {
  const handle = App.addListener('appStateChange', ({ isActive }) => {
    const state = /** @type {AppState} */ (isActive ? 'active' : 'background');
    window.dispatchEvent(new CustomEvent(APP_STATE_EVENT, { detail: { state, isActive } }));
  });

  return () => {
    handle.then((h) => h.remove()).catch(() => {});
  };
}

/**
 * Browser fallback using Page Visibility API.
 * @returns {() => void}
 */
function subscribeWebAppStateChange() {
  const handler = () => {
    const isActive = document.visibilityState === 'visible';
    const state = /** @type {AppState} */ (isActive ? 'active' : 'background');
    window.dispatchEvent(new CustomEvent(APP_STATE_EVENT, { detail: { state, isActive } }));
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

/** @type {import('./types.js').AppLifecycleProvider} */
export const appLifecycle = {
  subscribeAppStateChange() {
    if (Capacitor.isNativePlatform()) return subscribeNativeAppStateChange();
    return subscribeWebAppStateChange();
  },
};

export { APP_STATE_EVENT } from '@/shared/platform/app-lifecycle';
