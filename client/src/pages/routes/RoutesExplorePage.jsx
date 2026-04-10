import { useState } from 'react';
import RouteCard from '@/features/routes/components/RouteCard';
import RouteFilters from '@/features/routes/components/RouteFilters';
import { useRoutesList } from '@/features/routes/hooks/useRoutesList';

export default function RoutesExplorePage() {
  const [filters, setFilters] = useState({
    search: '',
    terrain: 'all',
    difficulty: 'all',
    distance: 'all',
    sort: 'newest',
  });

  // Pass active filters into our updated hook
  const { routes, isLoading } = useRoutesList({
    skip: 0,
    take: 50,
    ...filters
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Repository</p>
        <h1 className="mt-2 text-3xl font-semibold">Explore routes</h1>
        <p className="mt-3 max-w-2xl text-white/64">The website version should feel broader, cleaner and more decision-friendly than the mobile screens.</p>
      </div>
      <RouteFilters filters={filters} onFilterChange={setFilters} />
      {isLoading ? (
        <p className="text-white/60">Loading routes…</p>
      ) : routes?.length === 0 ? (
        <div className="py-12 text-center rounded-[28px] border border-white/5 bg-white/5">
          <p className="text-white/60">No routes found matching your filters.</p>
          <button
            onClick={() => setFilters({ search: '', terrain: 'all', difficulty: 'all', distance: 'all', sort: 'newest' })}
            className="mt-4 text-sm text-[#7B5CFF] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {(routes || []).map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      )}
    </section>
  );
}
