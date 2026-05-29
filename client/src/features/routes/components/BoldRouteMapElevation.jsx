import { lazy, Suspense } from 'react';
import Eyebrow from '@/shared/components/bold/Eyebrow';

const RouteMapWithElevation = lazy(() => import('@/features/routes/components/RouteMapWithElevation'));

const BOLD_MAP_CLASS =
  'h-52 w-full overflow-hidden rounded-2xl border border-border bg-surface';

/**
 * Mobile Bold: stacked route map + elevation chart with scrub sync.
 */
export default function BoldRouteMapElevation({
  geoJson,
  profile,
  eyebrow = 'The shape of the ride',
  headerExtra = null,
  className = '',
}) {
  if (!geoJson?.features?.length) return null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-end justify-between gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        {headerExtra}
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className={`${BOLD_MAP_CLASS} animate-pulse bg-surface-strong`} />
            <div className="h-28 animate-pulse rounded-2xl bg-surface-strong" />
          </div>
        }
      >
        <RouteMapWithElevation
          geoJson={geoJson}
          profile={profile}
          layout="stack"
          scrollWheelZoom={false}
          mapCompactAttribution
          mapClassName={BOLD_MAP_CLASS}
          chartVariant="embed"
          chartShowHeader={false}
          className="gap-2.5"
        />
      </Suspense>
    </div>
  );
}
