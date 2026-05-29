const AUTH_KEY = 'rydo-user';
const TOKEN_KEY = 'rydo_token';

/** @type {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void } | null} */
let platformStorage = null;

/**
 * Inject key-value storage (Capacitor Preferences on native; localStorage on web).
 * @param {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }} storage
 */
export function setPlatformStorage(storage) {
  platformStorage = storage;
}

function storage() {
  if (platformStorage) return platformStorage;
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  };
}

export function getStoredUser() {
  const raw = storage().getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    storage().removeItem(AUTH_KEY);
    return null;
  }
}

export function setStoredUser(user) {
  storage().setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  storage().removeItem(AUTH_KEY);
  storage().removeItem(TOKEN_KEY);
}

export function getStoredToken() {
  return storage().getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) storage().setItem(TOKEN_KEY, token);
  else storage().removeItem(TOKEN_KEY);
}
