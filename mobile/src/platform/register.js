import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { setPlatformStorage } from '@/features/auth/utils/auth-storage';
import { setQueryCacheStorage } from '@/app/query-cache-storage';
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
    setQueryCacheStorage({
      getItem: async (key) => {
        const { value } = await Preferences.get({ key });
        return value ?? null;
      },
      setItem: async (key, value) => {
        await Preferences.set({ key, value });
      },
      removeItem: async (key) => {
        await Preferences.remove({ key });
      },
    });
  }

  if (isNative) {
    await initSystemBars();
    appLifecycle.subscribeAppStateChange();
  }
}
