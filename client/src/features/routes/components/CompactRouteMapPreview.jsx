import { Suspense, lazy, useMemo } from 'react';
import { buildRoutePreviewFeatureCollection } from '@/features/routes/utils/routePreviewGeoJson';

const RouteMapPreview = lazy(() => import('./RouteMapPreview'));

const fallback = <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;

/**
 * Small Leaflet preview for cards. `preview` matches API preview / routePreview shape ({ coordinates }).
 */
export default function CompactRouteMapPreview({
  preview,
  className = 'h-28 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5',
}) {
  const geoJson = useMemo(() => buildRoutePreviewFeatureCollection(preview ?? null), [preview]);
  if (!geoJson?.features?.length) {
    return <div className={className} aria-hidden />;
  }
  return (
    <Suspense fallback={fallback}>
      <RouteMapPreview geoJson={geoJson} className={className} />
    </Suspense>
  );
}
