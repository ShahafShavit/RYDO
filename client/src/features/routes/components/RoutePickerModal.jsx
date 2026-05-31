import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ROUTES } from '@/app/router/route-paths';
import RoutePickerRow from '@/features/routes/components/RoutePickerRow';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';
import { useSavedRoutes } from '@/features/routes/hooks/useSavedRoutes';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalControlClass } from '@/shared/components/ui/modal/ModalPrimitives';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/cn';

const MIN_SEARCH_LEN = 2;

/**
 * @param {{ open: boolean, onClose: () => void, onSelect: (route: object) => void, selectedRouteId?: number | null }} props
 */
export default function RoutePickerModal({ open, onClose, onSelect, selectedRouteId = null }) {
  const titleId = useId();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const searchActive = debouncedSearch.length >= MIN_SEARCH_LEN;

  const { savedRoutes, isLoading: savedLoading } = useSavedRoutes({ skip: 0, take: 50 });
  const { routes: searchRoutes, isLoading: searchLoading } = useRoutesList({
    take: 30,
    search: debouncedSearch,
    enabled: open && searchActive,
  });

  const handlePick = (route) => {
    onSelect(route);
    onClose();
    setSearch('');
  };

  const handleClose = () => {
    onClose();
    setSearch('');
  };

  return (
    <AnimatedModal
      open={open}
      onClose={handleClose}
      zIndexClass="z-(--rydo-z-modal-nested)"
      maxWidthClassName="max-w-lg"
    >
      <ModalPanel
        className="flex max-h-[min(90vh,640px)] w-full flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <ModalHeader title="Choose a route" titleId={titleId} onClose={handleClose} divider />

        <div className="flex min-h-0 flex-1 flex-col pt-4">
          <label className="sr-only" htmlFor="route-picker-search">
            Search routes by name
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              id="route-picker-search"
              type="search"
              autoComplete="off"
              placeholder="Search routes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(modalControlClass, 'pl-10')}
            />
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {searchActive ? (
              <SearchResults
                routes={searchRoutes}
                isLoading={searchLoading}
                query={debouncedSearch}
                selectedRouteId={selectedRouteId}
                onSelect={handlePick}
              />
            ) : (
              <SavedResults
                routes={savedRoutes}
                isLoading={savedLoading}
                selectedRouteId={selectedRouteId}
                onSelect={handlePick}
              />
            )}
          </div>

          {search.trim().length > 0 && search.trim().length < MIN_SEARCH_LEN ? (
            <p className="mt-3 text-sm text-fg-muted">Type at least {MIN_SEARCH_LEN} characters to search.</p>
          ) : null}
        </div>
      </ModalPanel>
    </AnimatedModal>
  );
}

function SavedResults({ routes, isLoading, selectedRouteId, onSelect }) {
  if (isLoading) {
    return <p className="py-6 text-center text-sm text-fg-muted">Loading saved routes…</p>;
  }
  if (routes.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-fg-muted">
        <p>You haven&apos;t saved any favorite routes yet.</p>
        <Link to={ROUTES.routes} className="mt-3 inline-block text-rydo-purple hover:underline">
          Explore routes
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.14em] text-fg-subtle">Saved routes</p>
      <ul className="space-y-2">
        {routes.map((route) => (
          <li key={route.id}>
            <RoutePickerRow
              route={route}
              selected={selectedRouteId != null && Number(route.id) === Number(selectedRouteId)}
              onSelect={() => onSelect(route)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchResults({ routes, isLoading, query, selectedRouteId, onSelect }) {
  if (isLoading) {
    return <p className="py-6 text-center text-sm text-fg-muted">Searching…</p>;
  }
  if (routes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-muted">
        No routes match &ldquo;{query}&rdquo;.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.14em] text-fg-subtle">Search results</p>
      <ul className="space-y-2">
        {routes.map((route) => (
          <li key={route.id}>
            <RoutePickerRow
              route={route}
              selected={selectedRouteId != null && Number(route.id) === Number(selectedRouteId)}
              onSelect={() => onSelect(route)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
