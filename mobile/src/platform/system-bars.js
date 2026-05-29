import { Capacitor } from '@capacitor/core';
import { SafeArea, SystemBarsStyle } from '@capacitor-community/safe-area';

/**
 * Light status/nav bar icons on RYDO's dark chrome.
 * SafeArea plugin config sets initial style; this reinforces after WebView load.
 */
export async function initSystemBars() {
  if (!Capacitor.isNativePlatform()) return;

  await SafeArea.setSystemBarsStyle({ style: SystemBarsStyle.Dark });
}
