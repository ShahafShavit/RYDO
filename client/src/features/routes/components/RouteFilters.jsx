import { Search } from 'lucide-react';
import Input from '@/shared/components/ui/input/Input';
import RouteAdvancedFilters from '@/features/routes/components/RouteAdvancedFilters';
import { EXPLORE_SEARCH_PLACEHOLDERS } from '@/features/routes/explore/explore-scope';

/**
 * Legacy wrapper: search bar + route advanced filters for desktop explore.
 * Explore page composes these directly; kept for any external reuse.
 */
export default function RouteFilters({
  filters = {},
  onFilterChange,
  nearActive = false,
  geoLoading = false,
  geoError = null,
  onUseNearMe,
  onClearNearMe,
  scope = 'routes',
  showAdvancedFilters = true,
}) {
  const handleSearchChange = (e) => {
    onFilterChange?.({ ...filters, search: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
        </div>
        <Input
          type="search"
          placeholder={EXPLORE_SEARCH_PLACEHOLDERS[scope] ?? EXPLORE_SEARCH_PLACEHOLDERS.all}
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="relative z-0 pl-11"
        />
      </div>

      {showAdvancedFilters ? (
        <RouteAdvancedFilters
          filters={filters}
          onFilterChange={onFilterChange}
          nearActive={nearActive}
          geoLoading={geoLoading}
          geoError={geoError}
          onUseNearMe={onUseNearMe}
          onClearNearMe={onClearNearMe}
        />
      ) : null}
    </div>
  );
}
