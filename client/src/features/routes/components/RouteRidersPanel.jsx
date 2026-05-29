import { useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { Bike } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import RouteRidersRosterModal, { RouteRiderRow } from '@/features/routes/components/RouteRidersRosterModal';
import { routesApi, routeKeys } from '@/features/routes/api/routesApi';
import { normalizeRouteRiders } from '@/features/routes/route-mapper';

const PREVIEW_LIMIT = 5;

/** Fisher–Yates shuffle then take up to `n` items (new array each call). */
function shufflePick(arr, n) {
  if (!arr?.length) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/**
 * @param {object} props
 * @param {{ totalCount?: number, visibleRiders?: object[] } | null | undefined} props.routeRiders
 * @param {number | string | undefined} props.routeId — required when list API returns counts only (no visible names).
 * @param {boolean} [props.prefetchRoster] — if true, fetch full roster on mount when counts-only (e.g. eager explore). Default: fetch on first hover only.
 * @param {'card' | 'inline' | 'mapBadge'} [props.variant] — `mapBadge`: bike icon + count for map overlay (popover/modal unchanged).
 */
export default function RouteRidersPanel({
  routeRiders,
  routeId,
  prefetchRoster = false,
  variant = 'card',
}) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const leaveTimerRef = useRef(null);
  const anchorRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const [interactionPrimed, setInteractionPrimed] = useState(false);

  const updatePopoverPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 16;
    const maxW = Math.min(320, window.innerWidth - margin * 2);
    let left = r.left;
    if (left + maxW > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - maxW);
    }
    setPopoverStyle({
      top: r.bottom + 6,
      left,
      width: maxW,
    });
  }, []);

  useLayoutEffect(() => {
    if (!hoverOpen) return undefined;
    updatePopoverPosition();
    window.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('resize', updatePopoverPosition);
    return () => {
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [hoverOpen, updatePopoverPosition]);

  const base = useMemo(() => normalizeRouteRiders(routeRiders), [routeRiders]);

  const rid = routeId != null && routeId !== '' ? Number(routeId) : NaN;
  const listOnlyCounts =
    Number.isFinite(rid) &&
    rid > 0 &&
    base.totalCount > 0 &&
    (!Array.isArray(base.visibleRiders) || base.visibleRiders.length === 0);

  const shouldFetchRoster = listOnlyCounts && (prefetchRoster || interactionPrimed);

  const { data: fetchedRoster, isFetching } = useQuery({
    queryKey: routeKeys.riderRoster(rid),
    queryFn: async () => normalizeRouteRiders(await routesApi.getRiderRoster(rid)),
    enabled: shouldFetchRoster,
    staleTime: Infinity,
  });

  const merged = useMemo(() => {
    if (!listOnlyCounts) return base;
    if (fetchedRoster) return fetchedRoster;
    return base;
  }, [base, listOnlyCounts, fetchedRoster]);

  const total = merged.totalCount ?? 0;
  const visible = useMemo(
    () => (Array.isArray(merged.visibleRiders) ? merged.visibleRiders : []),
    [merged.visibleRiders],
  );
  const hiddenCount = Math.max(0, total - visible.length);
  const hasMore = visible.length > PREVIEW_LIMIT;

  const visibleKey = useMemo(
    () => visible.map((r) => r.userId).join(','),
    [visible],
  );

  const hoverSample = useMemo(() => {
    if (!hoverOpen || visible.length === 0) return [];
    return shufflePick(visible, PREVIEW_LIMIT);
  }, [hoverOpen, visible]);

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleEnter = () => {
    clearLeaveTimer();
    if (listOnlyCounts) setInteractionPrimed(true);
    setHoverOpen(true);
  };

  const handleLeave = () => {
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => {
      setHoverOpen(false);
      leaveTimerRef.current = null;
    }, 120);
  };

  const openModal = () => {
    clearLeaveTimer();
    if (listOnlyCounts) setInteractionPrimed(true);
    setHoverOpen(false);
    setModalOpen(true);
  };

  if (total <= 0) return null;

  const label =
    total === 1 ? '1 person rode this route!' : `${total} people rode this route!`;

  const hiddenNote = (
    <p className="text-sm leading-snug text-fg-subtle">
      +{hiddenCount}{' '}
      {hiddenCount === 1 ? 'rider has' : 'riders have'} hidden their name in Settings → Preferences.
    </p>
  );

  if (variant === 'inline' || variant === 'mapBadge') {
    const isMapBadge = variant === 'mapBadge';
    const rosterLoading = listOnlyCounts && isFetching && visible.length === 0;

    return (
      <>
        <div ref={anchorRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
            className={
              isMapBadge
                ? 'inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/65 px-2 py-1 text-sm font-semibold tabular-nums text-white shadow-md backdrop-blur-sm transition hover:bg-black/80'
                : 'inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-left text-sm text-fg/90 transition hover:border-border-strong hover:bg-surface-strong'
            }
            aria-haspopup="dialog"
            aria-expanded={modalOpen}
            aria-label={isMapBadge ? label : undefined}
          >
            {isMapBadge ? (
              <>
                <Bike className="h-3.5 w-3.5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
                <span>{total}</span>
              </>
            ) : (
              <span className="truncate font-medium">{label}</span>
            )}
          </button>
          {hoverOpen && popoverStyle ? (
            <div
              className="fixed z-(--rydo-z-dropdown) max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-border bg-[var(--rydo-bg-deep)] p-3 shadow-xl"
              style={{ top: popoverStyle.top, left: popoverStyle.left, width: popoverStyle.width }}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              {rosterLoading ? (
                <p className="text-sm text-fg-muted">Loading riders…</p>
              ) : visible.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-fg-muted">
                    No names to show — riders who allow it appear here (Settings → Preferences).
                  </p>
                  {hiddenCount > 0 ? <div className="text-xs">{hiddenNote}</div> : null}
                  <button
                    type="button"
                    className="mt-1 w-full rounded-xl border border-rydo-purple/35 bg-rydo-purple/10 py-2 text-sm font-medium text-rydo-purple transition hover:bg-rydo-purple/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal();
                    }}
                  >
                    Details
                  </button>
                </div>
              ) : (
                <>
                  <ul className="space-y-0.5 pr-0.5" key={visibleKey}>
                    {hoverSample.map((r) => (
                      <RouteRiderRow
                        key={r.userId}
                        userId={r.userId}
                        fullName={r.fullName}
                        avatarUrl={r.avatarUrl}
                      />
                    ))}
                  </ul>
                  {hiddenCount > 0 ? <div className="mt-2 border-t border-border pt-2 text-xs">{hiddenNote}</div> : null}
                  {hasMore || hiddenCount > 0 ? (
                    <button
                      type="button"
                      className="mt-3 w-full rounded-xl border border-rydo-purple/35 bg-rydo-purple/10 py-2 text-sm font-medium text-rydo-purple transition hover:bg-rydo-purple/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal();
                      }}
                    >
                      View all
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        <RouteRidersRosterModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          riders={visible}
          hiddenCount={hiddenCount}
        />
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-black/20 p-4">
      <button
        type="button"
        onClick={() => openModal()}
        className="flex w-full items-center justify-between gap-3 text-left text-base font-medium text-fg/92"
        aria-haspopup="dialog"
      >
        <span>{label}</span>
        <span className="text-sm text-fg-subtle">Who?</span>
      </button>
      <RouteRidersRosterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        riders={visible}
        hiddenCount={hiddenCount}
      />
    </div>
  );
}
