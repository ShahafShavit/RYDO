import { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import Input from '@/shared/components/ui/input/Input';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';
import Button from '@/shared/components/ui/button/Button';
import { cn } from '@/shared/lib/cn';

export default function RouteFilters({
  filters = {},
  onFilterChange,
  nearActive = false,
  geoLoading = false,
  geoError = null,
  onUseNearMe,
  onClearNearMe,
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const handleSearchChange = (e) => {
    if (onFilterChange) onFilterChange({ ...filters, search: e.target.value });
  };

  // NOTE: multi selection handled by `handleMultiChange` below

  // Single combined options list — each value encodes its filter type so we can
  // support a single-row pill sweep that toggles different filter dimensions.
  const options = [
    { label: 'Newest', value: 'sort:newest' },
    { label: 'Most favorited', value: 'sort:favorites' },
    { label: 'Road', value: 'terrain:road' },
    { label: 'Gravel', value: 'terrain:gravel' },
    { label: 'Trail', value: 'terrain:trail' },
    { label: 'Mixed', value: 'terrain:mixed' },
    { label: 'Casual', value: 'difficulty:casual' },
    { label: 'Moderate', value: 'difficulty:moderate' },
    { label: 'Hard', value: 'difficulty:hard' },
    { label: '< 20km', value: 'distance:short' },
    { label: '20 - 50km', value: 'distance:medium' },
    { label: '> 50km', value: 'distance:long' },
  ];

  const activeValues = [];
  if (filters.sort === 'newest') activeValues.push('sort:newest');
  if (filters.sort === 'favorites') activeValues.push('sort:favorites');
  if (filters.terrain && filters.terrain !== 'all') activeValues.push(`terrain:${filters.terrain}`);
  if (filters.difficulty && filters.difficulty !== 'all') activeValues.push(`difficulty:${filters.difficulty}`);
  if (filters.distance && filters.distance !== 'all') activeValues.push(`distance:${filters.distance}`);

  const handleMultiChange = (nextActive = []) => {
    // Normalize selection: only the last selected value per type should apply.
    const next = { ...filters };
    // reset to defaults
    next.sort = undefined;
    next.terrain = 'all';
    next.difficulty = 'all';
    next.distance = 'all';

    nextActive.forEach((val) => {
      const [type, v] = val.split(':');
      if (type === 'sort') next.sort = v;
      if (type === 'terrain') next.terrain = v;
      if (type === 'difficulty') next.difficulty = v;
      if (type === 'distance') next.distance = v;
    });

    if (!next.sort) next.sort = 'newest';

    if (onFilterChange) onFilterChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
            <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          </div>
          <Input
            type="text"
            placeholder={
              nearActive
                ? 'Search routes by title (results sorted by distance)…'
                : 'Search routes or people (name or title)…'
            }
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="relative z-0 pl-11"
          />
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
          {!nearActive ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="h-11 min-w-0 gap-1.5 whitespace-nowrap px-3 text-sm sm:gap-2 sm:px-5 md:w-auto"
              disabled={geoLoading}
              aria-label={geoLoading ? 'Getting your location' : 'Use my location'}
              onClick={() => onUseNearMe?.()}
            >
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate sm:hidden">{geoLoading ? 'Locating…' : 'Near me'}</span>
              <span className="hidden sm:inline">
                {geoLoading ? 'Getting location…' : 'Use my location'}
              </span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="h-11 min-w-0 gap-1.5 whitespace-nowrap px-3 text-sm sm:gap-2 sm:px-5 md:w-auto"
              aria-label="Clear location filter"
              onClick={() => onClearNearMe?.()}
            >
              <X className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate sm:hidden">Clear</span>
              <span className="hidden sm:inline">Clear location</span>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-11 min-w-0 whitespace-nowrap px-3 text-sm sm:px-5 md:hidden"
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen((o) => !o)}
          >
            {mobileFiltersOpen ? (
              <>
                <span className="sm:hidden">Hide</span>
                <span className="hidden sm:inline">Hide filters</span>
              </>
            ) : (
              <>
                <span className="sm:hidden">Filters</span>
                <span className="hidden sm:inline">Show filters</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {geoError ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{geoError}</p>
      ) : null}

      {nearActive ? (
        <div className="space-y-2 rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-sm text-fg-muted">
            Routes with a known start point, nearest first. Set an optional radius or leave unlimited.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span className="shrink-0">Within</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="No limit"
                value={filters.nearMaxKm != null && Number.isFinite(filters.nearMaxKm) ? String(filters.nearMaxKm) : ''}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (raw === '') {
                    onFilterChange?.({ ...filters, nearMaxKm: null });
                    return;
                  }
                  const n = Number(raw);
                  if (!Number.isFinite(n) || n <= 0) {
                    onFilterChange?.({ ...filters, nearMaxKm: null });
                    return;
                  }
                  onFilterChange?.({ ...filters, nearMaxKm: n });
                }}
                className="max-w-[8rem] font-mono tabular-nums"
                aria-describedby="near-max-hint"
              />
              <span className="shrink-0 text-fg-muted">km</span>
            </label>
            <p id="near-max-hint" className="text-xs text-fg-subtle sm:max-w-md">
              Empty means no distance cap (all matching routes, sorted by proximity). Enter any positive number to only
              show routes within that radius.
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'flex justify-center sm:justify-start',
          mobileFiltersOpen ? 'flex' : 'hidden md:flex',
        )}
      >
        <BadgeNav
          options={options}
          multi
          activeValues={activeValues}
          onChange={handleMultiChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
