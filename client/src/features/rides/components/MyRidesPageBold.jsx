import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Eyebrow from '@/shared/components/bold/Eyebrow';
import DisplayTitle from '@/shared/components/bold/DisplayTitle';
import GradientCTA from '@/shared/components/bold/GradientCTA';
import BoldScreen from '@/shared/components/bold/BoldScreen';
import RideListCardBold from '@/features/rides/components/RideListCardBold';
import { cn } from '@/shared/lib/cn';

const UPCOMING_PREVIEW_COUNT = 3;

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

export default function MyRidesPageBold({
  pageTitle,
  useMember,
  search,
  onSearchChange,
  onStartRide,
  upcoming = [],
  pastScheduled = [],
  historyRows = [],
  isLoading,
  isError,
  loadMoreRef,
  isFetchingNextPage,
}) {
  const [filter, setFilter] = useState('all');
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  const visibleUpcoming = useMemo(() => {
    if (upcomingExpanded || upcoming.length <= UPCOMING_PREVIEW_COUNT) return upcoming;
    return upcoming.slice(0, UPCOMING_PREVIEW_COUNT);
  }, [upcoming, upcomingExpanded]);

  const hiddenUpcoming = upcoming.length - UPCOMING_PREVIEW_COUNT;
  const pastItems = useMemo(
    () => [
      ...historyRows.map((entry) => ({ type: 'history', key: `h-${entry.id}`, entry })),
      ...pastScheduled.map((ride) => ({ type: 'past', key: `p-${ride.id}`, ride })),
    ],
    [historyRows, pastScheduled],
  );

  const showUpcoming = filter === 'all' || filter === 'upcoming';
  const showPast = filter === 'all' || filter === 'past';

  return (
    <BoldScreen>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="px-5 pt-2">
          <Eyebrow>{useMember ? 'Member rides' : 'Your rides'}</Eyebrow>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <DisplayTitle size="lg" className="min-w-0 flex-1 truncate">
              {pageTitle}
            </DisplayTitle>
            {!useMember && onStartRide ? (
              <GradientCTA
                type="button"
                heightClass="h-11"
                className="shrink-0 px-4 text-sm"
                onClick={onStartRide}
              >
                Start ride
              </GradientCTA>
            ) : null}
          </div>
        </header>

        <div className="space-y-3 px-5 pt-3">
          <div className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-black/25 px-4">
            <Search className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search rides…"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
              aria-label="Search rides"
            />
          </div>

          <div className="flex gap-2">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={cn('rydo-chip flex-1 justify-center', filter === chip.key && 'rydo-chip-on')}
                onClick={() => setFilter(chip.key)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {isError ? (
          <p className="mx-5 mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Some data could not be loaded.
          </p>
        ) : null}

        {isLoading ? (
          <div className="mx-5 mt-4 h-24 animate-pulse rounded-[28px] bg-surface-strong" />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-3.5">
            {showUpcoming ? (
              <section>
                <Eyebrow className="mb-2.5 ml-0.5">
                  Upcoming · {upcoming.length}
                </Eyebrow>
                {upcoming.length === 0 ? (
                  <p className="rydo-subtle px-1 text-sm">No upcoming rides.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {visibleUpcoming.map((ride) => (
                      <RideListCardBold key={ride.id} variant="upcoming" ride={ride} />
                    ))}
                    {!upcomingExpanded && hiddenUpcoming > 0 ? (
                      <button
                        type="button"
                        className="rydo-subtle py-2 text-center text-sm font-semibold text-rydo-purple"
                        onClick={() => setUpcomingExpanded(true)}
                      >
                        Show {hiddenUpcoming} more…
                      </button>
                    ) : null}
                    {upcomingExpanded && upcoming.length > UPCOMING_PREVIEW_COUNT ? (
                      <button
                        type="button"
                        className="rydo-subtle py-2 text-center text-sm font-semibold text-rydo-purple"
                        onClick={() => setUpcomingExpanded(false)}
                      >
                        Show less
                      </button>
                    ) : null}
                  </div>
                )}
              </section>
            ) : null}

            {showPast ? (
              <section>
                <Eyebrow className="mb-2.5 ml-0.5">
                  {useMember ? 'Past rides' : 'Past & logged'} · {pastItems.length}
                </Eyebrow>
                {pastItems.length === 0 ? (
                  <p className="rydo-subtle px-1 text-sm">Nothing in the past yet.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {pastItems.map((item) =>
                      item.type === 'history' ? (
                        <RideListCardBold
                          key={item.key}
                          variant="history"
                          entry={item.entry}
                        />
                      ) : (
                        <RideListCardBold key={item.key} variant="past" ride={item.ride} />
                      ),
                    )}
                  </div>
                )}
                <div ref={loadMoreRef} className="flex min-h-10 justify-center py-2" aria-hidden />
                {isFetchingNextPage ? (
                  <p className="text-center text-sm text-fg-subtle">Loading more…</p>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </BoldScreen>
  );
}
