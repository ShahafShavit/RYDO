export const APP_STATE_EVENT = 'rydo:app-state-change';

/**
 * Invoke `onForeground` when the app returns to the foreground (browser tab visible or native resume).
 * @param {() => void} onForeground
 * @returns {() => void} unsubscribe
 */
export function subscribeAppForeground(onForeground) {
  const onVisibility = () => {
    if (document.visibilityState === 'visible') onForeground();
  };

  /** @param {CustomEvent<{ isActive?: boolean }>} event */
  const onAppState = (event) => {
    if (event.detail?.isActive) onForeground();
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener(APP_STATE_EVENT, onAppState);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener(APP_STATE_EVENT, onAppState);
  };
}
