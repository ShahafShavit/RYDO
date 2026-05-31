const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

const RESERVED = new Set([
  'admin', 'api', 'users', 'user', 'routes', 'route', 'clubs', 'club', 'ride', 'rides',
  'settings', 'login', 'register', 'me', 'inbox', 'dashboard', 'leaderboards', 'search',
  'media', 'auth', 'account', 'find-people', 'not-found', 'live', 'timelapse', 'hazards',
  'challenges', 'handle-available',
]);

/** @param {string | null | undefined} raw */
export function normalizeHandleInput(raw) {
  if (raw == null) return '';
  let s = String(raw).trim();
  if (s.startsWith('@')) s = s.slice(1).trim();
  return s.toLowerCase();
}

/** @param {string | null | undefined} raw @returns {string | null} error message */
export function validateHandle(raw) {
  const normalized = normalizeHandleInput(raw);
  if (!normalized) return 'Handle is required.';
  if (normalized.length < MIN_LENGTH) return `Handle must be at least ${MIN_LENGTH} characters.`;
  if (normalized.length > MAX_LENGTH) return `Handle must be at most ${MAX_LENGTH} characters.`;
  if (!/^[a-z]/.test(normalized)) return 'Handle must start with a letter.';
  if (!/^[a-z0-9_]+$/.test(normalized)) return 'Handle may only contain letters, numbers, and underscores.';
  if (RESERVED.has(normalized)) return 'That handle is reserved.';
  return null;
}
