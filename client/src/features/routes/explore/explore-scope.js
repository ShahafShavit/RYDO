import { ROUTES } from '@/app/router/route-paths';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const EXPLORE_SCOPES = ['all', 'routes', 'clubs', 'people'];
export const EXPLORE_SCOPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'routes', label: 'Routes' },
  { key: 'clubs', label: 'Clubs' },
  { key: 'people', label: 'People' },
];

export const EXPLORE_SEARCH_PLACEHOLDERS = {
  all: 'Search routes, clubs, or people…',
  routes: 'Search routes…',
  clubs: 'Search clubs…',
  people: 'Search people by name or handle…',
};

/** @param {string | null | undefined} raw */
export function parseExploreScope(raw) {
  const value = (raw ?? '').trim().toLowerCase();
  return EXPLORE_SCOPES.includes(value) ? value : 'all';
}

/** @param {URLSearchParams | import('react-router-dom').URLSearchParams} searchParams */
export function parseScopeFromSearchParams(searchParams) {
  return parseExploreScope(searchParams.get('scope'));
}

/** @param {string} scope */
export function scopeShowsRouteFilters(scope) {
  return scope === 'all' || scope === 'routes';
}

/** @param {string} scope */
export function scopeShowsRoutesQuery(scope) {
  return scope === 'all' || scope === 'routes';
}

/** @param {string} scope @param {string} q trimmed search */
export function scopeShowsPeopleQuery(scope, q) {
  return (scope === 'all' || scope === 'people') && q.length >= 2;
}

export function defaultExploreFilters() {
  return {
    search: '',
    terrain: 'all',
    difficulty: 'all',
    distance: 'all',
    sort: 'newest',
    nearLat: null,
    nearLng: null,
    nearMaxKm: null,
    createdByHandle: null,
  };
}

/** Reset only route advanced dimensions; preserve search and createdByHandle. */
export function clearRouteAdvancedFilters(filters) {
  return {
    ...filters,
    terrain: 'all',
    difficulty: 'all',
    distance: 'all',
    sort: 'newest',
    nearLat: null,
    nearLng: null,
    nearMaxKm: null,
  };
}

/** @param {URLSearchParams | import('react-router-dom').URLSearchParams} searchParams */
export function parseCreatedByHandleFromSearchParams(searchParams) {
  const raw = searchParams.get('createdBy');
  if (raw == null || raw === '') return null;
  const handle = normalizeHandle(raw);
  return handle || null;
}

/**
 * @param {{ scope?: string, q?: string }} [options]
 */
export function buildExplorePath(options = {}) {
  const scope = parseExploreScope(options.scope ?? 'all');
  const q = (options.q ?? '').trim();
  const params = new URLSearchParams();
  if (scope !== 'all') params.set('scope', scope);
  if (q) params.set('q', q);
  const qs = params.toString();
  return qs ? `${ROUTES.routes}?${qs}` : ROUTES.routes;
}

/** Deep links into Explore scope tabs. */
export const EXPLORE_PATHS = {
  all: ROUTES.routes,
  routes: buildExplorePath({ scope: 'routes' }),
  clubs: buildExplorePath({ scope: 'clubs' }),
  people: buildExplorePath({ scope: 'people' }),
};
