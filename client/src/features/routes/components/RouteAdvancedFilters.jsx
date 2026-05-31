import { MapPin, X } from 'lucide-react';
import Input from '@/shared/components/ui/input/Input';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';
import Button from '@/shared/components/ui/button/Button';
import { cn } from '@/shared/lib/cn';

const FILTER_OPTIONS = [
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

export default function RouteAdvancedFilters({
  filters = {},
  onFilterChange,
  nearActive = false,
  geoLoading = false,
  geoError = null,
  onUseNearMe,
  onClearNearMe,
  className,
  badgeNavClassName,
}) {
  const activeValues = [];
  if (filters.sort === 'newest') activeValues.push('sort:newest');
  if (filters.sort === 'favorites') activeValues.push('sort:favorites');
  if (filters.terrain && filters.terrain !== 'all') activeValues.push(`terrain:${filters.terrain}`);
  if (filters.difficulty && filters.difficulty !== 'all') activeValues.push(`difficulty:${filters.difficulty}`);
  if (filters.distance && filters.distance !== 'all') activeValues.push(`distance:${filters.distance}`);

  const handleMultiChange = (nextActive = []) => {
    const next = { ...filters };
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
    onFilterChange?.(next);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {!nearActive ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-11 min-w-0 gap-1.5 whitespace-nowrap px-3 text-sm sm:gap-2 sm:px-5"
            disabled={geoLoading}
            aria-label={geoLoading ? 'Getting your location' : 'Use my location'}
            onClick={() => onUseNearMe?.()}
          >
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate sm:hidden">{geoLoading ? 'Locating…' : 'Near me'}</span>
            <span className="hidden sm:inline">{geoLoading ? 'Getting location…' : 'Use my location'}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-11 min-w-0 gap-1.5 whitespace-nowrap px-3 text-sm sm:gap-2 sm:px-5"
            aria-label="Clear location filter"
            onClick={() => onClearNearMe?.()}
          >
            <X className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate sm:hidden">Clear</span>
            <span className="hidden sm:inline">Clear location</span>
          </Button>
        )}
      </div>

      {geoError ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {geoError}
        </p>
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
                value={
                  filters.nearMaxKm != null && Number.isFinite(filters.nearMaxKm)
                    ? String(filters.nearMaxKm)
                    : ''
                }
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

      <div className={cn('flex justify-center sm:justify-start', badgeNavClassName)}>
        <BadgeNav
          options={FILTER_OPTIONS}
          multi
          activeValues={activeValues}
          onChange={handleMultiChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
