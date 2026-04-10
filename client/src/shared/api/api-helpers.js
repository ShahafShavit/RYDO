export function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      if (value.length === 0) return;
      searchParams.set(key, JSON.stringify(value));
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function normalizePaginatedResult(payload, mapItem = (item) => item) {
  if (Array.isArray(payload)) {
    return {
      items: payload.map(mapItem),
      total: payload.length,
      skip: 0,
      take: payload.length,
    };
  }

  const items = Array.isArray(payload?.items) ? payload.items.map(mapItem) : [];

  return {
    items,
    total: typeof payload?.total === 'number' ? payload.total : items.length,
    skip: typeof payload?.skip === 'number' ? payload.skip : 0,
    take: typeof payload?.take === 'number' ? payload.take : items.length,
  };
}

export function coerceId(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}
