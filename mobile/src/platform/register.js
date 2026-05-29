import { Capacitor } from '@capacitor/core';
import { setPlatformStorage } from '@/features/auth/utils/auth-storage';
import { setGeolocationProvider } from '@/shared/platform/geolocation-provider';
import { setPermissionsProvider } from '@/shared/platform/permissions-provider';
import { createStorage, initNativeStorage } from './storage';
import { createGeolocation } from './geolocation';
import { createPermissionsProvider } from './permissions';
import { appLifecycle } from './app-lifecycle';
import { initSystemBars } from './system-bars';

/**
 * Initialize native storage and inject platform adapters into shared client code.
 * Must complete before React render on native so auth hydration is synchronous.
 * @returns {Promise<void>}
 */
export async function registerPlatform() {
  await initNativeStorage();

  const isNative = Capacitor.isNativePlatform();
  const storage = createStorage();
  const geolocation = createGeolocation(isNative);
  const permissions = createPermissionsProvider(geolocation);

  setPlatformStorage(storage);
  setGeolocationProvider(geolocation);
  setPermissionsProvider(permissions);

  if (isNative) {
    await initSystemBars();
    appLifecycle.subscribeAppStateChange();
  }
}
