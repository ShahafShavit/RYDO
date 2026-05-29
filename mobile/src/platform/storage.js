import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/** Keys persisted for auth — preload on native boot. */
const PERSISTED_KEYS = ['rydo_token', 'rydo-user'];

/** @type {Map<string, string>} */
const memory = new Map();

/**
 * Load persisted keys into memory before first render (native only).
 * @returns {Promise<void>}
 */
export async function initNativeStorage() {
  if (!Capacitor.isNativePlatform()) return;

  await Promise.all(
    PERSISTED_KEYS.map(async (key) => {
      const { value } = await Preferences.get({ key });
      if (value != null) memory.set(key, value);
    }),
  );
}

/** @type {import('./types.js').KeyValueStorage} */
export const webStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore quota / private mode */
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/** @type {import('./types.js').KeyValueStorage} */
export const nativeStorage = {
  getItem(key) {
    return memory.get(key) ?? null;
  },
  setItem(key, value) {
    memory.set(key, value);
    Preferences.set({ key, value }).catch(() => {});
  },
  removeItem(key) {
    memory.delete(key);
    Preferences.remove({ key }).catch(() => {});
  },
};

/**
 * @returns {import('./types.js').KeyValueStorage}
 */
export function createStorage() {
  return Capacitor.isNativePlatform() ? nativeStorage : webStorage;
}
