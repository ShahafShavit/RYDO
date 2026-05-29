/** @typedef {import('@/shared/platform/permissions-provider').PermissionsProvider} PermissionsProvider */

/** @type {PermissionsProvider | null} */
let provider = null;

/**
 * @param {PermissionsProvider} next
 */
export function setPermissionsProvider(next) {
  provider = next;
}

/**
 * @returns {PermissionsProvider}
 */
export function getPermissionsProvider() {
  return provider;
}
