const QUERY_CACHE_KEY = 'rydo-query-cache';

/** @type {{ getItem: (key: string) => Promise<string | null>, setItem: (key: string, value: string) => Promise<void>, removeItem: (key: string) => Promise<void> } | null} */
let asyncStorage = null;

/**
 * Inject async key-value storage for query cache persistence (Capacitor Preferences on native).
 * @param {{ getItem: (key: string) => Promise<string | null>, setItem: (key: string, value: string) => Promise<void>, removeItem: (key: string) => Promise<void> }} storage
 */
export function setQueryCacheStorage(storage) {
  asyncStorage = storage;
}

function storage() {
  if (asyncStorage) return asyncStorage;
  return {
    getItem: async (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* quota / private mode */
      }
    },
    removeItem: async (key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export function getQueryCacheStorageKey() {
  return QUERY_CACHE_KEY;
}

export function createQueryCacheAsyncStorage() {
  const s = storage();
  return {
    getItem: (key) => s.getItem(key),
    setItem: (key, value) => s.setItem(key, value),
    removeItem: (key) => s.removeItem(key),
  };
}
