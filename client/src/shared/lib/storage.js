export function getStorageItem(key) {
  return localStorage.getItem(key);
}

export function setStorageItem(key, value) {
  localStorage.setItem(key, value);
}

export function removeStorageItem(key) {
  localStorage.removeItem(key);
}
